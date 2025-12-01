import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export const ChatMessage = ({ role, content, timestamp }: ChatMessageProps) => {
  const isAssistant = role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-[18px] transition-smooth animate-in fade-in slide-in-from-bottom-2",
        isAssistant
          ? "bg-agent-bg/80 backdrop-blur-sm border border-border/20 shadow-neu mr-8"
          : "bg-gradient-primary text-primary-foreground ml-8 shadow-neu"
      )}
    >
      {isAssistant && (
        <div className="flex-shrink-0 w-9 h-9 rounded-[12px] bg-gradient-primary shadow-neu flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
      )}
      
      <div className="flex-1 space-y-2">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        {timestamp && (
          <span className={cn(
            "text-xs",
            isAssistant ? "text-muted-foreground" : "text-primary-foreground/80"
          )}>
            {timestamp.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {!isAssistant && (
        <div className="flex-shrink-0 w-9 h-9 rounded-[12px] bg-card shadow-neu flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
      )}
    </div>
  );
};
