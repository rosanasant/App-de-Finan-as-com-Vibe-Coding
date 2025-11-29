import { NavLink } from "react-router-dom";
import { MessageSquare, Target, BarChart3, Receipt, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navItems = [
    { to: "/", icon: MessageSquare, label: "Chat" },
    { to: "/transactions", icon: Receipt, label: "Extrato" },
    { to: "/goals", icon: Target, label: "Metas" },
    { to: "/report", icon: BarChart3, label: "Relatório" },
    { to: "/settings", icon: Settings, label: "Config" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-soft z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-3 px-4 transition-smooth",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-6 h-6", isActive && "scale-110")} />
                  <span className="text-xs font-medium">{item.label}</span>
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
