import { useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Calculator } from "lucide-react";
import ProductSearchInput from "../common/ProductSearchInput";
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

// Utility functions for numeric handling
const parseNumericInput = (value: string): number => {
  if (!value || value === '') return 0;
  let cleaned = value.trim();
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;

  if (commaCount > 0) {
    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
  } else if (dotCount === 1) {
    const dotIndex = cleaned.indexOf('.');
    const afterDot = cleaned.substring(dotIndex + 1);
    if (afterDot.length <= 2 && /^\d+$/.test(afterDot)) {
      cleaned = cleaned;
    } else {
      cleaned = cleaned.replace(/\./g, '');
    }
  } else if (dotCount > 1) {
    cleaned = cleaned.replace(/\./g, '');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const formatNumericDisplay = (value: number | string): string => {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseNumericInput(value) : value;
  if (isNaN(num) || num === 0) return '';
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export default function DocumentLinesEditor({
  lines,
  onLinesChange,
  taxOptions,
  defaultTaxRate,
  showDescription = false,
  showLineNumbers = true,
  title = "Líneas del documento",
  hint = "Escribe @nombre para buscar en el catálogo",
  className,
}: DocumentLinesEditorProps) {
  const [numericInputValues, setNumericInputValues] = useState<Record<string, string>>({});
  const [expandedDescriptionIndex, setExpandedDescriptionIndex] = useState<number | null>(null);

  const calculateLineValues = useCallback((line: Partial<DocumentLine>): DocumentLine => {
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
  }, [defaultTaxRate]);

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

  const updateLine = useCallback((index: number, field: keyof DocumentLine, value: any) => {
    const updatedLines = [...lines];
    updatedLines[index] = calculateLineValues({
      ...updatedLines[index],
      [field]: value,
    });
    onLinesChange(updatedLines);
  }, [lines, onLinesChange, calculateLineValues]);

  const handleProductSelect = useCallback((
    index: number,
    item: { id: string; type: string; name: string; code: string; price: number; tax_rate: number; description?: string }
  ) => {
    const updatedLines = [...lines];
    const currentQuantity = updatedLines[index].quantity;

    const lineData = {
      ...updatedLines[index],
      concept: item.name,
      description: item.description || "",
      unit_price: item.price,
      tax_rate: item.tax_rate || defaultTaxRate,
      quantity: currentQuantity,
    };

    updatedLines[index] = calculateLineValues(lineData);
    onLinesChange(updatedLines);
  }, [lines, onLinesChange, calculateLineValues, defaultTaxRate]);

  const removeLine = useCallback((index: number) => {
    const newLines = lines.filter((_, i) => i !== index);
    // Update line_order for remaining lines
    const reorderedLines = newLines.map((line, i) => ({
      ...line,
      line_order: i + 1,
    }));
    onLinesChange(reorderedLines);
  }, [lines, onLinesChange]);

  const moveLineToPosition = useCallback((currentIndex: number, newPosition: number) => {
    if (newPosition < 1 || newPosition > lines.length) return;
    const targetIndex = newPosition - 1;
    if (targetIndex === currentIndex) return;

    const newLines = [...lines];
    const [movedLine] = newLines.splice(currentIndex, 1);
    newLines.splice(targetIndex, 0, movedLine);

    // Update line_order for all lines
    const reorderedLines = newLines.map((line, i) => ({
      ...line,
      line_order: i + 1,
    }));
    onLinesChange(reorderedLines);
  }, [lines, onLinesChange]);

  const handleNumericInputChange = useCallback((
    value: string,
    field: 'quantity' | 'unit_price' | 'discount_percent',
    index: number
  ) => {
    const inputKey = `${index}-${field}`;
    setNumericInputValues(prev => ({ ...prev, [inputKey]: value }));

    if (value === '' || value === null || value === undefined) {
      updateLine(index, field, 0);
      return;
    }

    const numericValue = parseNumericInput(value);
    updateLine(index, field, numericValue);
  }, [updateLine]);

  const getNumericDisplayValue = useCallback((
    value: number,
    field: 'quantity' | 'unit_price' | 'discount_percent',
    index: number
  ): string => {
    const inputKey = `${index}-${field}`;
    const storedValue = numericInputValues[inputKey];

    if (storedValue !== undefined) {
      return storedValue;
    }

    if (value === 0) return '';
    return formatNumericDisplay(value);
  }, [numericInputValues]);

  const clearNumericInputValue = useCallback((index: number, field: string) => {
    const inputKey = `${index}-${field}`;
    setNumericInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[inputKey];
      return newValues;
    });
  }, []);

  // Grid template columns based on whether description is shown
  const gridTemplateColumns = showDescription
    ? showLineNumbers 
      ? '60px minmax(200px, 3fr) minmax(150px, 2fr) 80px 100px 70px 90px 110px 50px'
      : 'minmax(200px, 3fr) minmax(150px, 2fr) 80px 100px 70px 90px 110px 50px'
    : showLineNumbers
      ? '60px minmax(300px, 1fr) 80px 100px 70px 90px 110px 50px'
      : 'minmax(300px, 1fr) 80px 100px 70px 90px 110px 50px';

  return (
    <div className={cn("document-lines-editor modern-lines-editor", className)}>
      {/* Header */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/30">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            {title}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium">{hint}</span>
            <Button
              variant="ghost"
              onClick={addLine}
              className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" /> Añadir concepto
            </Button>
          </div>
        </div>

        {/* Lines List */}
        <div className="divide-y divide-border/50">
          {lines.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">No hay conceptos añadidos todavía.</p>
            </div>
          ) : (
            lines.map((line, index) => (
              <div
                key={line.tempId || line.id || index}
                className="p-6 hover:bg-accent/50 transition-colors group"
              >
                <div className="grid grid-cols-12 gap-4 items-start">
                  {/* Concept and Description Column */}
                  <div className="col-span-12 md:col-span-5 space-y-3">
                    <div>
                      <ProductSearchInput
                        value={line.concept}
                        onChange={(value) => updateLine(index, "concept", value)}
                        onSelectItem={(item) => handleProductSelect(index, item)}
                        placeholder="Concepto (ej: Diseño Web)"
                        className="modern-concept-input"
                      />
                    </div>
                    {showDescription && (
                      <div>
                        {expandedDescriptionIndex === index ? (
                          <Textarea
                            value={line.description || ""}
                            onChange={(e) => updateLine(index, "description", e.target.value)}
                            placeholder="Descripción detallada del servicio..."
                            className="modern-description-textarea"
                            onBlur={() => setExpandedDescriptionIndex(null)}
                            autoFocus
                          />
                        ) : (
                          <input
                            type="text"
                            value={line.description || ""}
                            onChange={(e) => updateLine(index, "description", e.target.value)}
                            onClick={() => setExpandedDescriptionIndex(index)}
                            placeholder="Descripción detallada del servicio..."
                            className="modern-description-input"
                            readOnly
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Numeric Fields Column */}
                  <div className="col-span-12 md:col-span-6 grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block text-center">Cant.</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={getNumericDisplayValue(line.quantity, 'quantity', index)}
                        onChange={(e) => handleNumericInputChange(e.target.value, 'quantity', index)}
                        onBlur={() => clearNumericInputValue(index, 'quantity')}
                        className="modern-numeric-input"
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block text-center">Precio</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={getNumericDisplayValue(line.unit_price, 'unit_price', index)}
                        onChange={(e) => handleNumericInputChange(e.target.value, 'unit_price', index)}
                        onBlur={() => clearNumericInputValue(index, 'unit_price')}
                        className="modern-numeric-input"
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block text-center">IVA %</span>
                      <Select
                        value={line.tax_rate.toString()}
                        onValueChange={(v) => updateLine(index, "tax_rate", parseFloat(v))}
                      >
                        <SelectTrigger className="modern-tax-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="tax-select-content">
                          {taxOptions.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value.toString()}
                              className="tax-select-item"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block text-center">Total</span>
                      <div className="w-full py-1.5 text-right font-bold text-foreground text-sm">
                        {formatCurrency(line.total)}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="col-span-12 md:col-span-1 flex justify-end pt-6 md:pt-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(index)}
                      className="p-2 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
