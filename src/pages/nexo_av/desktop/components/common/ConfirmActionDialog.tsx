import { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Send, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmActionType = "issue_invoice" | "send_quote" | "generic";

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  actionType?: ConfirmActionType;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: "default" | "warning" | "destructive";
  icon?: ReactNode;
}

const ACTION_CONFIGS: Record<ConfirmActionType, {
  title: string;
  description: string;
  confirmLabel: string;
  icon: ReactNode;
  variant: "default" | "warning" | "destructive";
}> = {
  issue_invoice: {
    title: "¿Emitir factura?",
    description: "Una vez emitida, la factura quedará bloqueada y no podrá ser modificada. Se generará el número definitivo y el asiento contable correspondiente. Esta acción no se puede deshacer fácilmente.",
    confirmLabel: "Emitir factura",
    icon: <FileCheck className="h-6 w-6" />,
    variant: "warning",
  },
  send_quote: {
    title: "¿Enviar presupuesto?",
    description: "El presupuesto pasará a estado 'Enviado' y quedará registrado como entregado al cliente. Podrás seguir editándolo mientras no sea aceptado.",
    confirmLabel: "Enviar presupuesto",
    icon: <Send className="h-6 w-6" />,
    variant: "default",
  },
  generic: {
    title: "¿Confirmar acción?",
    description: "¿Estás seguro de que deseas realizar esta acción?",
    confirmLabel: "Confirmar",
    icon: <AlertTriangle className="h-6 w-6" />,
    variant: "default",
  },
};

export default function ConfirmActionDialog({
  open,
  onOpenChange,
  onConfirm,
  actionType = "generic",
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  loading = false,
  variant,
  icon,
}: ConfirmActionDialogProps) {
  const config = ACTION_CONFIGS[actionType];
  
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalConfirmLabel = confirmLabel || config.confirmLabel;
  const finalVariant = variant || config.variant;
  const finalIcon = icon || config.icon;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex-shrink-0 p-3 rounded-full",
                finalVariant === "warning" && "bg-amber-500/10 text-amber-500",
                finalVariant === "destructive" && "bg-red-500/10 text-red-500",
                finalVariant === "default" && "bg-primary/10 text-primary"
              )}
            >
              {finalIcon}
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-lg font-semibold">
                {finalTitle}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
                {finalDescription}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              finalVariant === "warning" && "bg-amber-500 hover:bg-amber-600 text-white",
              finalVariant === "destructive" && "bg-red-500 hover:bg-red-600 text-white"
            )}
          >
            {loading ? "Procesando..." : finalConfirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
