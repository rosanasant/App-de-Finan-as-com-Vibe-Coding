import { Card } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon, Target } from "lucide-react";

interface FinancialSummaryProps {
  income: number;
  expenses: number;
  goalsCount: number;
}

export const FinancialSummary = ({ income, expenses, goalsCount }: FinancialSummaryProps) => {
  const balance = income - expenses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="p-6 gradient-card shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Receitas</p>
            <p className="text-2xl font-bold text-primary">
              R$ {income.toFixed(2)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ArrowUpIcon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="p-6 gradient-card shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Despesas</p>
            <p className="text-2xl font-bold text-destructive">
              R$ {expenses.toFixed(2)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <ArrowDownIcon className="w-6 h-6 text-destructive" />
          </div>
        </div>
      </Card>

      <Card className="p-6 gradient-card shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Metas Ativas</p>
            <p className="text-2xl font-bold">{goalsCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Target className="w-6 h-6 text-accent" />
          </div>
        </div>
      </Card>
    </div>
  );
};
