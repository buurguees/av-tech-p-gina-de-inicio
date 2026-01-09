import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { NavigateFunction } from "react-router-dom";
import QuickQuoteDialog from "../QuickQuoteDialog";
import { useIOS } from "@/hooks/use-mobile";

interface Module {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  borderColor: string;
  available: boolean;
  path: string;
}

interface DashboardMobileProps {
  userInfo: {
    full_name?: string;
  } | null;
  modules: Module[];
  isAdmin: boolean | undefined;
  isManager: boolean | undefined;
  isSales: boolean | undefined;
  isTech: boolean | undefined;
  userId: string | undefined;
  navigate: NavigateFunction;
  onNewLead: () => void;
}

const DashboardMobile = ({
  userInfo,
  modules,
  isAdmin,
  isManager,
  isSales,
  isTech,
  userId,
  navigate,
  onNewLead,
}: DashboardMobileProps) => {
  const { isIOS } = useIOS();
  const availableModules = modules.filter(m => m.available);
  
  // Reduce animation complexity on iOS for better performance
  const animationProps = isIOS
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  return (
    <>
      {/* Welcome section - compact for mobile */}
      <motion.div
        {...animationProps}
        transition={{ duration: isIOS ? 0.1 : 0.3 }}
        className="mb-4"
      >
        <h2 className="text-lg font-bold text-white mb-1">
          Hola, {userInfo?.full_name?.split(' ')[0]}
        </h2>
        <p className="text-white/50 text-sm">
          ¿Qué quieres hacer?
        </p>
      </motion.div>

      {/* Quick actions - optimized for mobile */}
      <motion.div
        {...animationProps}
        transition={{ duration: isIOS ? 0.1 : 0.3, delay: isIOS ? 0 : 0.05 }}
        className="flex flex-wrap gap-2 mb-4"
      >
        {(isAdmin || isManager || isSales) && (
          <Button 
            onClick={onNewLead}
            className="bg-white text-black hover:bg-white/90 text-sm h-11 px-4 min-w-[120px] touch-target"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Lead
          </Button>
        )}
        {(isAdmin || isManager || isSales) && (
          <QuickQuoteDialog 
            trigger={
              <Button 
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10 text-sm h-11 px-4 min-w-[120px] touch-target"
              >
                <Plus className="h-4 w-4 mr-2" />
                Presupuesto
              </Button>
            }
          />
        )}
        {(isAdmin || isManager || isTech) && (
          <Button 
            variant="outline" 
            className="border-white/20 text-white hover:bg-white/10 text-sm h-11 px-4 min-w-[120px] touch-target"
          >
            <Plus className="h-4 w-4 mr-2" />
            Proyecto
          </Button>
        )}
      </motion.div>

      {/* Modules grid - 2 columns optimized for mobile */}
      <div className="grid grid-cols-2 gap-3">
        {availableModules.map((module, index) => (
          <motion.div
            key={module.id}
            {...animationProps}
            transition={{ 
              duration: isIOS ? 0.1 : 0.2, 
              delay: isIOS ? 0 : 0.05 + index * 0.02 
            }}
          >
            <button
              onClick={() => navigate(module.path)}
              className={`w-full h-32 p-4 rounded-2xl border ${module.borderColor} bg-gradient-to-br ${module.color} hover:border-white/40 active:scale-[0.97] transition-all duration-200 group text-left flex flex-col justify-between backdrop-blur-sm shadow-lg touch-target`}
            >
              <div className="p-3 rounded-xl bg-white/5 group-active:bg-white/10 transition-colors w-fit shadow-sm">
                <module.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white font-semibold text-sm leading-tight">{module.title}</h3>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Coming soon notice - compact */}
      <motion.div
        {...animationProps}
        transition={{ duration: isIOS ? 0.1 : 0.3, delay: isIOS ? 0 : 0.2 }}
        className="mt-8 text-center"
      >
        <p className="text-white/30 text-xs">
          Más funcionalidades próximamente
        </p>
      </motion.div>
    </>
  );
};

export default DashboardMobile;
