import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Trash2,
  Filter
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import type { User } from "@supabase/supabase-js";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

const Transactions = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadTransactions(session.user.id);
      }
    });
  }, [navigate]);

  const loadTransactions = async (userId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;

      if (data) {
        setTransactions(data);
        setFilteredTransactions(data);
        
        // Calculate totals
        const income = data
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const expenses = data
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        setTotalIncome(income);
        setTotalExpenses(expenses);
      }
    } catch (error: any) {
      console.error("Error loading transactions:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as transações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (type: "all" | "income" | "expense") => {
    setFilterType(type);
    if (type === "all") {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter((t) => t.type === type));
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;

      toast({
        title: "Transação excluída",
        description: "A transação foi removida com sucesso.",
      });

      // Reload transactions
      await loadTransactions(user.id);
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a transação.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Extrato</h1>
              <p className="text-xs text-muted-foreground">
                Histórico de transações
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-card/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Receitas</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(totalIncome)}
              </p>
            </Card>

            <Card className="p-4 bg-card/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Despesas</span>
              </div>
              <p className="text-lg font-bold text-destructive">
                {formatCurrency(totalExpenses)}
              </p>
            </Card>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilter("all")}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Todas
          </Button>
          <Button
            variant={filterType === "income" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilter("income")}
            className="gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Receitas
          </Button>
          <Button
            variant={filterType === "expense" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilter("expense")}
            className="gap-2"
          >
            <TrendingDown className="w-4 h-4" />
            Despesas
          </Button>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {filterType === "all"
                ? "Nenhuma transação registrada ainda."
                : `Nenhuma ${filterType === "income" ? "receita" : "despesa"} registrada.`}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <Card
                key={transaction.id}
                className="p-4 transition-smooth hover:shadow-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {transaction.type === "income" ? (
                        <TrendingUp className="w-4 h-4 text-primary" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <Badge
                        variant={
                          transaction.type === "income" ? "default" : "destructive"
                        }
                        className="text-xs"
                      >
                        {transaction.category}
                      </Badge>
                    </div>

                    {transaction.description && (
                      <p className="text-sm mb-2">{transaction.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(transaction.transaction_date)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <p
                      className={`text-lg font-bold ${
                        transaction.type === "income"
                          ? "text-primary"
                          : "text-destructive"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Transactions;
