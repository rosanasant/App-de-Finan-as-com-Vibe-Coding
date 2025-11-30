import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Check if user has completed onboarding
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
          .single();

        if (!profileData?.full_name) {
          navigate("/onboarding");
        } else {
          toast({
            title: "Bem-vindo de volta!",
            description: "Login realizado com sucesso.",
          });
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Conta criada!",
          description: "Vamos configurar seu perfil.",
        });

        // Redirect to onboarding
        setTimeout(() => {
          navigate("/onboarding");
        }, 1000);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo com ícone neumorphic */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-[20px] bg-card shadow-neu flex items-center justify-center mb-4 transition-smooth hover:shadow-neu-inset">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Wallet className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-foreground">Vibe Finanças</h1>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Seu assistente financeiro pessoal
          </p>
        </div>

        {/* Card de login com estilo neumorphic */}
        <div className="bg-card rounded-[20px] shadow-neu p-8 transition-smooth">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="text-sm font-medium text-foreground mb-2 block">
                  Nome completo
                </label>
                <div className="relative">
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    placeholder="Seu nome"
                    disabled={loading}
                    className="bg-card shadow-neu-inset border-0 rounded-[16px] px-4 py-3 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary transition-smooth"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground mb-2 block">
                Email
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  disabled={loading}
                  className="bg-card shadow-neu-inset border-0 rounded-[16px] px-4 py-3 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary transition-smooth"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-foreground mb-2 block">
                Senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••"
                  disabled={loading}
                  className="bg-card shadow-neu-inset border-0 rounded-[16px] px-4 py-3 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary transition-smooth"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary rounded-[16px] shadow-neu py-3 text-primary-foreground font-semibold neu-button-hover border-0 mt-6"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isLogin ? "Entrar" : "Cadastrar"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-smooth"
            >
              {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
