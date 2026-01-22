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
    <div className="flex justify-center mb-6">
      <TabsList className="bg-muted/60 border border-border rounded-lg inline-flex justify-center max-w-fit">
        <TabsTrigger value="dashboard" className="text-sm px-4 py-2.5 rounded-md">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </TabsTrigger>
        <TabsTrigger value="planning" className="text-sm px-4 py-2.5 rounded-md">
          <CalendarDays className="h-4 w-4" />
          Planificación
        </TabsTrigger>
        <TabsTrigger value="quotes" className="text-sm px-4 py-2.5 rounded-md">
          <FileText className="h-4 w-4" />
          Presupuestos
        </TabsTrigger>
        <TabsTrigger value="technicians" className="text-sm px-4 py-2.5 rounded-md">
          <Users className="h-4 w-4" />
          Técnicos
        </TabsTrigger>
        <TabsTrigger value="expenses" className="text-sm px-4 py-2.5 rounded-md">
          <Wallet className="h-4 w-4" />
          Gastos
        </TabsTrigger>
        <TabsTrigger value="invoices" className="text-sm px-4 py-2.5 rounded-md">
          <Receipt className="h-4 w-4" />
          Facturas
        </TabsTrigger>
      </TabsList>
    </div>
  );
};

export default ProjectTabNavigation;
