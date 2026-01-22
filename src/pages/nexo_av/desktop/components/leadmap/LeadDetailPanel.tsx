/**
 * LeadDetailPanel - Temporalmente deshabilitado
 * 
 * Este componente requiere actualización para usar el tipo CanvassingLocation
 * en lugar del tipo LeadClient obsoleto. Se reconstruirá cuando trabajemos
 * en el módulo de Canvassing/LeadMap.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface LeadDetailPanelProps {
  client: any;
  onClose: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
  currentUserId: string | null;
  onFocusLocation?: () => void;
  userId?: string;
}

const LeadDetailPanel = ({}: LeadDetailPanelProps) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Detalle de Lead</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">
          Este componente está en mantenimiento.
          <br />
          Se actualizará próximamente.
        </p>
      </CardContent>
    </Card>
  );
};

export default LeadDetailPanel;
