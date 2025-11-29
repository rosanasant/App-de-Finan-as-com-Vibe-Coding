import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Volume2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { User } from "@supabase/supabase-js";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

interface CategoryData {
  name: string;
  value: number;
}

const COLORS = ["#6b8e3f", "#8ba956", "#5a7831", "#9db86d", "#4d6829"];

const MonthlyReport = () => {
  const [user, setUser] = useState<User | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadReportData(session.user.id);
      }
    });
  }, [navigate]);

  const loadReportData = async (userId: string) => {
    try {
      // Get last 6 months of transactions
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .gte("transaction_date", sixMonthsAgo.toISOString().split("T")[0])
        .order("transaction_date", { ascending: true });

      if (error) throw error;

      // Process monthly data
      const monthlyMap: { [key: string]: MonthlyData } = {};
      const categoryMap: { [key: string]: number } = {};
      let income = 0;
      let expenses = 0;

      transactions?.forEach((t) => {
        const date = new Date(t.transaction_date);
        const monthKey = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { month: monthKey, income: 0, expenses: 0 };
        }

        if (t.type === "income") {
          monthlyMap[monthKey].income += Number(t.amount);
          income += Number(t.amount);
        } else {
          monthlyMap[monthKey].expenses += Number(t.amount);
          expenses += Number(t.amount);
          categoryMap[t.category] = (categoryMap[t.category] || 0) + Number(t.amount);
        }
      });

      setMonthlyData(Object.values(monthlyMap));
      setCategoryData(
        Object.entries(categoryMap).map(([name, value]) => ({ name, value }))
      );
      setTotalIncome(income);
      setTotalExpenses(expenses);
    } catch (error) {
      console.error("Error loading report data:", error);
      toast({
        title: "Erro",
        description: "Não consegui carregar o relatório.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const speakReport = () => {
    const balance = totalIncome - totalExpenses;
    const text = `Relatório mensal. Você teve ${totalIncome.toFixed(2)} reais de receitas e ${totalExpenses.toFixed(2)} reais de despesas. Seu saldo foi de ${balance.toFixed(2)} reais ${balance >= 0 ? "positivo" : "negativo"}.`;
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
      toast({
        title: "Lendo relatório",
        description: "Ouça o resumo das suas finanças.",
      });
    } else {
      toast({
        title: "Não disponível",
        description: "Seu navegador não suporta leitura por voz.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  const balance = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Resumo Mensal</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Últimos 6 meses
                </p>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={speakReport}>
              <Volume2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Balance Card */}
        <Card className="p-6 gradient-primary text-primary-foreground shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Saldo do Período</p>
              <h2 className="text-4xl font-bold">
                R$ {balance.toFixed(2)}
              </h2>
            </div>
            <Badge
              variant={balance >= 0 ? "default" : "destructive"}
              className="text-lg px-4 py-2"
            >
              {balance >= 0 ? (
                <>
                  <TrendingUp className="w-5 h-5 mr-1" />
                  Positivo
                </>
              ) : (
                <>
                  <TrendingDown className="w-5 h-5 mr-1" />
                  Negativo
                </>
              )}
            </Badge>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 gradient-card shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Receitas Totais</p>
            </div>
            <p className="text-3xl font-bold text-primary">
              R$ {totalIncome.toFixed(2)}
            </p>
          </Card>

          <Card className="p-6 gradient-card shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">Despesas Totais</p>
            </div>
            <p className="text-3xl font-bold text-destructive">
              R$ {totalExpenses.toFixed(2)}
            </p>
          </Card>
        </div>

        {/* Monthly Chart */}
        {monthlyData.length > 0 && (
          <Card className="p-6 gradient-card shadow-card">
            <h3 className="text-lg font-semibold mb-6">Evolução Mensal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="income" fill="hsl(var(--primary))" name="Receitas" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Despesas" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Category Chart */}
        {categoryData.length > 0 && (
          <Card className="p-6 gradient-card shadow-card">
            <h3 className="text-lg font-semibold mb-6">Despesas por Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {monthlyData.length === 0 && (
          <Card className="p-12 text-center gradient-card shadow-card">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Sem dados ainda</h3>
            <p className="text-muted-foreground">
              Comece a registrar suas transações para ver o relatório mensal!
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default MonthlyReport;
