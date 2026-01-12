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
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {/* Dashboard Home */}
        <motion.button
          onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
            isActive(`/nexo-av/${userId}/dashboard`)
              ? "bg-white/10 text-white border border-white/20"
              : "text-white/60 hover:bg-white/5 hover:text-white"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Home className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">Dashboard</span>
        </motion.button>

        {/* Divider */}
        <div className="h-px bg-white/10 my-2" />

        {/* Modules */}
        {availableModules.map((module) => {
          const Icon = module.icon;
          const active = isActive(module.path);
          
          return (
            <motion.button
              key={module.id}
              onClick={() => navigate(module.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
                active
                  ? "bg-white/10 text-white border border-white/20"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{module.title}</span>
            </motion.button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
