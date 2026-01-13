import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Module {
  id: string;
  title: string;
  icon: LucideIcon;
  path: string;
  available: boolean;
}

interface SidebarProps {
  userId: string | undefined;
  modules: Module[];
}

const Sidebar = ({ userId, modules }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const availableModules = modules.filter(m => m.available);

  const isActive = (path: string) => {
    if (path === `/nexo-av/${userId}/dashboard`) {
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden md:flex flex-col w-56 bg-card border-r border-border h-[calc(100vh-3.25rem)] sticky top-[3.25rem] shrink-0">
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {/* Dashboard Home */}
        <motion.button
          onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all duration-150",
            isActive(`/nexo-av/${userId}/dashboard`)
              ? "bg-secondary text-foreground font-medium"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
          whileTap={{ scale: 0.98 }}
        >
          <Home size={16} />
          <span className="text-sm">Dashboard</span>
        </motion.button>

        {/* Divider */}
        <div className="h-px bg-border my-2" />

        {/* Modules */}
        {availableModules.map((module) => {
          const Icon = module.icon;
          const active = isActive(module.path);
          
          return (
            <motion.button
              key={module.id}
              onClick={() => navigate(module.path)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all duration-150",
                active
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={16} />
              <span className="text-sm">{module.title}</span>
            </motion.button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
