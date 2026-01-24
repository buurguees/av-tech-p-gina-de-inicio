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
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
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

  return (
    <div className={cn("document-lines-editor", className)}>
      {/* Header */}
      <div className="lines-header">
        <span className="lines-title">{title}</span>
        <span className="lines-hint">{hint}</span>
      </div>

      {/* Table */}
      <div className="lines-table-container">
        <table className="lines-table">
          <thead>
            <tr>
              {showLineNumbers && (
                <th className="col-order">#</th>
              )}
              <th className="col-concept">Concepto</th>
              {showDescription && (
                <th className="col-description">Descripción</th>
              )}
              <th className="col-quantity">Cant.</th>
              <th className="col-price">Precio</th>
              <th className="col-discount">Dto %</th>
              <th className="col-tax">IVA</th>
              <th className="col-total">Total</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.tempId || line.id || index} className="line-row">
                {/* Line Order Number */}
                {showLineNumbers && (
                  <td className="col-order">
                    <Input
                      type="number"
                      min={1}
                      max={lines.length}
                      value={index + 1}
                      onChange={(e) => {
                        const newPos = parseInt(e.target.value, 10);
                        if (!isNaN(newPos)) {
                          moveLineToPosition(index, newPos);
                        }
                      }}
                      className="order-input"
                    />
                  </td>
                )}

                {/* Concept */}
                <td className="col-concept">
                  <ProductSearchInput
                    value={line.concept}
                    onChange={(value) => updateLine(index, "concept", value)}
                    onSelectItem={(item) => handleProductSelect(index, item)}
                    placeholder="Concepto o @buscar"
                    className="concept-input"
                  />
                </td>

                {/* Description (optional) */}
                {showDescription && (
                  <td className="col-description">
                    {expandedDescriptionIndex === index ? (
                      <Textarea
                        value={line.description || ""}
                        onChange={(e) => updateLine(index, "description", e.target.value)}
                        placeholder="Descripción opcional"
                        className="description-textarea"
                        onBlur={() => setExpandedDescriptionIndex(null)}
                        autoFocus
                      />
                    ) : (
                      <Input
                        value={line.description || ""}
                        onChange={(e) => updateLine(index, "description", e.target.value)}
                        onClick={() => setExpandedDescriptionIndex(index)}
                        placeholder="Descripción"
                        className="description-input"
                        readOnly
                      />
                    )}
                  </td>
                )}

                {/* Quantity */}
                <td className="col-quantity">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={getNumericDisplayValue(line.quantity, 'quantity', index)}
                    onChange={(e) => handleNumericInputChange(e.target.value, 'quantity', index)}
                    onBlur={() => clearNumericInputValue(index, 'quantity')}
                    className="quantity-input"
                    placeholder="1"
                  />
                </td>

                {/* Unit Price */}
                <td className="col-price">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={getNumericDisplayValue(line.unit_price, 'unit_price', index)}
                    onChange={(e) => handleNumericInputChange(e.target.value, 'unit_price', index)}
                    onBlur={() => clearNumericInputValue(index, 'unit_price')}
                    className="price-input"
                    placeholder="0,00"
                  />
                </td>

                {/* Discount */}
                <td className="col-discount">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={getNumericDisplayValue(line.discount_percent || 0, 'discount_percent', index)}
                    onChange={(e) => handleNumericInputChange(e.target.value, 'discount_percent', index)}
                    onBlur={() => clearNumericInputValue(index, 'discount_percent')}
                    className="discount-input"
                    placeholder="0"
                  />
                </td>

                {/* Tax */}
                <td className="col-tax">
                  <Select
                    value={line.tax_rate.toString()}
                    onValueChange={(v) => updateLine(index, "tax_rate", parseFloat(v))}
                  >
                    <SelectTrigger className="tax-select">
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
                </td>

                {/* Total */}
                <td className="col-total">
                  <span className="total-value">{formatCurrency(line.total)}</span>
                </td>

                {/* Actions */}
                <td className="col-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(index)}
                    className="delete-btn"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Line Button */}
      <div className="lines-footer">
        <Button
          variant="outline"
          onClick={addLine}
          className="add-line-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir línea
        </Button>
      </div>
    </div>
  );
}
