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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // System prompt for financial assistant
    const systemPrompt = `Você é um assistente financeiro amigável e empático. Seu objetivo é ajudar o usuário a:
1. Registrar transações financeiras (receitas e despesas)
2. Criar metas financeiras (economizar ou investir)
3. Fornecer insights sobre oportunidades de economia

REGRAS IMPORTANTES:
- Seja empático e não julgue o usuário
- Use linguagem simples e acessível
- Celebre pequenos sucessos
- Para transações: extraia valor, tipo (receita/despesa), categoria e data da mensagem
- Para metas: pergunte se é para "Poupar" ou "Investir", confirme valor alvo, data alvo e nome
- Forneça insights motivacionais sobre padrões de gastos

FORMATO DE RESPOSTA JSON:
Responda SEMPRE em JSON com a estrutura:
{
  "response": "sua resposta amigável ao usuário",
  "action": "transaction" | "goal" | "insight" | "chat",
  "data": {objeto com dados extraídos} ou null
}

EXEMPLOS:
Usuário: "Gastei 50 reais no almoço hoje"
{
  "response": "Entendi! Registrei R$ 50 no almoço. Está tudo anotado! 💚",
  "action": "transaction",
  "data": {
    "amount": 50,
    "type": "expense",
    "category": "Alimentação",
    "date": "hoje"
  }
}

Usuário: "Quero economizar 5000 reais"
{
  "response": "Que legal! Vamos criar uma meta de economia. Até quando você quer alcançar esses R$ 5.000?",
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
    const aiContent = aiData.choices[0].message.content;

    console.log("AI Response:", aiContent);

    // Parse AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiContent);
    } catch (e) {
      // If not JSON, treat as simple chat
      parsedResponse = {
        response: aiContent,
        action: "chat",
        data: null,
      };
    }

    let transactionCreated = false;
    let goalCreated = false;

    // Handle actions based on AI response
    if (parsedResponse.action === "transaction" && parsedResponse.data) {
      const { amount, type, category, date } = parsedResponse.data;
      
      // Parse date
      let transactionDate = new Date();
      if (date && date !== "hoje") {
        // Handle other date formats if needed
        transactionDate = new Date(date);
      }

      const { error } = await supabaseClient.from("transactions").insert({
        user_id: userId,
        amount: amount,
        type: type,
        category: category,
        transaction_date: transactionDate.toISOString().split("T")[0],
      });

      if (error) {
        console.error("Error creating transaction:", error);
      } else {
        transactionCreated = true;
      }
    } else if (parsedResponse.action === "goal" && parsedResponse.data) {
      const { name, type, targetAmount, targetDate } = parsedResponse.data;

      const { error } = await supabaseClient.from("goals").insert({
        user_id: userId,
        name: name,
        type: type,
        target_amount: targetAmount,
        target_date: targetDate,
      });

      if (error) {
        console.error("Error creating goal:", error);
      } else {
        goalCreated = true;
      }
    }

    return new Response(
      JSON.stringify({
        response: parsedResponse.response,
        transactionCreated,
        goalCreated,
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
