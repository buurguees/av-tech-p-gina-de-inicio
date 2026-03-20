/**
 * SortableLineRow — fila de tabla arrastrable con @dnd-kit/sortable
 *
 * Uso:
 *   <SortableLineRow id={line.id || line.tempId || ""}>
 *     {(dragHandleProps) => (
 *       <>
 *         <TableCell>
 *           <button {...dragHandleProps} className="cursor-grab active:cursor-grabbing ...">
 *             <GripVertical className="h-4 w-4" />
 *           </button>
 *         </TableCell>
 *         {/* resto de celdas *\/}
 *       </>
 *     )}
 *   </SortableLineRow>
 */
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TableRow } from "@/components/ui/table";
import type { ReactNode } from "react";

interface SortableLineRowProps {
  id: string;
  className?: string;
  children: (dragHandleProps: Record<string, unknown>) => ReactNode;
}

export function SortableLineRow({ id, className, children }: SortableLineRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <TableRow
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={className}
    >
      {children({ ...attributes, ...listeners })}
    </TableRow>
  );
}
