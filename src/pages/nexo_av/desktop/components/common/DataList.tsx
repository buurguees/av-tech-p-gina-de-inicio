import { ReactNode, useState, useEffect, useCallback } from "react";
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
function useResponsiveColumns<T>(columns: DataListColumn<T>[]): DataListColumn<T>[] {
  const [visibleColumns, setVisibleColumns] = useState<DataListColumn<T>[]>(columns);

  const updateColumns = useCallback(() => {
    const width = window.innerWidth;
    
    // Filter columns based on priority and screen width
    // Priority 1-5: always visible
    // Priority 6: hidden below 1000px
    // Priority 7: hidden below 1200px
    // Priority 8: hidden below 1400px
    // No priority (undefined): hidden below 1600px
    
    const filtered = columns.filter(col => {
      const priority = col.priority;
      
      // Priority 1-5 always visible
      if (priority !== undefined && priority <= 5) return true;
      
      // No priority - hide below 1600px
      if (priority === undefined) return width >= 1600;
      
      // Priority 6 - hide below 1000px
      if (priority === 6) return width >= 1000;
      
      // Priority 7 - hide below 1200px  
      if (priority === 7) return width >= 1200;
      
      // Priority 8 - hide below 1400px
      if (priority === 8) return width >= 1400;
      
      return true;
    });
    
    setVisibleColumns(filtered);
  }, [columns]);

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
function getColumnWidth(col: DataListColumn<any>): string {
  if (col.width) return col.width;
  
  // Priority-based widths
  if (col.priority !== undefined && col.priority <= 5) {
    if (col.priority === 1) return '140px'; // Document number
    if (col.priority === 2) return '100px'; // Date
    if (col.priority === 3) return '120px'; // Project
    if (col.priority === 4) return '100px'; // Status
    if (col.priority === 5) return '100px'; // Total
  }
  
  // Key-based widths
  if (col.key.includes('date') || col.key.includes('fecha') || col.label.includes('F.')) {
    return '100px';
  }
  if (col.key === 'status' || col.key === 'lead_stage') {
    return '100px';
  }
  if (col.key === 'total' || col.label === 'Total') {
    return '100px';
  }
  if (col.key.includes('subtotal') || col.key.includes('amount')) {
    return '110px';
  }
  if (col.key.includes('number') || col.key.includes('_number')) {
    return '130px';
  }
  if (col.key === 'project_name' || col.key === 'company_name' || col.key === 'client_name') {
    return 'minmax(150px, 1fr)';
  }
  
  return '120px';
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
  // Filter columns based on screen size
  const visibleColumns = useResponsiveColumns(columns);
  
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
  const gridColumns = visibleColumns
    .map(col => getColumnWidth(col))
    .join(' ') + (actions && actions.length > 0 ? ' 40px' : '');

  return (
    <div className={cn("data-list", className)}>
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
              {visibleColumns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "data-list__cell",
                    `data-list__cell--${column.align || "left"}`,
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
