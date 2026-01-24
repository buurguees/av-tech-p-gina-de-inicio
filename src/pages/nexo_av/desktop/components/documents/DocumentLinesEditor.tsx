import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Calculator, GripVertical } from "lucide-react";
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
  showLineNumbers?: boolean;
  title?: string;
  hint?: string;
  className?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

const formatNumber = (value: number): string => {
  if (value === 0) return "";
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

const parseNumber = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export default function DocumentLinesEditor({
  lines,
  onLinesChange,
  taxOptions,
  defaultTaxRate,
  showDescription = false,
  showLineNumbers = true,
  title = "Líneas del documento",
  hint = "Añade conceptos al presupuesto",
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
      const newLines = lines.filter((_, i) => i !== index);
      const reorderedLines = newLines.map((line, i) => ({
        ...line,
        line_order: i + 1,
      }));
      onLinesChange(reorderedLines);
    },
    [lines, onLinesChange]
  );

  const handleNumericChange = (
    index: number,
    field: "quantity" | "unit_price" | "discount_percent",
    value: string
  ) => {
    const key = `${index}-${field}`;
    setEditingValues((prev) => ({ ...prev, [key]: value }));
    updateLine(index, field, parseNumber(value));
  };

  const handleNumericBlur = (index: number, field: string) => {
    const key = `${index}-${field}`;
    setEditingValues((prev) => {
      const newValues = { ...prev };
      delete newValues[key];
      return newValues;
    });
  };

  const getDisplayValue = (index: number, field: string, value: number): string => {
    const key = `${index}-${field}`;
    if (editingValues[key] !== undefined) return editingValues[key];
    return formatNumber(value);
  };

  // Input base classes
  const inputBase = cn(
    "w-full h-12 px-4 text-base bg-muted/30 border-2 border-transparent rounded-xl",
    "text-foreground placeholder:text-muted-foreground/50",
    "transition-all duration-200",
    "hover:bg-muted/50",
    "focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none"
  );

  const numericInput = cn(inputBase, "text-center font-medium");

  return (
    <section className={cn("bg-card border border-border rounded-2xl shadow-sm overflow-hidden", className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{hint}</p>
          </div>
        </div>
        <Button onClick={addLine} variant="outline" className="h-10 gap-2 font-medium">
          <Plus className="w-4 h-4" />
          Añadir línea
        </Button>
      </div>

      {/* Lines */}
      <div className="divide-y divide-border/50">
        {lines.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Sin líneas</h3>
            <p className="text-muted-foreground mb-4">Añade el primer concepto al presupuesto</p>
            <Button onClick={addLine} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Añadir línea
            </Button>
          </div>
        ) : (
          lines.map((line, index) => (
            <div
              key={line.tempId || line.id || index}
              className="p-6 hover:bg-accent/30 transition-colors group"
            >
              <div className="flex gap-4">
                {/* Order indicator */}
                {showLineNumbers && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                  </div>
                )}

                {/* Main content */}
                <div className="flex-1 space-y-4">
                  {/* Row 1: Concept and Description */}
                  <div className={cn("grid gap-4", showDescription ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Concepto
                      </label>
                      <input
                        type="text"
                        value={line.concept}
                        onChange={(e) => updateLine(index, "concept", e.target.value)}
                        placeholder="Nombre del producto o servicio"
                        className={cn(inputBase, "font-medium")}
                      />
                    </div>

                    {showDescription && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Descripción
                        </label>
                        <input
                          type="text"
                          value={line.description || ""}
                          onChange={(e) => updateLine(index, "description", e.target.value)}
                          placeholder="Descripción adicional (opcional)"
                          className={inputBase}
                        />
                      </div>
                    )}
                  </div>

                  {/* Row 2: Numeric fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Cantidad
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={getDisplayValue(index, "quantity", line.quantity)}
                        onChange={(e) => handleNumericChange(index, "quantity", e.target.value)}
                        onBlur={() => handleNumericBlur(index, "quantity")}
                        placeholder="1"
                        className={numericInput}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Precio
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={getDisplayValue(index, "unit_price", line.unit_price)}
                        onChange={(e) => handleNumericChange(index, "unit_price", e.target.value)}
                        onBlur={() => handleNumericBlur(index, "unit_price")}
                        placeholder="0,00"
                        className={numericInput}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        IVA
                      </label>
                      <Select
                        value={line.tax_rate.toString()}
                        onValueChange={(v) => updateLine(index, "tax_rate", parseFloat(v))}
                      >
                        <SelectTrigger className={cn(numericInput, "px-3")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border shadow-xl rounded-xl z-50">
                          {taxOptions.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value.toString()}
                              className="py-3 cursor-pointer"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Total
                      </label>
                      <div className="h-12 px-4 rounded-xl bg-primary/5 border-2 border-primary/20 flex items-center justify-center">
                        <span className="text-base font-bold text-primary">
                          {formatCurrency(line.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                <div className="flex-shrink-0 pt-8">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(index)}
                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
