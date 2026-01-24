import { Button } from "@/components/ui/button";
import { Plus, Users, Send, Copy, Receipt, Edit } from "lucide-react";
import "../../styles/components/navigation/detail-action-button.css";

export type DetailActionType = "quote" | "invoice" | "technicians" | "purchase" | "new_version" | "send" | "edit" | "new_invoice" | "new_client" | "new_project" | "new_technician";

interface DetailActionButtonProps {
  actionType: DetailActionType;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

const DetailActionButton = ({
  actionType,
  onClick,
  disabled = false,
  className,
}: DetailActionButtonProps) => {
  const getButtonConfig = () => {
    switch (actionType) {
      case "quote":
        return {
          label: "Crear Presupuesto",
          icon: <Plus className="detail-action-button__icon" />,
        };
      case "invoice":
        return {
          label: "Facturar",
          icon: <Receipt className="detail-action-button__icon" />,
        };
      case "technicians":
        return {
          label: "Asignar Técnicos",
          icon: <Users className="detail-action-button__icon" />,
        };
      case "purchase":
        return {
          label: "Subir Factura de Compra",
          icon: <Plus className="detail-action-button__icon" />,
        };
      case "new_version":
        return {
          label: "Nueva Versión",
          icon: <Copy className="detail-action-button__icon" />,
        };
      case "send":
        return {
          label: "Enviar",
          icon: <Send className="detail-action-button__icon" />,
        };
      case "edit":
        return {
          label: "Editar Proyecto",
          icon: <Edit className="detail-action-button__icon" />,
        };
      case "new_invoice":
        return {
          label: "Nueva Factura",
          icon: <Plus className="detail-action-button__icon" />,
        };
      case "new_client":
        return {
          label: "Nuevo Cliente",
          icon: <Plus className="detail-action-button__icon" />,
        };
      case "new_project":
        return {
          label: "Nuevo Proyecto",
          icon: <Plus className="detail-action-button__icon" />,
        };
      case "new_technician":
        return {
          label: "Nuevo Técnico",
          icon: <Plus className="detail-action-button__icon" />,
        };
      default:
        return {
          label: "Acción",
          icon: <Plus className="detail-action-button__icon" />,
        };
    }
  };

  const config = getButtonConfig();

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`detail-action-button ${className || ""}`}
      variant="default"
    >
      {config.icon}
      <span className="detail-action-button__label">{config.label}</span>
    </Button>
  );
};

export default DetailActionButton;
