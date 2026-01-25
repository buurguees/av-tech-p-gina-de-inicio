import { ReactNode } from "react";
import { MoreVertical, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface MoreOptionsAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
  className?: string;
}

export interface MoreOptionsDropdownProps {
  actions: MoreOptionsAction[];
  align?: "start" | "center" | "end";
  iconVariant?: "vertical" | "horizontal";
  size?: "sm" | "md" | "lg";
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

/**
 * MoreOptionsDropdown - Componente reutilizable para menús de "..." (más opciones)
 * Usa el sistema de Radix UI DropdownMenu para máxima compatibilidad.
 */
export default function MoreOptionsDropdown({
  actions,
  align = "end",
  iconVariant = "vertical",
  size = "md",
  className,
  triggerClassName,
  disabled = false,
}: MoreOptionsDropdownProps) {
  const IconComponent = iconVariant === "vertical" ? MoreVertical : MoreHorizontal;

  // Filtrar acciones deshabilitadas
  const visibleActions = actions.filter(action => !action.disabled);

  if (visibleActions.length === 0) {
    return null;
  }

  // Tamaños del botón e icono
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(
            sizeClasses[size],
            "text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors",
            triggerClassName
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <IconComponent className={iconSizeClasses[size]} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn(
          "min-w-[10rem] z-[9999] bg-card border border-border shadow-lg",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {visibleActions.map((action, index) => {
          const isDestructive = action.variant === "destructive";
          const nextAction = visibleActions[index + 1];
          const shouldAddSeparator = !isDestructive && nextAction?.variant === "destructive";

          return (
            <div key={index}>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                className={cn(
                  "cursor-pointer",
                  isDestructive && "text-destructive focus:text-destructive focus:bg-destructive/10",
                  action.className
                )}
              >
                {action.icon && (
                  <span className="mr-2 flex-shrink-0">{action.icon}</span>
                )}
                <span>{action.label}</span>
              </DropdownMenuItem>
              {shouldAddSeparator && <DropdownMenuSeparator />}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
