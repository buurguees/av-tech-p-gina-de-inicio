/**
 * LeadDetailMobileSheet - Temporalmente deshabilitado
 * 
 * Este componente requiere actualización para usar el tipo CanvassingLocation
 * en lugar del tipo LeadClient obsoleto. Se reconstruirá cuando trabajemos
 * en el módulo de Canvassing/LeadMap.
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertCircle } from "lucide-react";

interface LeadDetailMobileSheetProps {
  client: any;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
  currentUserId: string | null;
  onFocusLocation?: () => void;
  userId?: string;
}

const LeadDetailMobileSheet = ({
  open,
  onClose,
}: LeadDetailMobileSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Detalle de Lead</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col items-center justify-center h-full">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Este componente está en mantenimiento.
            <br />
            Se actualizará próximamente.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LeadDetailMobileSheet;
