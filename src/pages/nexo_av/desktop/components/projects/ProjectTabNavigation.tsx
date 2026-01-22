import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Users,
  Wallet,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectTabNavigationProps {
  className?: string;
}

const ProjectTabNavigation = ({ className }: ProjectTabNavigationProps) => {
  const tabs = [
    {
      value: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      value: "planning",
      label: "Planificación",
      icon: CalendarDays,
    },
    {
      value: "quotes",
      label: "Presupuestos",
      icon: FileText,
    },
    {
      value: "technicians",
      label: "Técnicos",
      icon: Users,
    },
    {
      value: "expenses",
      label: "Gastos",
      icon: Wallet,
    },
    {
      value: "invoices",
      label: "Facturas",
      icon: Receipt,
    },
  ];

  return (
    <div className={cn("w-full mb-6", className)}>
      <div className="relative">
        {/* Container con fondo sutil y bordes redondeados */}
        <TabsList className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-1.5 inline-flex gap-1 w-full max-w-full overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
                  "text-sm font-medium whitespace-nowrap flex-shrink-0",
                  "transition-all duration-300 ease-out",
                  "data-[state=inactive]:text-white/50 data-[state=inactive]:bg-transparent",
                  "data-[state=inactive]:hover:text-white/80 data-[state=inactive]:hover:bg-white/5",
                  // Light theme - activo negro con texto blanco
                  "data-[state=active]:bg-black data-[state=active]:text-white",
                  "data-[state=active]:shadow-lg data-[state=active]:shadow-black/20",
                  "data-[state=active]:scale-[1.02] data-[state=active]:font-semibold",
                  // Dark theme override
                  "dark:data-[state=active]:bg-white dark:data-[state=active]:text-black",
                  "dark:data-[state=active]:shadow-white/10",
                  // Focus states
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  // Smooth transitions
                  "group"
                )}
              >
                <Icon className="h-4 w-4 transition-transform duration-300 group-data-[state=active]:scale-110" />
                <span className="relative z-10">{tab.label}</span>
                
                {/* Indicador sutil de activo - línea inferior */}
                <span
                  className={cn(
                    "absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5",
                    "bg-white/60 rounded-full transition-all duration-300",
                    "group-data-[state=active]:w-3/4",
                    "dark:group-data-[state=active]:bg-black/60",
                    "pointer-events-none"
                  )}
                />
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </div>
  );
};

export default ProjectTabNavigation;
