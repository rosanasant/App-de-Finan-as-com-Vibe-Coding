import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProjectionDay {
  date: string;
  balance: number;
  income: number;
  expenses: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Get user ID from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const userId = user.id;

    // Fetch transactions from last 60 days to identify patterns
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: transactions, error: transError } = await supabaseClient
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("transaction_date", sixtyDaysAgo.toISOString().split("T")[0])
      .order("transaction_date", { ascending: true });

    if (transError) {
      console.error("Error fetching transactions:", transError);
      throw new Error("Failed to fetch transactions");
    }

    // Fetch goals
    const { data: goals, error: goalsError } = await supabaseClient
      .from("goals")
      .select("*")
      .eq("user_id", userId);

    if (goalsError) {
      console.error("Error fetching goals:", goalsError);
    }

    // Calculate current balance
    let currentBalance = 0;
    if (transactions) {
      currentBalance = transactions.reduce((acc, t) => {
        return acc + (t.type === "income" ? Number(t.amount) : -Number(t.amount));
      }, 0);
    }

    // Identify recurring patterns (simple heuristic: transactions with similar amounts)
    const recurringIncome: number[] = [];
    const recurringExpenses: number[] = [];

    if (transactions && transactions.length > 0) {
      // Group by category and calculate average
      const categoryGroups = transactions.reduce((acc, t) => {
        const key = `${t.type}-${t.category}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(Number(t.amount));
        return acc;
      }, {} as Record<string, number[]>);

      // Calculate monthly recurring amounts
      for (const key in categoryGroups) {
        const amounts = categoryGroups[key];
        const [type] = key.split("-");
        const avgAmount = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
        
        // If more than 2 transactions in category, consider it recurring
        if (amounts.length >= 2) {
          const monthlyAmount = avgAmount * (30 / 60); // Estimate monthly from 60 days
          if (type === "income") {
            recurringIncome.push(monthlyAmount);
          } else {
            recurringExpenses.push(monthlyAmount);
          }
        }
      }
    }

    const totalRecurringIncome = recurringIncome.reduce((a, b) => a + b, 0);
    const totalRecurringExpenses = recurringExpenses.reduce((a, b) => a + b, 0);

    // Calculate goal savings commitment (divide by 30 days)
    let dailyGoalSavings = 0;
    if (goals && goals.length > 0) {
      const activeGoals = goals.filter(g => {
        const targetDate = new Date(g.target_date);
        return targetDate > new Date();
      });

      activeGoals.forEach(goal => {
        const remaining = Number(goal.target_amount) - Number(goal.current_amount);
        const daysUntilTarget = Math.ceil(
          (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (remaining > 0 && daysUntilTarget > 0) {
          dailyGoalSavings += remaining / daysUntilTarget;
        }
      });
    }

    // Project 30 days
    const projection: ProjectionDay[] = [];
    const dailyIncome = totalRecurringIncome / 30;
    const dailyExpenses = totalRecurringExpenses / 30;
    
    let balance = currentBalance;

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      // Apply daily income and expenses
      balance += dailyIncome - dailyExpenses - dailyGoalSavings;

      projection.push({
        date: date.toISOString().split("T")[0],
        balance: Math.round(balance * 100) / 100,
        income: Math.round(dailyIncome * 100) / 100,
        expenses: Math.round((dailyExpenses + dailyGoalSavings) * 100) / 100,
      });
    }

    return new Response(
      JSON.stringify({
        currentBalance: Math.round(currentBalance * 100) / 100,
        recurringIncome: Math.round(totalRecurringIncome * 100) / 100,
        recurringExpenses: Math.round(totalRecurringExpenses * 100) / 100,
        goalSavings: Math.round(dailyGoalSavings * 30 * 100) / 100,
        projection,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in calculate-projection:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
