import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();

    if (!message || !userId) {
      throw new Error("Message and userId are required");
    }

    // Get the authorization token from the request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Authorization header is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // System prompt for financial assistant
    const systemPrompt = `Você é um assistente financeiro amigável e empático. Seu objetivo é ajudar o usuário a:
1. Registrar transações financeiras (receitas e despesas)
2. Criar metas financeiras (economizar ou investir)
3. Fazer aportes em metas existentes
4. Fornecer insights sobre oportunidades de economia

REGRAS IMPORTANTES:
- Seja empático e não julgue o usuário
- Use linguagem simples e acessível
- Celebre pequenos sucessos

PARA TRANSAÇÕES:
- Extraia valor, tipo (income/expense), categoria e data
- Se tiver todas as informações, crie a transação

PARA CRIAR METAS NOVAS:
- Pergunte SEMPRE estas informações uma por vez se não tiver:
  1. Qual o valor da meta?
  2. É para "Poupar" (save) ou "Investir" (invest)?
  3. Até quando? (data alvo)
  4. Qual o nome/objetivo da meta?
- SOMENTE crie a meta quando tiver TODAS as 4 informações

PARA APORTES EM METAS EXISTENTES:
- Se o usuário mencionar "colocar", "adicionar", "aportar", "depositar" um valor EM uma meta
- Ou se falar "coloquei X na meta Y"
- Use action "update_goal" e extraia o valor e o nome da meta
- Sempre confirme qual meta ele quer atualizar

FORMATO DE RESPOSTA JSON (CRÍTICO):
Responda SEMPRE APENAS com um objeto JSON puro, sem markdown.

Para APORTAR EM META EXISTENTE:
{
  "response": "Legal! Você quer adicionar R$ 200 em qual meta?",
  "action": "update_goal",
  "data": {
    "amount": 200,
    "goalName": null
  }
}

OU se souber o nome da meta:
{
  "response": "Ótimo! Adicionei R$ 200 na sua meta de viagem! 💰",
  "action": "update_goal",
  "data": {
    "amount": 200,
    "goalName": "viagem"
  }
}

Para CRIAR METAS NOVAS:
{
  "response": "Perfeito! Criei sua meta de economizar R$ 5.000 até dezembro!",
  "action": "create_goal",
  "data": {
    "name": "Viagem",
    "type": "save",
    "targetAmount": 5000,
    "targetDate": "2025-12-31"
  }
}

Para TRANSAÇÕES:
{
  "response": "Registrei R$ 50 em almoço! 💚",
  "action": "transaction",
  "data": {
    "amount": 50,
    "type": "expense",
    "category": "Alimentação",
    "date": "hoje"
  }
}

EXEMPLOS IMPORTANTES:

Usuário: "Coloquei 200 reais na meta"
{
  "response": "Que legal! Em qual meta você colocou esses R$ 200?",
  "action": "update_goal",
  "data": {
    "amount": 200,
    "goalName": null
  }
}

Usuário: "Adicionei 500 na meta de viagem"
{
  "response": "Maravilha! Adicionei R$ 500 na sua meta de viagem! Você está cada vez mais perto! 🎯",
  "action": "update_goal",
  "data": {
    "amount": 500,
    "goalName": "viagem"
  }
}

Usuário: "Quero economizar 3000 reais"
{
  "response": "Legal! Para o que você quer economizar esses R$ 3.000?",
  "action": "chat",
  "data": null
}`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error("Failed to get AI response");
    }

    const aiData = await aiResponse.json();
    let aiContent = aiData.choices[0].message.content;

    console.log("AI Response (raw):", aiContent);

    // Clean up AI response - remove markdown code blocks if present
    aiContent = aiContent.trim();
    if (aiContent.startsWith("```json")) {
      aiContent = aiContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (aiContent.startsWith("```")) {
      aiContent = aiContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    console.log("AI Response (cleaned):", aiContent);

    // Parse AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiContent);
    } catch (e) {
      console.error("JSON parse error:", e);
      // If not JSON, treat as simple chat
      parsedResponse = {
        response: aiContent,
        action: "chat",
        data: null,
      };
    }

    let transactionCreated = false;
    let goalCreated = false;
    let goalUpdated = false;

    // Handle actions based on AI response
    if (parsedResponse.action === "transaction" && parsedResponse.data) {
      const { amount, type, category, date } = parsedResponse.data;
      
      console.log("Processing transaction:", { amount, type, category, date });
      
      // Validate type - must be exactly "income" or "expense"
      const validType = type === "income" ? "income" : type === "expense" ? "expense" : null;
      
      if (!validType) {
        console.error("Invalid transaction type:", type);
        return new Response(
          JSON.stringify({
            response: "Desculpe, tive um problema ao processar o tipo da transação. Pode tentar novamente?",
            transactionCreated: false,
            goalCreated: false,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Parse date
      let transactionDate = new Date();
      if (date && date !== "hoje") {
        // Handle other date formats if needed
        transactionDate = new Date(date);
      }

      const { error } = await supabaseClient.from("transactions").insert({
        user_id: userId,
        amount: amount,
        type: validType,
        category: category || "Outros",
        transaction_date: transactionDate.toISOString().split("T")[0],
      });

      if (error) {
        console.error("Error creating transaction:", error);
        return new Response(
          JSON.stringify({
            response: "Desculpe, não consegui salvar a transação. Pode tentar de novo?",
            transactionCreated: false,
            goalCreated: false,
            error: error.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        transactionCreated = true;
        console.log("Transaction created successfully");
      }
    } else if (parsedResponse.action === "create_goal" && parsedResponse.data) {
      const { name, type, targetAmount, targetDate } = parsedResponse.data;
      
      console.log("Processing goal:", { name, type, targetAmount, targetDate });
      
      // Validate required fields
      if (!name || !type || !targetAmount || !targetDate) {
        console.error("Missing required goal fields:", parsedResponse.data);
        return new Response(
          JSON.stringify({
            response: "Ops! Parece que faltam algumas informações para criar a meta. Pode tentar novamente?",
            transactionCreated: false,
            goalCreated: false,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Validate type
      const validType = type === "save" || type === "invest" ? type : "save";
      
      // Parse target date
      let parsedTargetDate = targetDate;
      if (!targetDate.includes("-")) {
        // If date is like "dezembro", convert to proper date
        const targetDateObj = new Date();
        targetDateObj.setMonth(targetDateObj.getMonth() + 3); // Default 3 months
        parsedTargetDate = targetDateObj.toISOString().split("T")[0];
      }

      const { error } = await supabaseClient.from("goals").insert({
        user_id: userId,
        name: name,
        type: validType,
        target_amount: parseFloat(targetAmount),
        target_date: parsedTargetDate,
      });

      if (error) {
        console.error("Error creating goal:", error);
        return new Response(
          JSON.stringify({
            response: "Desculpe, não consegui criar a meta. Pode tentar de novo?",
            transactionCreated: false,
            goalCreated: false,
            error: error.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        goalCreated = true;
        console.log("Goal created successfully");
      }
    } else if (parsedResponse.action === "update_goal" && parsedResponse.data) {
      const { amount, goalName } = parsedResponse.data;
      
      console.log("Processing goal update:", { amount, goalName });
      
      if (!amount) {
        console.error("Missing amount for goal update");
        return new Response(
          JSON.stringify({
            response: "Ops! Não consegui identificar o valor. Pode tentar novamente?",
            transactionCreated: false,
            goalCreated: false,
            goalUpdated: false,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // If no goal name specified, need to ask which goal
      if (!goalName) {
        return new Response(
          JSON.stringify({
            response: parsedResponse.response,
            transactionCreated: false,
            goalCreated: false,
            goalUpdated: false,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Find the goal by name (case insensitive, partial match)
      const { data: goals, error: fetchError } = await supabaseClient
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .ilike("name", `%${goalName}%`)
        .limit(1);
      
      if (fetchError || !goals || goals.length === 0) {
        console.error("Goal not found:", goalName);
        return new Response(
          JSON.stringify({
            response: `Hmm, não encontrei uma meta com o nome "${goalName}". Pode verificar o nome e tentar novamente?`,
            transactionCreated: false,
            goalCreated: false,
            goalUpdated: false,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const goal = goals[0];
      const newAmount = Number(goal.current_amount) + Number(amount);
      
      // Update goal with new amount
      const { error: updateError } = await supabaseClient
        .from("goals")
        .update({ current_amount: newAmount })
        .eq("id", goal.id);
      
      if (updateError) {
        console.error("Error updating goal:", updateError);
        return new Response(
          JSON.stringify({
            response: "Desculpe, não consegui atualizar a meta. Tente novamente.",
            transactionCreated: false,
            goalCreated: false,
            goalUpdated: false,
            error: updateError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        goalUpdated = true;
        const progress = ((newAmount / Number(goal.target_amount)) * 100).toFixed(0);
        parsedResponse.response = `${parsedResponse.response} Agora você já tem R$ ${newAmount.toFixed(2)} (${progress}% da meta)! 🎯`;
        console.log("Goal updated successfully");
      }
    }

    return new Response(
      JSON.stringify({
        response: parsedResponse.response,
        transactionCreated,
        goalCreated,
        goalUpdated,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in process-message:", error);
    return new Response(
      JSON.stringify({
        response:
          "Desculpe, tive um problema ao processar sua mensagem. Pode tentar de novo?",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
