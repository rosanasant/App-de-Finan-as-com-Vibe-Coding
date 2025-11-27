import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  User,
  Lock,
  Download,
  Eye,
  Volume2,
  LogOut,
  AlertCircle,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Settings = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState({ full_name: "" });
  const [settings, setSettings] = useState({
    largeText: false,
    highContrast: false,
    voiceReading: false,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      if (error) throw error;
      if (data) setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const exportData = async () => {
    if (!user) return;

    try {
      // Get all user data
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id);

      const { data: goals } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id);

      // Create PDF
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246);
      doc.text("Meu Dinheiro - Relatório Financeiro", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Exportado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
      
      // Profile info
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Perfil", 14, 40);
      doc.setFontSize(10);
      doc.text(`Nome: ${profile.full_name || "Não informado"}`, 14, 48);
      doc.text(`Email: ${user.email}`, 14, 54);
      
      // Financial summary
      const totalIncome = transactions?.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalExpenses = transactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const balance = totalIncome - totalExpenses;
      
      doc.setFontSize(14);
      doc.text("Resumo Financeiro", 14, 66);
      doc.setFontSize(10);
      doc.text(`Receitas: R$ ${totalIncome.toFixed(2)}`, 14, 74);
      doc.text(`Despesas: R$ ${totalExpenses.toFixed(2)}`, 14, 80);
      doc.setTextColor(balance >= 0 ? 34 : 220, balance >= 0 ? 197 : 38, balance >= 0 ? 94 : 38);
      doc.text(`Saldo: R$ ${balance.toFixed(2)}`, 14, 86);
      doc.setTextColor(0, 0, 0);
      
      // Transactions table
      if (transactions && transactions.length > 0) {
        doc.setFontSize(14);
        doc.text("Transações", 14, 98);
        
        autoTable(doc, {
          startY: 102,
          head: [["Data", "Tipo", "Categoria", "Valor", "Descrição"]],
          body: transactions.map(t => [
            new Date(t.transaction_date).toLocaleDateString("pt-BR"),
            t.type === "income" ? "Receita" : "Despesa",
            t.category,
            `R$ ${Number(t.amount).toFixed(2)}`,
            t.description || "-"
          ]),
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
        });
      }
      
      // Goals table
      if (goals && goals.length > 0) {
        const finalY = (doc as any).lastAutoTable?.finalY || 102;
        doc.setFontSize(14);
        doc.text("Metas", 14, finalY + 14);
        
        autoTable(doc, {
          startY: finalY + 18,
          head: [["Nome", "Tipo", "Valor Atual", "Valor Meta", "Data Meta", "Progresso"]],
          body: goals.map(g => [
            g.name,
            g.type === "save" ? "Poupar" : "Investir",
            `R$ ${Number(g.current_amount).toFixed(2)}`,
            `R$ ${Number(g.target_amount).toFixed(2)}`,
            new Date(g.target_date).toLocaleDateString("pt-BR"),
            `${((Number(g.current_amount) / Number(g.target_amount)) * 100).toFixed(1)}%`
          ]),
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 },
        });
      }
      
      // Save PDF
      doc.save(`meu-dinheiro-relatorio-${new Date().toISOString().split("T")[0]}.pdf`);

      toast({
        title: "PDF gerado!",
        description: "Seu relatório foi baixado com sucesso.",
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "Erro",
        description: "Não consegui gerar o PDF.",
        variant: "destructive",
      });
    }
  };

  const deleteAccount = async () => {
    if (!user) return;

    try {
      // Delete all user data
      await supabase.from("transactions").delete().eq("user_id", user.id);
      await supabase.from("goals").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);

      toast({
        title: "Conta excluída",
        description: "Sua conta e dados foram removidos.",
      });

      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Erro",
        description: "Não consegui excluir sua conta.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b bg-card shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Configurações</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Profile Section */}
        <Card className="p-6 gradient-card shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Perfil</h2>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground">Nome</Label>
              <p className="text-base font-medium">{profile.full_name || "Não informado"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              <p className="text-base font-medium">{user?.email}</p>
            </div>
          </div>
        </Card>

        {/* Accessibility Section */}
        <Card className="p-6 gradient-card shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Acessibilidade</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Leitura por voz</Label>
                  <p className="text-sm text-muted-foreground">
                    Ouvir relatórios e mensagens
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.voiceReading}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, voiceReading: checked })
                }
              />
            </div>
          </div>
        </Card>

        {/* Privacy Section */}
        <Card className="p-6 gradient-card shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Privacidade e Dados</h2>
          </div>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={exportData}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar relatório em PDF
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Excluir minha conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todos os seus dados serão
                    permanentemente excluídos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteAccount}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Sim, excluir conta
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da conta
        </Button>
      </main>
    </div>
  );
};

export default Settings;
