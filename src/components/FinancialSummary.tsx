import { Card } from "@/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon, Target, Wallet } from "lucide-react";

interface FinancialSummaryProps {
  income: number;
  expenses: number;
  goalsCount: number;
}

export const FinancialSummary = ({ income, expenses, goalsCount }: FinancialSummaryProps) => {
  const balance = income - expenses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Saldo */}
      <div className={`rounded-[18px] shadow-neu p-6 transition-smooth hover:shadow-neu-inset ${balance >= 0 ? 'bg-success' : 'bg-destructive'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/90 mb-1 font-medium">Saldo</p>
            <p className="text-2xl font-bold text-white">
              R$ {balance.toFixed(2)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-[14px] shadow-neu flex items-center justify-center bg-white/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Receitas */}
      <div className="bg-primary rounded-[18px] shadow-neu p-6 transition-smooth hover:shadow-neu-inset">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/90 mb-1 font-medium">Receitas</p>
            <p className="text-2xl font-bold text-white">
              R$ {income.toFixed(2)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-[14px] shadow-neu bg-white/20 flex items-center justify-center">
            <ArrowUpIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Despesas */}
      <div className="bg-destructive rounded-[18px] shadow-neu p-6 transition-smooth hover:shadow-neu-inset">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/90 mb-1 font-medium">Despesas</p>
            <p className="text-2xl font-bold text-white">
              R$ {expenses.toFixed(2)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-[14px] shadow-neu bg-white/20 flex items-center justify-center">
            <ArrowDownIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Metas Ativas */}
      <div className="bg-accent rounded-[18px] shadow-neu p-6 transition-smooth hover:shadow-neu-inset">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-accent-foreground/80 mb-1 font-medium">Metas Ativas</p>
            <p className="text-2xl font-bold text-accent-foreground">{goalsCount}</p>
          </div>
          <div className="w-12 h-12 rounded-[14px] shadow-neu bg-accent-foreground/10 flex items-center justify-center">
            <Target className="w-6 h-6 text-accent-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
};
