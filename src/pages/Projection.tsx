import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Calendar, Wallet, Target, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ProjectionDay {
  date: string;
  balance: number;
  income: number;
  expenses: number;
}

interface ProjectionData {
  currentBalance: number;
  recurringIncome: number;
  recurringExpenses: number;
  goalSavings: number;
  projection: ProjectionDay[];
}

const Projection = () => {
  const [loading, setLoading] = useState(true);
  const [projectionData, setProjectionData] = useState<ProjectionData | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        loadProjection();
      }
    });
  }, [navigate]);

  const loadProjection = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("calculate-projection", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Error fetching projection:", error);
        throw error;
      }

      setProjectionData(data);
    } catch (error: any) {
      console.error("Error loading projection:", error);
      toast({
        title: "Erro",
        description: "Não consegui carregar a projeção. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const chartData = projectionData?.projection.map(day => ({
    date: formatDate(day.date),
    saldo: day.balance,
  })) || [];

  const minBalance = Math.min(...(projectionData?.projection.map(d => d.balance) || [0]));
  const maxBalance = Math.max(...(projectionData?.projection.map(d => d.balance) || [0]));

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="border-b border-border/30 bg-card shadow-neu sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-[14px] shadow-neu bg-gradient-primary flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Projeção Financeira</h1>
            <p className="text-xs text-muted-foreground">Próximos 30 dias</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card rounded-[18px] shadow-neu p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-success" />
              <p className="text-xs text-muted-foreground font-medium">Saldo Atual</p>
            </div>
            <p className="text-xl font-bold text-success">
              {formatCurrency(projectionData?.currentBalance || 0)}
            </p>
          </div>

          <div className="bg-card rounded-[18px] shadow-neu p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Receitas/mês</p>
            </div>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(projectionData?.recurringIncome || 0)}
            </p>
          </div>

          <div className="bg-card rounded-[18px] shadow-neu p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-destructive" />
              <p className="text-xs text-muted-foreground font-medium">Despesas/mês</p>
            </div>
            <p className="text-xl font-bold text-destructive">
              {formatCurrency(projectionData?.recurringExpenses || 0)}
            </p>
          </div>

          <div className="bg-card rounded-[18px] shadow-neu p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-accent" />
              <p className="text-xs text-muted-foreground font-medium">Metas/mês</p>
            </div>
            <p className="text-xl font-bold text-accent">
              {formatCurrency(projectionData?.goalSavings || 0)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card rounded-[18px] shadow-neu p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Projeção de Saldo
          </h2>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  domain={[Math.floor(minBalance / 100) * 100, Math.ceil(maxBalance / 100) * 100]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "var(--shadow-neu)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [formatCurrency(value), "Saldo"]}
                />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Info Card */}
        <div className="glass rounded-[18px] shadow-neu p-5">
          <h3 className="font-semibold text-foreground mb-2">💡 Como funciona?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Esta projeção analisa seus últimos 60 dias de transações para identificar padrões de 
            receitas e despesas recorrentes. Também considera o compromisso mensal com suas metas 
            ativas para projetar seu saldo nos próximos 30 dias.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            💬 <strong>Experimente:</strong> No chat, pergunte "Posso comprar X de R$ Y?" e 
            vou analisar o impacto dessa compra no seu saldo futuro!
          </p>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Projection;
