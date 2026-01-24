import { ReactNode, useState, useEffect, useCallback, useRef } from "react";
import { ChevronUp, ChevronDown, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  width?: string;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  priority?: number; // 1-5 = always visible, 6+ = hide on smaller screens
}

export interface DataListAction<T = any> {
  label: string;
  icon?: ReactNode;
  onClick: (item: T) => void;
  className?: string;
  variant?: "default" | "destructive";
  condition?: (item: T) => boolean;
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

// Hook to detect screen breakpoint and filter columns accordingly
function useResponsiveColumns<T>(columns: DataListColumn<T>[], containerRef: React.RefObject<HTMLDivElement>): DataListColumn<T>[] {
  const [visibleColumns, setVisibleColumns] = useState<DataListColumn<T>[]>(columns);

  const updateColumns = useCallback(() => {
    // Usar el ancho del contenedor padre en lugar de window.innerWidth
    // para una mejor detección del espacio disponible
    const container = containerRef.current?.parentElement;
    const width = container ? container.clientWidth : window.innerWidth;
    
    // Priority system for responsive columns (ajustado para evitar scroll horizontal):
    // Priority 1: Always visible (document number - most important identifier)
    // Priority 2: Always visible (status - critical for quick scanning)
    // Priority 3: Always visible (main entity name - client/project)
    // Priority 4: Always visible (total/amount - key financial info)
    // Priority 5: Visible >= 1200px (secondary date/info)
    // Priority 6: Visible >= 1400px (additional reference numbers)
    // Priority 7: Visible >= 1600px (secondary amounts/details)
    // Priority 8: Visible >= 1800px (extra metadata)
    // No priority: Visible >= 2000px (optional info)
    
    const filtered = columns.filter(col => {
      const priority = col.priority;
      
      // Priority 1-4 always visible (columnas esenciales)
      if (priority !== undefined && priority <= 4) return true;
      
      // Priority 5 - hide below 1200px
      if (priority === 5) return width >= 1200;
      
      // Priority 6 - hide below 1400px
      if (priority === 6) return width >= 1400;
      
      // Priority 7 - hide below 1600px  
      if (priority === 7) return width >= 1600;
      
      // Priority 8 - hide below 1800px
      if (priority === 8) return width >= 1800;
      
      // No priority - hide below 2000px
      if (priority === undefined) return width >= 2000;
      
      return true;
    });
    
    setVisibleColumns(filtered);
  }, [columns, containerRef]);

  useEffect(() => {
    updateColumns();
    
    const handleResize = () => {
      updateColumns();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateColumns]);

  return visibleColumns;
}

// Get column width based on content type
// Sistema estandarizado: col1 (número interno) fijo, col2 (nombre) flexible más ancha, 
// estado fijo, resto flexible, opciones fija
// Anchos optimizados para evitar scroll horizontal
function getColumnWidth(col: DataListColumn<any>, index: number, totalColumns: number, hasActions: boolean): string {
  if (col.width) return col.width;
  
  // Columna 1: Número interno - ancho fijo (más ancho para presupuestos)
  if (index === 0) {
    return '110px';
  }
  
  // Columna 2: Nombre - flexible más ancha (más espacio)
  if (index === 1) {
    return 'minmax(220px, 3fr)';
  }
  
  // Columna penúltima (antes de acciones): Estado - ancho fijo
  const statusColumnIndex = hasActions ? totalColumns - 2 : totalColumns - 1;
  if (index === statusColumnIndex && (col.key === 'status' || col.key === 'lead_stage')) {
    return '110px';
  }
  
  // Resto de columnas: anchos flexibles optimizados para evitar scroll y equilibrar espacios
  if (col.key === 'status' || col.key === 'lead_stage') {
    return '110px';
  }
  // Cliente - reducir ancho para equilibrar con estado
  if (col.key === 'client_name') {
    return 'minmax(120px, 1.2fr)';
  }
  if (col.key.includes('date') || col.key.includes('fecha') || col.label.includes('F.') || col.label.includes('Creación') || col.label.includes('Emisión')) {
    return 'minmax(90px, 0.9fr)';
  }
  if (col.key === 'total' || col.label === 'Total') {
    return 'minmax(95px, 0.9fr)';
  }
  if (col.key.includes('subtotal') || col.key.includes('amount') || col.key.includes('paid_amount') || col.key === 'budget' || col.label === 'Presupuesto') {
    return 'minmax(95px, 0.9fr)';
  }
  // Gastos/expenses
  if (col.key === 'expenses' || col.key === 'gastos' || col.label === 'Gastos') {
    return 'minmax(95px, 0.9fr)';
  }
  if (col.key.includes('number') || col.key.includes('_number') || col.label.includes('Nº')) {
    return 'minmax(100px, 0.9fr)';
  }
  if (col.key === 'project_name' || col.key === 'company_name') {
    // Esta es la columna 2, ya manejada arriba
    return 'minmax(220px, 3fr)';
  }
  if (col.key === 'contact_email' || col.key === 'contact_phone') {
    return 'minmax(120px, 1fr)';
  }
  if (col.key === 'assigned_to_name' || col.key === 'assigned') {
    return 'minmax(115px, 1fr)';
  }
  if (col.key === 'profitability' || col.key === 'rentabilidad') {
    return 'minmax(100px, 0.9fr)';
  }
  if (col.key === 'projects' || col.label === 'Proyectos') {
    return 'minmax(80px, 0.7fr)';
  }
  
  return 'minmax(100px, 1fr)'; // Default flexible width
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
  // Ref para el contenedor del data-list
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Filter columns based on screen size
  const visibleColumns = useResponsiveColumns(columns, containerRef);
  
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

  // Calculate grid columns ONLY for visible columns
  const hasActions = actions && actions.length > 0;
  const gridColumns = visibleColumns
    .map((col, index) => getColumnWidth(col, index, visibleColumns.length, hasActions))
    .join(' ') + (hasActions ? ' 40px' : '');

  return (
    <div ref={containerRef} className={cn("data-list", className)}>
      {/* Header */}
      <div 
        className="data-list__header"
        style={{ gridTemplateColumns: gridColumns }}
      >
        {visibleColumns.map((column) => (
          <div
            key={column.key}
            className={cn(
              "data-list__header-cell",
              column.sortable && "data-list__header-cell--sortable",
              `data-list__header-cell--${column.align || "left"}`,
              column.className
            )}
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
              style={{ gridTemplateColumns: gridColumns }}
              onClick={() => onItemClick?.(item)}
            >
              {visibleColumns.map((column, colIndex) => (
                <div
                  key={column.key}
                  className={cn(
                    "data-list__cell",
                    `data-list__cell--${column.align || "left"}`,
                    // Aplicar bold a columnas 1 y 2 (índices 0 y 1)
                    (colIndex === 0 || colIndex === 1) && "data-list__cell--bold",
                    column.className
                  )}
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
