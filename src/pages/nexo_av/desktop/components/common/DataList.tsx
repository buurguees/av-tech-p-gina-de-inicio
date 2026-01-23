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
import "../../styles/components/common/data-list.css";

export interface DataListColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string; // CSS width (ej: "200px", "1fr", "auto")
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  priority?: number; // Menor número = mayor prioridad. Las columnas con priority siempre se muestran
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

  // Calcular grid-template-columns con anchos fijos y predecibles
  // Las columnas mínimas (prioridad 1-5) siempre tienen anchos fijos
  // Las columnas adicionales usan espacio flexible
  const gridColumns = columns.map(col => {
    // Si la columna tiene un width definido, usarlo
    if (col.width) return col.width;
    
    // Columnas mínimas (prioridad 1-5): anchos fijos
    if (col.priority !== undefined && col.priority <= 5) {
      // Nº documento (prioridad 1): ancho fijo medio
      if (col.priority === 1) {
        return 'clamp(140px, 160px, 180px)';
      }
      // Fecha de emisión (prioridad 2): ancho fijo pequeño
      if (col.priority === 2) {
        return 'clamp(110px, 120px, 130px)';
      }
      // Nº proyecto/pedido (prioridad 3): ancho fijo medio
      if (col.priority === 3) {
        return 'clamp(120px, 140px, 160px)';
      }
      // Nº pedido cliente (prioridad 4): ancho fijo medio
      if (col.priority === 4) {
        return 'clamp(130px, 150px, 170px)';
      }
      // Estado (prioridad 5): ancho fijo pequeño
      if (col.priority === 5) {
        return 'clamp(100px, 120px, 140px)';
      }
    }
    
    // Columnas de fecha: ancho fijo pequeño
    if (col.key.includes('date') || col.key.includes('fecha') || col.label.includes('F.')) {
      return 'clamp(110px, 120px, 130px)';
    }
    // Columnas de estado/badge: ancho fijo pequeño
    if (col.key === 'status' || col.key === 'lead_stage' || col.align === 'center') {
      return 'clamp(100px, 120px, 140px)';
    }
    // Columnas monetarias (total): ancho fijo medio
    if (col.key === 'total' || col.label === 'Total') {
      return 'clamp(110px, 130px, 150px)';
    }
    // Columnas monetarias (subtotal, paid_amount, etc.): ancho fijo medio
    if (col.key.includes('subtotal') || col.key.includes('paid_amount') || col.key.includes('amount') || col.label.includes('Subtotal') || col.label.includes('Pagada')) {
      return 'clamp(110px, 130px, 150px)';
    }
    // Columnas numéricas/códigos: ancho fijo medio
    if (col.key.includes('number') || col.key.includes('numero') || col.key.includes('_number')) {
      return 'clamp(120px, 150px, 180px)';
    }
    // Nombre del proyecto/cliente: más ancho y flexible
    if (col.key === 'project_name' || col.key === 'company_name' || col.key === 'client_name') {
      return 'minmax(clamp(180px, 220px, 280px), 1.5fr)';
    }
    // Por defecto: ancho fijo medio
    return 'clamp(120px, 150px, 180px)';
  }).join(' ') + (actions && actions.length > 0 ? ' clamp(2.5rem, 3rem, 3.5rem)' : '');

  return (
    <div className={cn("data-list", className)}>
      {/* Header */}
      <div 
        className="data-list__header"
        style={{ gridTemplateColumns: gridColumns } as React.CSSProperties}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className={cn(
              "data-list__header-cell",
              column.sortable && "data-list__header-cell--sortable",
              `data-list__header-cell--${column.align || "left"}`,
              column.priority === undefined && "data-list__header-cell--hideable",
              column.className
            )}
            data-priority={column.priority}
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
          <div className="data-list__header-cell data-list__header-cell--actions data-list__header-cell--priority" data-priority={0}></div>
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
              style={{ gridTemplateColumns: gridColumns } as React.CSSProperties}
              onClick={() => onItemClick?.(item)}
            >
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "data-list__cell",
                    `data-list__cell--${column.align || "left"}`,
                    column.priority === undefined && "data-list__cell--hideable",
                    column.className
                  )}
                  data-priority={column.priority}
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
                  className="data-list__cell data-list__cell--actions data-list__cell--priority"
                  data-priority={0}
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
