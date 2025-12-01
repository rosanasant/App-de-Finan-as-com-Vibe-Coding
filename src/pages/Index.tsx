import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/components/ChatMessage";
import { FinancialSummary } from "@/components/FinancialSummary";
import { PurchaseReviewActions } from "@/components/PurchaseReviewActions";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Send, Loader2, Receipt } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  purchaseReview?: {
    category: string;
    suggestedSavings: number;
    goalName: string | null;
  } | null;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [goalsCount, setGoalsCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadFinancialData(session.user.id);
        // Welcome message
        setMessages([
          {
            role: "assistant",
            content:
              "Olá! Sou seu assistente financeiro. Pode me contar sobre suas despesas e receitas, e vou ajudar você a organizar tudo. Por exemplo: 'Gastei 50 reais no almoço hoje' ou 'Recebi 1200 do meu freela'.",
            timestamp: new Date(),
          },
        ]);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadFinancialData = async (userId: string) => {
    try {
      // Load transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", userId);

      if (transactions) {
        const totalIncome = transactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const totalExpenses = transactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        setIncome(totalIncome);
        setExpenses(totalExpenses);
      }

      // Load goals
      const { data: goals } = await supabase
        .from("goals")
        .select("id")
        .eq("user_id", userId);

      if (goals) {
        setGoalsCount(goals.length);
      }
    } catch (error) {
      console.error("Error loading financial data:", error);
    }
  };


  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user) return;

    const userMessage: Message = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      const historyMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("process-message", {
        body: { messages: historyMessages, userId: user.id },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        purchaseReview: data.purchaseReview || null,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Reload financial data if transaction, goal or goal update was processed
      if (data.transactionCreated || data.goalCreated || data.goalUpdated) {
        await loadFinancialData(user.id);
      }
    } catch (error: any) {
      console.error("Error processing message:", error);
      toast({
        title: "Erro",
        description: "Não consegui processar sua mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAcceptSavingsTip = async (
    category: string,
    suggestedSavings: number,
    goalName: string | null
  ) => {
    if (!user) return;

    try {
      setLoading(true);

      // Create a message to the AI requesting the creation of a savings goal
      const requestMessage = `Quero criar uma meta de economia de R$ ${suggestedSavings.toFixed(
        2
      )} para a próxima semana relacionada a ${category}`;

      const userMessage: Message = {
        role: "user",
        content: requestMessage,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      const historyMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("process-message", {
        body: { messages: historyMessages, userId: user.id },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.goalCreated) {
        await loadFinancialData(user.id);
        toast({
          title: "Sub-meta criada!",
          description: "Sua meta de economia foi criada com sucesso.",
        });
      }
    } catch (error: any) {
      console.error("Error creating savings goal:", error);
      toast({
        title: "Erro",
        description: "Não consegui criar a meta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIgnoreTip = async (category: string) => {
    if (!user) return;

    try {
      // Add to ignored tips for 7 days
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

      const { error } = await supabase.from("ignored_tips").insert({
        user_id: user.id,
        category: category,
        ignored_until: sevenDaysLater.toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Dica ignorada",
        description: `Não mostrarei mais dicas para ${category} nos próximos 7 dias.`,
      });

      // Remove purchase review from the last message
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === prev.length - 1 ? { ...msg, purchaseReview: null } : msg
        )
      );
    } catch (error: any) {
      console.error("Error ignoring tip:", error);
      toast({
        title: "Erro",
        description: "Não consegui ignorar a dica. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="bg-primary shadow-neu sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[14px] shadow-neu bg-white flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Vibe Finanças</h1>
              <p className="text-xs text-primary-foreground/90">Seu assistente financeiro</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/transactions")}
            className="bg-white text-primary hover:bg-white/90 shadow-neu"
          >
            <Receipt className="w-4 h-4 mr-1" />
            EXTRATO
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col max-w-4xl">
        {/* Financial Summary */}
        <FinancialSummary
          income={income}
          expenses={expenses}
          goalsCount={goalsCount}
        />


        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {messages.map((message, index) => (
            <div key={index}>
              <ChatMessage
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
              {message.purchaseReview && (
                <PurchaseReviewActions
                  category={message.purchaseReview.category}
                  suggestedSavings={message.purchaseReview.suggestedSavings}
                  goalName={message.purchaseReview.goalName}
                  onAccept={() =>
                    handleAcceptSavingsTip(
                      message.purchaseReview!.category,
                      message.purchaseReview!.suggestedSavings,
                      message.purchaseReview!.goalName
                    )
                  }
                  onIgnore={() =>
                    handleIgnoreTip(message.purchaseReview!.category)
                  }
                  disabled={loading}
                />
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 bg-background pt-4 pb-2">
          <div className="flex gap-3">
            <div className="flex-1 bg-white rounded-[16px] shadow-neu-inset">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={loading}
                className="bg-transparent border-0 shadow-none px-4 py-3 placeholder:text-muted-foreground focus-visible:ring-0"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={loading || !inputMessage.trim()}
              className="w-12 h-12 rounded-[16px] bg-primary hover:bg-primary/90 shadow-neu flex items-center justify-center text-primary-foreground disabled:opacity-50 neu-button-hover"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Index;
