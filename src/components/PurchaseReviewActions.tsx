import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThumbsUp, X } from "lucide-react";

interface PurchaseReviewActionsProps {
  category: string;
  suggestedSavings: number;
  goalName: string | null;
  onAccept: () => void;
  onIgnore: () => void;
  disabled?: boolean;
}

export const PurchaseReviewActions = ({
  category,
  suggestedSavings,
  goalName,
  onAccept,
  onIgnore,
  disabled = false,
}: PurchaseReviewActionsProps) => {
  return (
    <Card className="p-4 bg-card/50 border-primary/20 shadow-soft mt-2">
      <p className="text-sm text-muted-foreground mb-3">
        Como você gostaria de proceder?
      </p>
      <div className="flex gap-2">
        <Button
          onClick={onAccept}
          disabled={disabled}
          variant="default"
          size="sm"
          className="flex-1 gap-2"
        >
          <ThumbsUp className="w-4 h-4" />
          Aceitar e Criar Sub-Meta
        </Button>
        <Button
          onClick={onIgnore}
          disabled={disabled}
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
        >
          <X className="w-4 h-4" />
          Ignorar Dica
        </Button>
      </div>
    </Card>
  );
};
