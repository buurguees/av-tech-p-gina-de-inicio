/**
 * LeadMapSidebar - Temporalmente deshabilitado
 * 
 * Este componente requiere actualización para usar el tipo CanvassingLocation
 * en lugar del tipo LeadClient obsoleto. Se reconstruirá cuando trabajemos
 * en el módulo de Canvassing/LeadMap.
 */
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface LeadMapSidebarProps {
  stats: any[];
  clients: any[];
  onClientSelect: (client: any) => void;
}

const LeadMapSidebar = ({}: LeadMapSidebarProps) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Leads</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100%-4rem)]">
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-center text-sm">
              Componente en mantenimiento
            </p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LeadMapSidebar;
