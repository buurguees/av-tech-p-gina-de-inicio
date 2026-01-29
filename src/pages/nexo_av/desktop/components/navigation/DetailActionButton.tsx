import { Button } from "@/components/ui/button";
import { Plus, Users, Send, Copy, Receipt, Edit, X, Save, Loader2, Building2, ClipboardList } from "lucide-react";
import "../../styles/components/navigation/detail-action-button.css";

export type DetailActionType = "quote" | "invoice" | "technicians" | "purchase" | "purchase-order" | "new_version" | "send" | "edit" | "new_invoice" | "new_client" | "new_project" | "new_technician" | "cancel" | "save" | "create_project";

interface DetailActionButtonProps {
  actionType: DetailActionType;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const DetailActionButton = ({
  actionType,
  onClick,
  disabled = false,
  loading = false,
  className,
}: DetailActionButtonProps) => {
  const getButtonConfig = () => {
    switch (actionType) {
      case "quote":
        return {
          label: "Crear Presupuesto",
          icon: <Plus className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "invoice":
        return {
          label: "Facturar",
          icon: <Receipt className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "technicians":
        return {
          label: "Asignar Técnicos",
          icon: <Users className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "purchase":
        return {
          label: "Subir Factura de Compra",
          icon: <Plus className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "purchase-order":
        return {
          label: "Nuevo Pedido de Compra",
          icon: <ClipboardList className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "new_version":
        return {
          label: "Nueva Versión",
          icon: <Copy className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "send":
        return {
          label: "Enviar",
          icon: <Send className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "edit":
        return {
          label: "Editar",
          icon: <Edit className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "new_invoice":
        return {
          label: "Nueva Factura",
          icon: <Plus className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "new_client":
        return {
          label: "Nuevo Cliente",
          icon: <Plus className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "new_project":
        return {
          label: "Nuevo Proyecto",
          icon: <Plus className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "new_technician":
        return {
          label: "Nuevo Técnico",
          icon: <Plus className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "cancel":
        return {
          label: "Cancelar",
          icon: <X className="detail-action-button__icon" />,
          variant: "outline" as const,
        };
      case "save":
        return {
          label: "Guardar",
          icon: <Save className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      case "create_project":
        return {
          label: "Nuevo Proyecto",
          icon: <Building2 className="detail-action-button__icon" />,
          variant: "default" as const,
        };
      default:
        return {
          label: "Acción",
          icon: <Plus className="detail-action-button__icon" />,
          variant: "default" as const,
        };
    }
  };

  const config = getButtonConfig();

  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className={`detail-action-button ${className || ""}`}
      variant={config.variant}
    >
      {loading ? (
        <Loader2 className="detail-action-button__icon animate-spin" />
      ) : (
        config.icon
      )}
      <span className="detail-action-button__label">
        {loading && actionType === "create_project" ? "Creando..." : config.label}
      </span>
    </Button>
  );
};

export default DetailActionButton;
