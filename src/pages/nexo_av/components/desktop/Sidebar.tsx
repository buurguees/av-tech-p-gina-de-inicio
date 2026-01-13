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
  userRole?: string;
}

const Sidebar = ({ userId, modules, userRole }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const availableModules = modules.filter(m => m.available);
  
  // Separar módulos principales de admin
  const mainModules = availableModules.filter(m => 
    !['settings', 'audit', 'users'].includes(m.id)
  );
  
  const adminModules = availableModules.filter(m => 
    ['settings', 'audit'].includes(m.id)
  );
  
  const isAdmin = userRole === 'admin' || modules.some(m => m.id === 'settings' && m.available);

  /**
   * Determina si una ruta está activa basándose en la ubicación actual
   * Mejora la detección para rutas específicas como quotes, invoices, etc.
   */
  const isActive = (path: string) => {
    if (!userId) return false;
    
    const currentPath = location.pathname;
    
    // Para dashboard, solo activo si es exactamente esa ruta
    if (path === `/nexo-av/${userId}/dashboard`) {
      return currentPath === path;
    }
    
    // Para otras rutas, está activo si:
    // 1. La ruta actual coincide exactamente con la ruta del módulo
    // 2. La ruta actual comienza con la ruta del módulo seguida de /
    // Ejemplo: /nexo-av/123/quotes está activo cuando estamos en:
    //   - /nexo-av/123/quotes (coincidencia exacta)
    //   - /nexo-av/123/quotes/456 (ruta de detalle)
    //   - /nexo-av/123/quotes/456/edit (ruta de edición)
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  return (
    <aside className="hidden md:flex flex-col w-56 bg-card border-r border-border h-full z-40 flex-shrink-0">
      <nav className="flex-1 overflow-y-auto flex flex-col py-2">
        {/* Sección Principal */}
        <div className="flex-1 px-2 space-y-0.5">
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

          {/* Módulos principales */}
          {mainModules.map((module) => {
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
        </div>

        {/* Separador Visual y Sección Admin */}
        {isAdmin && adminModules.length > 0 && (
          <>
            <hr className="my-2 border-border mx-2" />
            <div className="px-2 pb-2 space-y-0.5">
              {adminModules.map((module) => {
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
            </div>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
