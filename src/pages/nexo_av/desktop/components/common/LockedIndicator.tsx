import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import "../../styles/components/common/locked-indicator.css";

interface LockedIndicatorProps {
  /**
   * Si el elemento está bloqueado
   */
  isLocked: boolean;
  
  /**
   * Mensaje personalizado para mostrar cuando está bloqueado
   * @default "Bloqueado"
   */
  message?: string;
  
  /**
   * Clase CSS adicional
   */
  className?: string;
  
  /**
   * Tamaño del indicador
   * @default "sm"
   */
  size?: "sm" | "md" | "lg";
}

const LockedIndicator = ({
  isLocked,
  message = "Bloqueado",
  className,
  size = "sm",
}: LockedIndicatorProps) => {
  if (!isLocked) return null;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "locked-indicator",
        `locked-indicator--${size}`,
        className
      )}
    >
      <Lock className="locked-indicator__icon" />
      <span className="locked-indicator__text">{message}</span>
    </Badge>
  );
};

export default LockedIndicator;
