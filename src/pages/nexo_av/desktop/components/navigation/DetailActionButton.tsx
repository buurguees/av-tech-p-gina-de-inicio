import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import "../../styles/components/navigation/detail-action-button.css";

export type DetailActionType = "quote" | "invoice" | "technicians" | "purchase";

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
          label: "Crear Factura",
          icon: <Plus className="detail-action-button__icon" />,
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
