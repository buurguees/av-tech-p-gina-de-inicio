import { ReactNode } from "react";
import { ChevronUp, ChevronDown, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import "../styles/common/data-list.css";

export interface DataListColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string; // CSS width (ej: "200px", "1fr", "auto")
  render?: (item: T, index: number) => ReactNode;
  className?: string;
}

export interface DataListAction<T = any> {
  label: string;
  icon?: ReactNode;
  onClick: (item: T) => void;
  className?: string;
  variant?: "default" | "destructive";
  condition?: (item: T) => boolean; // Solo mostrar si se cumple la condición
}

export interface DataListProps<T = any> {
  data: T[];
  columns: DataListColumn<T>[];
  actions?: DataListAction<T>[];
  onItemClick?: (item: T) => void;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  getItemId: (item: T) => string;
  className?: string;
}

export default function DataList<T = any>({
  data,
  columns,
  actions,
  onItemClick,
  sortColumn,
  sortDirection = "asc",
  onSort,
  loading = false,
  emptyMessage = "No hay datos",
  emptyIcon,
  getItemId,
  className,
}: DataListProps<T>) {
  if (loading) {
    return (
      <div className="data-list__loading">
        <div className="data-list__spinner"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="data-list__empty">
        {emptyIcon && <div className="data-list__empty-icon">{emptyIcon}</div>}
        <p className="data-list__empty-message">{emptyMessage}</p>
      </div>
    );
  }

  const totalColumns = columns.length + (actions && actions.length > 0 ? 1 : 0);
  // Calcular el ancho mínimo dinámico basado en el número de columnas
  const minColumnWidth = totalColumns > 6 
    ? 'clamp(80px, 120px, 160px)' 
    : totalColumns > 4 
    ? 'clamp(100px, 150px, 200px)' 
    : 'clamp(120px, 180px, 250px)';
  const gridTemplateColumns = `repeat(${totalColumns}, minmax(${minColumnWidth}, 1fr))`;

  return (
    <div className={cn("data-list", className)}>
      {/* Header */}
      <div
        className="data-list__header"
        style={{ gridTemplateColumns } as React.CSSProperties}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className={cn(
              "data-list__header-cell",
              column.sortable && "data-list__header-cell--sortable",
              `data-list__header-cell--${column.align || "left"}`,
              column.className
            )}
            style={column.width ? { width: column.width } : undefined}
            onClick={() => column.sortable && onSort?.(column.key)}
          >
            <span className="data-list__header-label">{column.label}</span>
            {column.sortable && sortColumn === column.key && (
              <span className="data-list__header-sort-icon">
                {sortDirection === "asc" ? (
                  <ChevronUp className="data-list__sort-icon" />
                ) : (
                  <ChevronDown className="data-list__sort-icon" />
                )}
              </span>
            )}
          </div>
        ))}
        {actions && actions.length > 0 && (
          <div className="data-list__header-cell data-list__header-cell--actions"></div>
        )}
      </div>

      {/* Body */}
      <div className="data-list__body">
        {data.map((item, index) => {
          const itemId = getItemId(item);
          const visibleActions = actions?.filter(
            (action) => !action.condition || action.condition(item)
          );

          return (
            <div
              key={itemId}
              className={cn(
                "data-list__row",
                onItemClick && "data-list__row--clickable"
              )}
              style={{ gridTemplateColumns } as React.CSSProperties}
              onClick={() => onItemClick?.(item)}
            >
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "data-list__cell",
                    `data-list__cell--${column.align || "left"}`,
                    column.className
                  )}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.render ? (
                    column.render(item, index)
                  ) : (
                    <span className="data-list__cell-content">
                      {(item as any)[column.key] ?? "-"}
                    </span>
                  )}
                </div>
              ))}
              {visibleActions && visibleActions.length > 0 && (
                <div
                  className="data-list__cell data-list__cell--actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="data-list__action-button"
                      >
                        <MoreVertical className="data-list__action-icon" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-zinc-900 border-white/10"
                    >
                      {visibleActions.map((action, actionIndex) => (
                        <DropdownMenuItem
                          key={actionIndex}
                          className={cn(
                            "text-white hover:bg-white/10",
                            action.variant === "destructive" &&
                              "text-red-400 hover:bg-red-500/10",
                            action.className
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(item);
                          }}
                        >
                          {action.icon && (
                            <span className="data-list__action-item-icon">
                              {action.icon}
                            </span>
                          )}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
