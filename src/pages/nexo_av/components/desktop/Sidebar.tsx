import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Users, 
  FileText, 
  FolderKanban, 
  Package,
  Settings,
  BarChart3,
  UserCog,
  Shield,
  Receipt,
  Calculator,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Module {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
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
    <aside className="hidden md:flex flex-col w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 h-[calc(100vh-4rem)] sticky top-16">
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Dashboard Home */}
        <motion.button
          onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group",
            isActive(`/nexo-av/${userId}/dashboard`)
              ? "bg-white/10 text-white shadow-lg shadow-white/5"
              : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
          whileHover={{ scale: 1.01, x: 2 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className={cn(
            "p-1.5 rounded-lg transition-colors",
            isActive(`/nexo-av/${userId}/dashboard`)
              ? "bg-white/10"
              : "bg-white/5 group-hover:bg-white/10"
          )}>
            <Home className="h-4 w-4 flex-shrink-0" />
          </div>
          <span className="font-medium text-sm">Dashboard</span>
        </motion.button>

        {/* Divider */}
        <div className="h-px bg-white/10 my-3" />

        {/* Modules */}
        {availableModules.map((module) => {
          const Icon = module.icon;
          const active = isActive(module.path);
          
          return (
            <motion.button
              key={module.id}
              onClick={() => navigate(module.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group",
                active
                  ? "bg-white/10 text-white shadow-lg shadow-white/5"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                active
                  ? "bg-white/10"
                  : "bg-white/5 group-hover:bg-white/10"
              )}>
                <Icon className="h-4 w-4 flex-shrink-0" />
              </div>
              <span className="font-medium text-sm">{module.title}</span>
            </motion.button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
