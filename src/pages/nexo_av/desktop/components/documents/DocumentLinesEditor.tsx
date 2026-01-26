import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Search, GripVertical, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  showDescription?: boolean;
  className?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function DocumentLinesEditor({
  lines,
  onLinesChange,
  taxOptions,
  defaultTaxRate,
  showDescription = true,
  className,
}: DocumentLinesEditorProps) {
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const calculateLineValues = useCallback(
    (line: Partial<DocumentLine>): DocumentLine => {
      const quantity = line.quantity || 0;
      const unitPrice = line.unit_price || 0;
      const discountPercent = line.discount_percent || 0;
      const taxRate = line.tax_rate || defaultTaxRate;

      const subtotal = quantity * unitPrice * (1 - discountPercent / 100);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      return {
        ...line,
        concept: line.concept || "",
        description: line.description || "",
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
    (index: number, field: keyof DocumentLine, value: any) => {
      const updatedLines = [...lines];
      updatedLines[index] = calculateLineValues({
        ...updatedLines[index],
        [field]: value,
      });
      onLinesChange(updatedLines);
    },
    [lines, onLinesChange, calculateLineValues]
  );

  const removeLine = useCallback(
    (index: number) => {
      onLinesChange(lines.filter((_, i) => i !== index).map((line, i) => ({ ...line, line_order: i + 1 })));
    },
    [lines, onLinesChange]
  );

  const parseNumber = (value: string): number => {
    if (!value) return 0;
    const cleaned = value.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleNumericBlur = (index: number, field: string) => {
    setEditingValues((prev) => {
      const copy = { ...prev };
      delete copy[`${index}-${field}`];
      return copy;
    });
  };

  const getDisplayValue = (index: number, field: string, value: number): string => {
    const key = `${index}-${field}`;
    if (editingValues[key] !== undefined) return editingValues[key];
    return value === 0 ? "" : formatCurrency(value);
  };

  // Totals calculation
  const totals = useMemo(() => {
    const subtotal = lines.reduce((acc, l) => acc + l.subtotal, 0);
    const taxAmount = lines.reduce((acc, l) => acc + l.tax_amount, 0);
    const total = lines.reduce((acc, l) => acc + l.total, 0);
    return { subtotal, taxAmount, total };
  }, [lines]);

  // Input styles
  const inputBase = "w-full h-9 px-3 bg-transparent border-0 text-sm focus:outline-none focus:ring-0";
  const numericInput = cn(inputBase, "text-right tabular-nums");

  return (
    <div className={cn("space-y-4", className)}>
      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_1fr_100px_100px_120px_100px_40px] bg-muted/50 border-b border-border">
          <div className="px-2 py-3"></div>
          <div className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Concepto
          </div>
          {showDescription && (
            <div className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Descripción
            </div>
          )}
          <div className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
            Cantidad
          </div>
          <div className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
            Precio
          </div>
          <div className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
            Impuestos
          </div>
          <div className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
            Total
          </div>
          <div className="px-2 py-3"></div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border">
          {lines.length === 0 ? (
            // Empty state row
            <div
              className="grid grid-cols-[40px_1fr_1fr_100px_100px_120px_100px_40px] items-center hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={addLine}
            >
              <div className="px-2 py-3 flex justify-center">
                <GripVertical className="w-4 h-4 text-muted-foreground/30" />
              </div>
              <div className="px-1 py-2">
                <div className="flex items-center gap-2 px-2">
                  <input
                    type="text"
                    placeholder="Escribe el concepto o usa @ para buscar"
                    className={cn(inputBase, "text-muted-foreground/60 placeholder:text-muted-foreground/40")}
                    readOnly
                  />
                  <Search className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                </div>
              </div>
              <div className="px-1 py-2">
                <input
                  type="text"
                  placeholder="Desc"
                  className={cn(inputBase, "text-muted-foreground/60")}
                  readOnly
                />
              </div>
              <div className="px-1 py-2">
                <span className="block text-right text-sm text-primary">1</span>
              </div>
              <div className="px-1 py-2">
                <span className="block text-right text-sm text-primary">0</span>
              </div>
              <div className="px-1 py-2 flex justify-center">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs text-muted-foreground">
                  × IVA 21%
                </span>
              </div>
              <div className="px-3 py-2 text-right text-sm text-muted-foreground">0</div>
              <div className="px-2 py-2"></div>
            </div>
          ) : (
            lines.map((line, index) => (
              <div
                key={line.tempId || line.id || index}
                className="grid grid-cols-[40px_1fr_1fr_100px_100px_120px_100px_40px] items-center hover:bg-muted/30 transition-colors group"
              >
                {/* Drag handle */}
                <div className="px-2 py-3 flex justify-center cursor-grab">
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
                </div>

                {/* Concept */}
                <div className="px-1 py-2">
                  <div className="flex items-center gap-2 px-2">
                    <input
                      type="text"
                      value={line.concept}
                      onChange={(e) => updateLine(index, "concept", e.target.value)}
                      placeholder="Escribe el concepto o usa @ para buscar"
                      className={cn(inputBase, "flex-1")}
                    />
                    <Search className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  </div>
                </div>

                {/* Description */}
                {showDescription && (
                  <div className="px-1 py-2">
                    <textarea
                      value={line.description || ""}
                      onChange={(e) => updateLine(index, "description", e.target.value)}
                      placeholder="Desc"
                      className={cn(inputBase, "resize-none h-9 py-2")}
                      rows={1}
                    />
                  </div>
                )}

                {/* Quantity */}
                <div className="px-1 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={getDisplayValue(index, "quantity", line.quantity)}
                    onChange={(e) => {
                      setEditingValues((prev) => ({ ...prev, [`${index}-quantity`]: e.target.value }));
                      updateLine(index, "quantity", parseNumber(e.target.value));
                    }}
                    onBlur={() => handleNumericBlur(index, "quantity")}
                    placeholder="1"
                    className={cn(numericInput, "text-primary font-medium")}
                  />
                </div>

                {/* Price */}
                <div className="px-1 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={getDisplayValue(index, "unit_price", line.unit_price)}
                    onChange={(e) => {
                      setEditingValues((prev) => ({ ...prev, [`${index}-unit_price`]: e.target.value }));
                      updateLine(index, "unit_price", parseNumber(e.target.value));
                    }}
                    onBlur={() => handleNumericBlur(index, "unit_price")}
                    placeholder="0"
                    className={cn(numericInput, "text-primary font-medium")}
                  />
                </div>

                {/* Tax */}
                <div className="px-1 py-2 flex justify-center">
                  <select
                    value={line.tax_rate.toString()}
                    onChange={(e) => updateLine(index, "tax_rate", parseFloat(e.target.value))}
                    className="h-8 px-2 bg-muted border-0 rounded text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {taxOptions.map((opt) => (
                      <option key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Total */}
                <div className="px-3 py-2 text-right text-sm font-medium text-foreground tabular-nums">
                  {formatCurrency(line.total)}
                </div>

                {/* Delete */}
                <div className="px-2 py-2 flex justify-center">
                  <button
                    onClick={() => removeLine(index)}
                    className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Add line row (if there are already lines) */}
          {lines.length > 0 && (
            <div
              className="grid grid-cols-[40px_1fr_1fr_100px_100px_120px_100px_40px] items-center hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={addLine}
            >
              <div className="px-2 py-3 flex justify-center">
                <GripVertical className="w-4 h-4 text-muted-foreground/20" />
              </div>
              <div className="px-3 py-2">
                <span className="text-sm text-muted-foreground/50">+ Añadir línea</span>
              </div>
              <div className="col-span-6"></div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Add Line button and Totals */}
      <div className="flex items-start justify-between gap-6">
        {/* Left side - Add line button */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addLine} className="gap-1">
            Añadir línea
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>

        {/* Right side - Totals */}
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground tabular-nums">{formatCurrency(totals.subtotal)}€</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground">IVA</span>
            <span className="font-medium text-foreground tabular-nums">{formatCurrency(totals.taxAmount)}€</span>
          </div>
          <div className="flex justify-between items-center py-2 border-t border-border">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-foreground text-lg tabular-nums">{formatCurrency(totals.total)}€</span>
          </div>
        </div>
      </div>
    </div>
  );
}
