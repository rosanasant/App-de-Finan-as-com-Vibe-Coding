import { NavLink } from "react-router-dom";
import { MessageSquare, Target, BarChart3, Receipt, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navItems = [
    { to: "/", icon: MessageSquare, label: "Chat" },
    { to: "/transactions", icon: Receipt, label: "Extrato" },
    { to: "/projection", icon: TrendingUp, label: "Projeção" },
    { to: "/goals", icon: Target, label: "Metas" },
    { to: "/settings", icon: Settings, label: "Config" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card shadow-neu border-t border-border/30 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-3 px-3 transition-smooth rounded-[12px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "w-10 h-10 rounded-[12px] flex items-center justify-center transition-smooth",
                    isActive ? "bg-primary/10 shadow-neu-inset" : ""
                  )}>
                    <item.icon className={cn("w-5 h-5", isActive && "scale-110")} />
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
