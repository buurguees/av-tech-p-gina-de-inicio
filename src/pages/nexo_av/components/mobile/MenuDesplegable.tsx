/**
 * MenuDesplegable - Mobile dropdown menu placeholder
 * 
 * Este componente se usa en el bottom nav móvil para mostrar opciones adicionales.
 * Actualmente es un placeholder - será implementado cuando trabajemos el módulo mobile.
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertCircle } from "lucide-react";

interface MenuDesplegableProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  userRoles?: string[];
  isAdmin?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

const MenuDesplegable = ({ open, onOpenChange }: MenuDesplegableProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[60vh]">
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col items-center justify-center h-full">
          <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-center text-sm">
            Menú móvil en desarrollo
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MenuDesplegable;
