import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChatMessage } from "@/components/ChatMessage";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

const ONBOARDING_STEPS = [
  {
    question: "Olá! 👋 Prazer em conhecer você! Qual é o seu nome?",
    type: "name",
  },
  {
    question: "Legal, {name}! Vamos começar simples. Você tem alguma meta financeira em mente? Por exemplo: economizar para uma viagem, juntar uma reserva de emergência, ou investir em algo específico?",
    type: "goal",
  },
  {
    question: "Perfeito! E quanto você gostaria de {goalType}? Pode ser um valor aproximado.",
    type: "amount",
  },
  {
    question: "Ótimo! Até quando você quer alcançar isso?",
    type: "date",
  },
  {
    question: "Maravilha! Agora me conta: você tem dificuldade com alguma coisa específica no uso de apps? Precisa de letras maiores, alto contraste, ou leitura de voz?",
    type: "accessibility",
  },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; content: string }>>([]);
  const [userData, setUserData] = useState({
    name: "",
    goalName: "",
    goalType: "economizar",
    goalAmount: "",
    goalDate: "",
    accessibility: "nenhuma",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        // Start with first question
        addMessage("assistant", ONBOARDING_STEPS[0].question);
      }
    });
  }, [navigate]);

  const addMessage = (role: "assistant" | "user", content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const processResponse = async (response: string) => {
    addMessage("user", response);
    setIsProcessing(true);

    const currentStep = ONBOARDING_STEPS[step];

    // Update user data based on step
    let updatedData = { ...userData };
    switch (currentStep.type) {
      case "name":
        updatedData.name = response;
        break;
      case "goal":
        updatedData.goalName = response;
        if (response.toLowerCase().includes("investir")) {
          updatedData.goalType = "investir";
        }
        break;
      case "amount":
        updatedData.goalAmount = response.replace(/\D/g, "");
        break;
      case "date":
        updatedData.goalDate = response;
        break;
      case "accessibility":
        updatedData.accessibility = response;
        break;
    }

    setUserData(updatedData);

    // Move to next step or finish
    if (step < ONBOARDING_STEPS.length - 1) {
      setTimeout(() => {
        const nextQuestion = ONBOARDING_STEPS[step + 1].question
          .replace("{name}", updatedData.name)
          .replace("{goalType}", updatedData.goalType);
        addMessage("assistant", nextQuestion);
        setStep(step + 1);
        setIsProcessing(false);
      }, 800);
    } else {
      // Finish onboarding
      await finishOnboarding(updatedData);
    }
  };

  const finishOnboarding = async (data: typeof userData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Update profile with name
      await supabase
        .from("profiles")
        .update({ full_name: data.name })
        .eq("id", user.id);

      // Create initial goal if provided
      if (data.goalAmount && data.goalDate) {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + 3); // Default 3 months if date parsing fails

        await supabase.from("goals").insert({
          user_id: user.id,
          name: data.goalName || "Minha primeira meta",
          type: data.goalType === "investir" ? "invest" : "save",
          target_amount: parseFloat(data.goalAmount),
          target_date: targetDate.toISOString().split("T")[0],
        });
      }

      addMessage(
        "assistant",
        "Pronto! Tudo configurado. Você está pronto para começar a organizar suas finanças. Vamos lá! 🚀"
      );

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Error finishing onboarding:", error);
      toast({
        title: "Erro",
        description: "Não consegui finalizar a configuração. Tente novamente.",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  const progress = ((step + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Configuração Inicial</h1>
          </div>
          <Progress value={progress} className="mt-3 h-2" />
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col max-w-2xl">
        <div className="flex-1 space-y-4 overflow-y-auto mb-4">
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              role={message.role}
              content={message.content}
            />
          ))}
        </div>

        {/* Quick Response Options */}
        {!isProcessing && step === ONBOARDING_STEPS.findIndex((s) => s.type === "accessibility") && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Button
              variant="outline"
              onClick={() => processResponse("Está tudo ótimo, não preciso de ajustes")}
            >
              Está ótimo
            </Button>
            <Button
              variant="outline"
              onClick={() => processResponse("Preciso de letras maiores")}
            >
              Letras maiores
            </Button>
            <Button
              variant="outline"
              onClick={() => processResponse("Prefiro alto contraste")}
            >
              Alto contraste
            </Button>
            <Button
              variant="outline"
              onClick={() => processResponse("Gostaria de leitura por voz")}
            >
              Leitura por voz
            </Button>
          </div>
        )}

        {/* Input Area - Simple text response */}
        {!isProcessing && (
          <Card className="p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem("response") as HTMLInputElement;
                if (input.value.trim()) {
                  processResponse(input.value);
                  input.value = "";
                }
              }}
            >
              <input
                type="text"
                name="response"
                placeholder="Digite sua resposta..."
                className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </form>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Onboarding;
