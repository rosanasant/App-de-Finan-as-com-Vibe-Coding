import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Target, TrendingUp, Wallet, Plus, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Goal {
  id: string;
  name: string;
  type: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
}

const Goals = () => {
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadGoals(session.user.id);
      }
    });
  }, [navigate]);

  const loadGoals = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error loading goals:", error);
      toast({
        title: "Erro",
        description: "Não consegui carregar suas metas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;

      setGoals(goals.filter((g) => g.id !== goalId));
      toast({
        title: "Meta removida",
        description: "Sua meta foi removida com sucesso.",
      });
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast({
        title: "Erro",
        description: "Não consegui remover a meta.",
        variant: "destructive",
      });
    }
  };

  const getProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getDaysLeft = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando metas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Minhas Metas</h1>
              <p className="text-sm text-muted-foreground">
                {goals.length} {goals.length === 1 ? "meta ativa" : "metas ativas"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {goals.length === 0 ? (
          <Card className="p-12 text-center gradient-card shadow-card">
            <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma meta ainda</h3>
            <p className="text-muted-foreground mb-6">
              Crie sua primeira meta financeira conversando no chat principal!
            </p>
            <Button onClick={() => navigate("/")}>
              <Plus className="w-4 h-4 mr-2" />
              Ir para o Chat
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = getProgress(goal.current_amount, goal.target_amount);
              const daysLeft = getDaysLeft(goal.target_date);
              const isInvest = goal.type === "invest";

              return (
                <Card key={goal.id} className="p-6 gradient-card shadow-card">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isInvest ? "bg-accent/10" : "bg-primary/10"
                      }`}>
                        {isInvest ? (
                          <TrendingUp className={`w-6 h-6 ${isInvest ? "text-accent" : "text-primary"}`} />
                        ) : (
                          <Wallet className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{goal.name}</h3>
                        <Badge variant={isInvest ? "secondary" : "default"}>
                          {isInvest ? "Investir" : "Economizar"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteGoal(goal.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Atual</p>
                        <p className="text-lg font-semibold text-primary">
                          R$ {goal.current_amount.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Meta</p>
                        <p className="text-lg font-semibold">
                          R$ {goal.target_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {daysLeft > 0 ? `Faltam ${daysLeft} dias` : "Prazo vencido"}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(goal.target_date).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Goals;
