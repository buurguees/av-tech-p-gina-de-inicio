import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Users,
  Wallet,
  Receipt,
} from "lucide-react";

const ProjectTabNavigation = () => {
  return (
    <div className="w-full flex justify-center mb-4 px-2 sm:px-3 md:px-4 lg:px-6">
      <TabsList className="bg-muted/60 border border-border rounded-lg inline-flex gap-1 p-1">
        <TabsTrigger value="dashboard" className="text-sm px-3 py-2 rounded-md whitespace-nowrap">
          <LayoutDashboard className="h-4 w-4 mr-1.5" />
          Dashboard
        </TabsTrigger>
        <TabsTrigger value="planning" className="text-sm px-3 py-2 rounded-md whitespace-nowrap">
          <CalendarDays className="h-4 w-4 mr-1.5" />
          Planificación
        </TabsTrigger>
        <TabsTrigger value="quotes" className="text-sm px-3 py-2 rounded-md whitespace-nowrap">
          <FileText className="h-4 w-4 mr-1.5" />
          Presupuestos
        </TabsTrigger>
        <TabsTrigger value="technicians" className="text-sm px-3 py-2 rounded-md whitespace-nowrap">
          <Users className="h-4 w-4 mr-1.5" />
          Técnicos
        </TabsTrigger>
        <TabsTrigger value="expenses" className="text-sm px-3 py-2 rounded-md whitespace-nowrap">
          <Wallet className="h-4 w-4 mr-1.5" />
          Gastos
        </TabsTrigger>
        <TabsTrigger value="invoices" className="text-sm px-3 py-2 rounded-md whitespace-nowrap">
          <Receipt className="h-4 w-4 mr-1.5" />
          Facturas
        </TabsTrigger>
      </TabsList>
    </div>
  );
};

export default ProjectTabNavigation;
