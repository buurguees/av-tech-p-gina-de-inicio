import { useState, useCallback, useMemo } from "react";
import { useDisplacementRules } from "@/pages/nexo_av/shared/hooks/useDisplacementRules";
import { useCompanionRules } from "@/pages/nexo_av/shared/hooks/useCompanionRules";
import { parseDecimalInput } from "@/pages/nexo_av/utils/parseDecimalInput";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical, ChevronDown, Clock, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductSearchInput from "../common/ProductSearchInput";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface DocumentLine {
  id?: string;
  tempId?: string;
  concept: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  group_name?: string;
  line_order?: number;
  product_id?: string;
}

export interface TaxOption {
  value: number;
  label: string;
}

interface DocumentLinesEditorProps {
  lines: DocumentLine[];
  onLinesChange: (lines: DocumentLine[]) => void;
  taxOptions: TaxOption[];
  defaultTaxRate: number;
  /** @deprecated La descripción ahora es siempre expandible por línea */
  showDescription?: boolean;
  className?: string;
}

// Columnas: [drag | concepto | cant | precio | dto% | impuesto | total | delete]
const GRID = "grid-cols-[20px_1fr_76px_96px_60px_108px_88px_30px]";

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (dragHandleProps: Record<string, unknown>) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocumentLinesEditor({
  lines,
  onLinesChange,
  taxOptions,
  defaultTaxRate,
  className,
}: DocumentLinesEditorProps) {
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  const {
    config: displacementConfig,
    suppressedRef,
    setSuppressedKmKeys,
    resolveHours,
    isDisplacementChild,
  } = useDisplacementRules();

  const {
    suppressedRef: companionSuppressedRef,
    setSuppressedTriggerKeys: setCompanionSuppressedKeys,
    findRuleForTrigger,
    isCompanionChild,
  } = useCompanionRules();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const toggleExpand = useCallback((key: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = lines.findIndex((l) => (l.id || l.tempId) === active.id);
      const newIndex = lines.findIndex((l) => (l.id || l.tempId) === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onLinesChange(
        arrayMove(lines, oldIndex, newIndex).map((line, i) => ({
          ...line,
          line_order: i + 1,
        }))
      );
    },
    [lines, onLinesChange]
  );

  const calculateLineValues = useCallback(
    (line: Partial<DocumentLine>): DocumentLine => {
      const quantity = line.quantity ?? 0;
      const unitPrice = line.unit_price ?? 0;
      const discountPercent = line.discount_percent ?? 0;
      const taxRate = line.tax_rate ?? defaultTaxRate;
      const subtotal = quantity * unitPrice * (1 - discountPercent / 100);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      return {
        ...line,
        concept: line.concept ?? "",
        description: line.description ?? "",
        quantity,
        unit_price: unitPrice,
        tax_rate: taxRate,
        discount_percent: discountPercent,
        subtotal,
        tax_amount: taxAmount,
        total,
      } as DocumentLine;
    },
    [defaultTaxRate]
  );

  const addLine = useCallback(() => {
    const newLine = calculateLineValues({
      tempId: crypto.randomUUID(),
      concept: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: defaultTaxRate,
      discount_percent: 0,
      line_order: lines.length + 1,
    });
    onLinesChange([...lines, newLine]);
  }, [lines, onLinesChange, calculateLineValues, defaultTaxRate]);

  const updateLine = useCallback(
    (index: number, field: keyof DocumentLine, value: unknown) => {
      const updated = [...lines];
      updated[index] = calculateLineValues({ ...updated[index], [field]: value });

      // Lógica de desplazamiento: cuando cambia la cantidad en la línea de km
      const cfg = displacementConfig;
      if (field === "quantity" && cfg && updated[index].product_id === cfg.kmProductId) {
        const km = value as number;
        const parentKey = updated[index].id || updated[index].tempId || String(index);

        // Si el usuario descartó las horas para esta línea, respetar su decisión
        if (suppressedRef.current.has(parentKey)) {
          onLinesChange(updated);
          return;
        }

        const hours = resolveHours(km);
        const hoursIdx = updated.findIndex(
          (l, i) => i !== index && l.product_id === cfg.hoursProductId
        );

        if (hours > 0) {
          const baseHours =
            hoursIdx >= 0
              ? updated[hoursIdx]
              : {
                  tempId: crypto.randomUUID(),
                  concept: cfg.hoursProductName,
                  description: "",
                  unit_price: cfg.hoursUnitPrice,
                  tax_rate: cfg.hoursTaxRate,
                  discount_percent: 0,
                  product_id: cfg.hoursProductId,
                  line_order: updated.length + 1,
                };
          const newHoursLine = calculateLineValues({ ...baseHours, quantity: hours });
          if (hoursIdx >= 0) {
            updated[hoursIdx] = newHoursLine;
            // Asegurar que la sub-sección esté justo después del km
            if (hoursIdx !== index + 1) {
              const [removed] = updated.splice(hoursIdx, 1);
              updated.splice(index + 1, 0, removed);
            }
          } else {
            updated.splice(index + 1, 0, newHoursLine);
          }
        } else if (hoursIdx >= 0) {
          updated.splice(hoursIdx, 1);
        }

        onLinesChange(updated.map((l, i) => ({ ...l, line_order: i + 1 })));
        return;
      }

      // Lógica de acompañante: cuando cambia la cantidad en una línea trigger
      if (field === "quantity" && updated[index].product_id) {
        const rule = findRuleForTrigger(updated[index].product_id!);
        if (rule) {
          const triggerKey = updated[index].id || updated[index].tempId || String(index);
          if (!companionSuppressedRef.current.has(triggerKey)) {
            const newQty = value as number;
            const companionIdx = index + 1;
            if (
              companionIdx < updated.length &&
              updated[companionIdx].product_id === rule.companionProductId
            ) {
              const newCompanionQty = newQty * rule.quantityRatio;
              updated[companionIdx] = calculateLineValues({
                ...updated[companionIdx],
                quantity: newCompanionQty,
                unit_price: rule.companionSalePrice,
              });
            }
          }
        }
      }

      onLinesChange(updated);
    },
    [lines, onLinesChange, calculateLineValues, displacementConfig, findRuleForTrigger, companionSuppressedRef]
  );

  const removeLine = useCallback(
    (index: number) => {
      const cfg = displacementConfig;
      let filtered = lines.filter((_, i) => i !== index);

      if (cfg) {
        if (lines[index]?.product_id === cfg.kmProductId) {
          // Eliminar km → también eliminar la sub-sección de horas adjunta
          filtered = filtered.filter((l) => l.product_id !== cfg.hoursProductId);
          // Limpiar supresión para esa clave
          const removedKey = lines[index].id || lines[index].tempId;
          if (removedKey) {
            setSuppressedKmKeys((prev) => {
              const next = new Set(prev);
              next.delete(removedKey);
              return next;
            });
          }
        } else if (isDisplacementChild(lines, index, cfg)) {
          // El usuario descarta manualmente la sub-sección de horas
          const parentLine = lines[index - 1];
          const parentKey = parentLine?.id || parentLine?.tempId;
          if (parentKey) {
            setSuppressedKmKeys((prev) => new Set([...prev, parentKey]));
          }
        }
      }

      // Lógica de acompañante
      const removedLine = lines[index];
      if (removedLine?.product_id) {
        const rule = findRuleForTrigger(removedLine.product_id);
        if (rule) {
          // Es un trigger: eliminar también el companion justo después
          filtered = filtered.filter((_, i) => {
            const originalIdx = i >= index ? i + 1 : i;
            return !(originalIdx === index + 1 && lines[index + 1]?.product_id === rule.companionProductId);
          });
          // Limpiar supresión
          const triggerKey = removedLine.id || removedLine.tempId;
          if (triggerKey) {
            setCompanionSuppressedKeys((prev) => {
              const next = new Set(prev);
              next.delete(triggerKey);
              return next;
            });
          }
        } else if (isCompanionChild(lines, index)) {
          // Es un companion: suprimir para la línea trigger anterior
          const parentLine = lines[index - 1];
          const parentKey = parentLine?.id || parentLine?.tempId;
          if (parentKey) {
            setCompanionSuppressedKeys((prev) => new Set([...prev, parentKey]));
          }
        }
      }

      onLinesChange(filtered.map((line, i) => ({ ...line, line_order: i + 1 })));
    },
    [lines, onLinesChange, displacementConfig, findRuleForTrigger, isCompanionChild, setCompanionSuppressedKeys]
  );

  const handleSelectProduct = useCallback(
    (
      index: number,
      item: { id?: string; name: string; price: number; tax_rate: number; description?: string }
    ) => {
      const updated = [...lines];
      updated[index] = calculateLineValues({
        ...updated[index],
        concept: item.name,
        description: item.description ?? "",
        unit_price: item.price,
        tax_rate: item.tax_rate,
        product_id: item.id,
      });

      // Auto-añadir companion si hay regla y no está suprimida
      if (item.id) {
        const rule = findRuleForTrigger(item.id);
        if (rule) {
          const triggerKey = updated[index].id || updated[index].tempId || String(index);
          if (!companionSuppressedRef.current.has(triggerKey)) {
            const triggerQty = updated[index].quantity;
            const companionQty = triggerQty * rule.quantityRatio;
            const companionLine = calculateLineValues({
              tempId: crypto.randomUUID(),
              concept: rule.companionName,
              description: "",
              quantity: companionQty,
              unit_price: rule.companionSalePrice,
              tax_rate: rule.companionTaxRate,
              discount_percent: 0,
              product_id: rule.companionProductId,
              line_order: updated.length + 1,
            });
            // Reemplazar companion existente o insertar justo después
            const existingCompanionIdx = updated.findIndex(
              (l, i) => i > index && l.product_id === rule.companionProductId
            );
            if (existingCompanionIdx >= 0) {
              updated[existingCompanionIdx] = companionLine;
              if (existingCompanionIdx !== index + 1) {
                const [removed] = updated.splice(existingCompanionIdx, 1);
                updated.splice(index + 1, 0, removed);
              }
            } else {
              updated.splice(index + 1, 0, companionLine);
            }
          }
        }
      }

      onLinesChange(updated.map((l, i) => ({ ...l, line_order: i + 1 })));
      if (item.description) {
        const key = updated[index].id || updated[index].tempId || String(index);
        setExpandedLines((prev) => new Set([...prev, key]));
      }
    },
    [lines, onLinesChange, calculateLineValues, findRuleForTrigger, companionSuppressedRef]
  );

  const getDisplayValue = (index: number, field: string, value: number): string => {
    const key = `${index}-${field}`;
    if (editingValues[key] !== undefined) return editingValues[key];
    return value === 0 ? "" : fmt(value);
  };

  const handleNumericChange = (
    index: number,
    field: "quantity" | "unit_price" | "discount_percent",
    raw: string
  ) => {
    setEditingValues((prev) => ({ ...prev, [`${index}-${field}`]: raw }));
    updateLine(index, field, parseDecimalInput(raw));
  };

  const handleNumericBlur = (index: number, field: string) => {
    setEditingValues((prev) => {
      const copy = { ...prev };
      delete copy[`${index}-${field}`];
      return copy;
    });
  };

  // Totales (excluir sub-secciones para que no dupliquen — en realidad sí se incluyen porque son líneas facturables)
  const totals = useMemo(() => {
    const subtotal = lines.reduce((acc, l) => acc + l.subtotal, 0);
    const total = lines.reduce((acc, l) => acc + l.total, 0);
    const taxMap = new Map<number, { label: string; amount: number }>();
    for (const line of lines) {
      const existing = taxMap.get(line.tax_rate);
      if (existing) {
        existing.amount += line.tax_amount;
      } else {
        const opt = taxOptions.find((o) => o.value === line.tax_rate);
        taxMap.set(line.tax_rate, {
          label: opt?.label ?? `IVA ${line.tax_rate}%`,
          amount: line.tax_amount,
        });
      }
    }
    return { subtotal, total, taxGroups: [...taxMap.values()] };
  }, [lines, taxOptions]);

  const inputBase = "h-8 px-2 bg-transparent border-0 text-sm focus:outline-none focus:ring-0 w-full";
  const numInput = cn(inputBase, "text-right tabular-nums font-medium text-foreground");

  // IDs de líneas normales (no sub-secciones) para el contexto de drag
  const sortableIds = lines
    .filter((_, i) => !isDisplacementChild(lines, i, displacementConfig) && !isCompanionChild(lines, i))
    .map((l) => l.id || l.tempId || "");

  return (
    <div className={cn("space-y-3", className)}>
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Cabecera de columnas */}
        <div className={`grid ${GRID} bg-muted/40 border-b border-border`}>
          {[
            { label: "", cls: "" },
            { label: "Concepto", cls: "px-3" },
            { label: "Cant.", cls: "px-2 text-right" },
            { label: "Precio", cls: "px-2 text-right" },
            { label: "Dto %", cls: "px-2 text-right" },
            { label: "Impuesto", cls: "px-2 text-center" },
            { label: "Total", cls: "px-2 text-right" },
            { label: "", cls: "" },
          ].map((col, i) => (
            <div
              key={i}
              className={cn(
                "py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider",
                col.cls
              )}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Filas */}
        <div className="divide-y divide-border/50">
          {lines.length === 0 ? (
            <div
              className={`grid ${GRID} items-center cursor-pointer hover:bg-muted/20 transition-colors`}
              onClick={addLine}
            >
              <div />
              <div className="px-3 py-3 text-sm text-muted-foreground/40">
                + Escribe el concepto o usa @ para buscar en el catálogo...
              </div>
              <div className="col-span-6" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortableIds}
                strategy={verticalListSortingStrategy}
              >
                {lines.map((line, index) => {
                  const lineKey = line.id || line.tempId || String(index);
                  const isChild = isDisplacementChild(lines, index);
                  const isCompChild = isCompanionChild(lines, index);

                  // ── Sub-sección de acompañante ─────────────────────────────
                  if (isCompChild) {
                    return (
                      <div key={`${lineKey}-companion`} className={`grid ${GRID} items-center bg-muted/20 border-l-2 border-l-blue-400/50`}>
                        {/* Conector visual */}
                        <div className="flex justify-center">
                          <div className="w-px h-full bg-border/40" />
                        </div>

                        {/* Concepto con icono */}
                        <div className="px-1 py-2 flex items-center gap-1.5 min-w-0 pl-3">
                          <Link2 className="w-3 h-3 text-blue-400/70 shrink-0" />
                          <span className="text-xs text-muted-foreground font-medium truncate">
                            {line.concept}
                          </span>
                        </div>

                        {/* Cantidad */}
                        <div className="py-2 text-right text-xs text-muted-foreground tabular-nums pr-2">
                          {line.quantity}
                        </div>

                        {/* Precio */}
                        <div className="py-2 text-right text-xs text-muted-foreground tabular-nums pr-2">
                          {line.unit_price}€
                        </div>

                        {/* Dto — vacío */}
                        <div />

                        {/* Impuesto — vacío */}
                        <div />

                        {/* Total */}
                        <div className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground tabular-nums">
                          {line.total.toFixed(2)}€
                        </div>

                        {/* Descartar */}
                        <div className="flex justify-center py-2">
                          <button
                            onClick={() => removeLine(index)}
                            className="p-1 text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors"
                            title="No incluir producto acompañante en este documento"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // ── Sub-sección de desplazamiento ─────────────────────────
                  if (isChild) {
                    return (
                      <div key={lineKey} className={`grid ${GRID} items-center bg-muted/20 border-l-2 border-l-orange-300/50`}>
                        {/* Conector visual */}
                        <div className="flex justify-center">
                          <div className="w-px h-full bg-border/40" />
                        </div>

                        {/* Concepto con icono */}
                        <div className="px-1 py-2 flex items-center gap-1.5 min-w-0 pl-3">
                          <Clock className="w-3 h-3 text-orange-400/70 shrink-0" />
                          <span className="text-xs text-muted-foreground font-medium truncate">
                            {line.concept}
                          </span>
                        </div>

                        {/* Cantidad */}
                        <div className="py-2 text-right text-xs text-muted-foreground tabular-nums pr-2">
                          {fmt(line.quantity)} h
                        </div>

                        {/* Precio */}
                        <div className="py-2 text-right text-xs text-muted-foreground tabular-nums pr-2">
                          {fmt(line.unit_price)}€
                        </div>

                        {/* Dto — vacío */}
                        <div />

                        {/* Impuesto — vacío */}
                        <div />

                        {/* Total */}
                        <div className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground tabular-nums">
                          {fmt(line.total)}€
                        </div>

                        {/* Descartar */}
                        <div className="flex justify-center py-2">
                          <button
                            onClick={() => removeLine(index)}
                            className="p-1 text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors"
                            title="No cobrar horas de desplazamiento en este documento"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // ── Fila normal ───────────────────────────────────────────
                  const isExpanded = expandedLines.has(lineKey);

                  return (
                    <SortableRow key={lineKey} id={lineKey}>
                      {(dragHandleProps) => (
                        <div className="group">
                          <div
                            className={`grid ${GRID} items-center hover:bg-muted/25 transition-colors`}
                          >
                            {/* Drag handle */}
                            <div className="flex justify-center py-2.5">
                              <button
                                {...dragHandleProps}
                                className="cursor-grab active:cursor-grabbing text-muted-foreground/25 group-hover:text-muted-foreground/60 transition-colors"
                                title="Arrastrar para reordenar"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Concepto */}
                            <div className="px-1 py-1.5 flex items-center gap-0.5 min-w-0">
                              <ProductSearchInput
                                value={line.concept}
                                onChange={(value) => updateLine(index, "concept", value)}
                                onSelectItem={(item) => handleSelectProduct(index, item)}
                                placeholder="Concepto o @buscar"
                                className={cn(inputBase, "flex-1 min-w-0")}
                              />
                              <button
                                onClick={() => toggleExpand(lineKey)}
                                className={cn(
                                  "flex-shrink-0 p-0.5 rounded transition-all duration-150",
                                  isExpanded
                                    ? "text-primary opacity-100"
                                    : "text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100"
                                )}
                                title={isExpanded ? "Ocultar descripción" : "Añadir descripción"}
                              >
                                <ChevronDown
                                  className={cn(
                                    "w-3.5 h-3.5 transition-transform duration-150",
                                    isExpanded && "rotate-180"
                                  )}
                                />
                              </button>
                            </div>

                            {/* Cantidad */}
                            <div className="py-1.5">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={getDisplayValue(index, "quantity", line.quantity)}
                                onChange={(e) =>
                                  handleNumericChange(index, "quantity", e.target.value)
                                }
                                onBlur={() => handleNumericBlur(index, "quantity")}
                                placeholder="1"
                                className={numInput}
                              />
                            </div>

                            {/* Precio unitario */}
                            <div className="py-1.5">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={getDisplayValue(index, "unit_price", line.unit_price)}
                                onChange={(e) =>
                                  handleNumericChange(index, "unit_price", e.target.value)
                                }
                                onBlur={() => handleNumericBlur(index, "unit_price")}
                                placeholder="0"
                                className={numInput}
                              />
                            </div>

                            {/* Descuento % */}
                            <div className="py-1.5 flex items-center">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={getDisplayValue(
                                  index,
                                  "discount_percent",
                                  line.discount_percent
                                )}
                                onChange={(e) =>
                                  handleNumericChange(index, "discount_percent", e.target.value)
                                }
                                onBlur={() => handleNumericBlur(index, "discount_percent")}
                                placeholder="0"
                                className={cn(numInput, "pr-0.5")}
                              />
                              <span className="text-muted-foreground/60 text-xs pr-1.5 flex-shrink-0">
                                %
                              </span>
                            </div>

                            {/* Impuesto */}
                            <div className="px-1 py-1.5 flex justify-center">
                              <select
                                value={line.tax_rate.toString()}
                                onChange={(e) =>
                                  updateLine(index, "tax_rate", parseFloat(e.target.value))
                                }
                                className="h-7 px-1.5 bg-muted/60 border-0 rounded text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
                              >
                                {taxOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value.toString()}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Total línea */}
                            <div className="px-2 py-2.5 text-right text-sm font-semibold text-foreground tabular-nums">
                              {fmt(line.total)}€
                            </div>

                            {/* Eliminar */}
                            <div className="flex justify-center py-1.5">
                              <button
                                onClick={() => removeLine(index)}
                                className="p-1 text-muted-foreground/25 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                title="Eliminar línea"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Descripción expandible */}
                          {isExpanded && (
                            <div className="pl-9 pr-10 pb-2.5 pt-1 bg-muted/10 border-t border-border/40">
                              <textarea
                                value={line.description ?? ""}
                                onChange={(e) =>
                                  updateLine(index, "description", e.target.value)
                                }
                                placeholder="Descripción detallada (se incluye en el PDF)..."
                                className="w-full text-xs text-muted-foreground bg-transparent border border-border/60 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/60 placeholder:text-muted-foreground/35"
                                rows={2}
                                // eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </SortableRow>
                  );
                })}
              </SortableContext>
            </DndContext>
          )}

          {/* Añadir línea */}
          {lines.length > 0 && (
            <div
              className={`grid ${GRID} items-center cursor-pointer hover:bg-muted/20 transition-colors`}
              onClick={addLine}
            >
              <div />
              <div className="px-3 py-2.5">
                <span className="text-sm text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                  + Añadir línea
                </span>
              </div>
              <div className="col-span-6" />
            </div>
          )}
        </div>
      </div>

      {/* Footer: botón añadir + totales */}
      <div className="flex items-start justify-between gap-6">
        <Button
          variant="outline"
          size="sm"
          onClick={addLine}
          className="gap-1.5 text-muted-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir línea
        </Button>

        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground tabular-nums">
              {fmt(totals.subtotal)}€
            </span>
          </div>
          {totals.taxGroups.map((tg) => (
            <div key={tg.label} className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">{tg.label}</span>
              <span className="font-medium text-foreground tabular-nums">
                {fmt(tg.amount)}€
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center py-2 border-t border-border">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-foreground text-base tabular-nums">
              {fmt(totals.total)}€
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
