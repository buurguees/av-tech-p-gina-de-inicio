import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProductSearchInput from "./ProductSearchInput";

export interface PurchaseInvoiceLine {
  id?: string;
  tempId?: string;
  concept: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

interface TaxOption {
  value: number;
  label: string;
}

interface PurchaseInvoiceLinesEditorProps {
  lines: PurchaseInvoiceLine[];
  onChange: (lines: PurchaseInvoiceLine[]) => void;
}

const PurchaseInvoiceLinesEditor: React.FC<PurchaseInvoiceLinesEditorProps> = ({
  lines,
  onChange,
}) => {
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(21);
  const [numericInputValues, setNumericInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    try {
      const { data, error } = await supabase.rpc("list_taxes", { p_tax_type: "purchase" });
      if (error) throw error;

      const options: TaxOption[] = (data || [])
        .filter((t: any) => t.is_active)
        .map((t: any) => ({
          value: t.rate,
          label: t.name,
        }));

      setTaxOptions(options.length > 0 ? options : [{ value: 21, label: "IVA 21%" }]);

      const defaultTax = (data || []).find((t: any) => t.is_default && t.is_active);
      if (defaultTax) {
        setDefaultTaxRate(defaultTax.rate);
      } else if (options.length > 0) {
        setDefaultTaxRate(options[0].value);
      }
    } catch (error) {
      console.error("Error fetching taxes:", error);
      setTaxOptions([{ value: 21, label: "IVA 21%" }]);
    }
  };

  const calculateLineValues = (line: Partial<PurchaseInvoiceLine>): PurchaseInvoiceLine => {
    const quantity = line.quantity || 0;
    const unitPrice = line.unit_price || 0;
    const discountPercent = line.discount_percent || 0;
    const taxRate = line.tax_rate || defaultTaxRate;

    // Calculate subtotal (before discount)
    const lineSubtotal = quantity * unitPrice;
    
    // Apply discount
    const discountAmount = (lineSubtotal * discountPercent) / 100;
    const subtotal = lineSubtotal - discountAmount;
    
    // Calculate tax
    const taxAmount = (subtotal * taxRate) / 100;
    
    // Total
    const total = subtotal + taxAmount;

    return {
      ...line,
      concept: line.concept || "",
      description: line.description || null,
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      discount_percent: discountPercent,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    } as PurchaseInvoiceLine;
  };

  const addLine = () => {
    const newLine = calculateLineValues({
      tempId: crypto.randomUUID(),
      concept: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: defaultTaxRate,
      discount_percent: 0,
    });
    onChange([...lines, newLine]);
  };

  const updateLine = (index: number, field: keyof PurchaseInvoiceLine, value: any) => {
    const updatedLines = [...lines];
    updatedLines[index] = calculateLineValues({
      ...updatedLines[index],
      [field]: value,
    });
    onChange(updatedLines);
  };

  const handleProductSelect = (index: number, item: { id: string; type: string; name: string; code: string; price: number; tax_rate: number; description?: string }) => {
    const updatedLines = [...lines];
    const currentQuantity = updatedLines[index].quantity;

    const lineData = {
      ...updatedLines[index],
      concept: item.name,
      description: item.description || null,
      unit_price: item.price,
      tax_rate: item.tax_rate || defaultTaxRate,
      quantity: currentQuantity,
    };

    updatedLines[index] = calculateLineValues(lineData);
    onChange(updatedLines);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  // Helper: Parse input value (handles both . and , as decimal separator)
  const parseNumericInput = (value: string): number => {
    if (!value || value === '') return 0;

    let cleaned = value.trim();

    // Count dots and commas
    const dotCount = (cleaned.match(/\./g) || []).length;
    const commaCount = (cleaned.match(/,/g) || []).length;

    // If there's a comma, it's definitely the decimal separator (European format)
    if (commaCount > 0) {
      // Remove all dots (thousand separators) and replace comma with dot for parsing
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } else if (dotCount === 1) {
      // Single dot: check if it's likely a decimal (has digits after) or thousand separator
      const dotIndex = cleaned.indexOf('.');
      const afterDot = cleaned.substring(dotIndex + 1);

      // If there are 1-2 digits after the dot, treat it as decimal separator
      // Otherwise, treat it as thousand separator
      if (afterDot.length <= 2 && /^\d+$/.test(afterDot)) {
        // Decimal separator - keep as is for parsing
        cleaned = cleaned;
      } else {
        // Thousand separator - remove it
        cleaned = cleaned.replace(/\./g, '');
      }
    } else if (dotCount > 1) {
      // Multiple dots: all are thousand separators, remove them
      cleaned = cleaned.replace(/\./g, '');
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Helper: Format number for display (with thousand separators and comma decimal)
  const formatNumericDisplay = (value: number | string): string => {
    if (value === '' || value === null || value === undefined) return '';
    const num = typeof value === 'string' ? parseNumericInput(value) : value;
    if (isNaN(num) || num === 0) return '';

    // Format with thousand separators and comma decimal
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Helper: Handle numeric input change
  const handleNumericInputChange = (
    value: string,
    field: 'quantity' | 'unit_price' | 'discount_percent',
    index: number
  ) => {
    const inputKey = `${index}-${field}`;

    // Store the raw input value for display
    setNumericInputValues(prev => ({ ...prev, [inputKey]: value }));

    // Allow empty string for clearing
    if (value === '' || value === null || value === undefined) {
      updateLine(index, field, 0);
      return;
    }

    // Parse the value (handles both . and , as decimal separator)
    const numericValue = parseNumericInput(value);
    updateLine(index, field, numericValue);
  };

  // Get display value for numeric input
  const getNumericDisplayValue = (
    value: number,
    field: 'quantity' | 'unit_price' | 'discount_percent',
    index: number
  ): string => {
    const inputKey = `${index}-${field}`;
    const storedValue = numericInputValues[inputKey];

    // If user is typing, show what they're typing
    if (storedValue !== undefined) {
      return storedValue;
    }

    // Otherwise format the numeric value
    if (value === 0) return '';
    return formatNumericDisplay(value);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getTotals = () => {
    const subtotal = lines.reduce((acc, line) => acc + line.subtotal, 0);
    const total = lines.reduce((acc, line) => acc + line.total, 0);

    // Group taxes by rate
    const taxesByRate: Record<number, { rate: number; amount: number; label: string }> = {};
    lines.forEach((line) => {
      if (line.tax_amount !== 0) {
        if (!taxesByRate[line.tax_rate]) {
          const taxOption = taxOptions.find(t => t.value === line.tax_rate);
          taxesByRate[line.tax_rate] = {
            rate: line.tax_rate,
            amount: 0,
            label: taxOption?.label || `IVA ${line.tax_rate}%`,
          };
        }
        taxesByRate[line.tax_rate].amount += line.tax_amount;
      }
    });

    return {
      subtotal,
      taxes: Object.values(taxesByRate).sort((a, b) => b.rate - a.rate),
      total,
    };
  };

  const totals = getTotals();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-white/70 text-sm font-medium">Líneas de la factura</Label>
        <Button
          type="button"
          onClick={addLine}
          variant="outline"
          size="sm"
          className="bg-white/10 border-white/20 text-white hover:bg-white/15"
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir línea
        </Button>
      </div>

      <div className="border border-white/10 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/5 border-b border-white/10">
              <TableHead className="text-white/70 text-xs font-medium w-[300px]">Concepto</TableHead>
              <TableHead className="text-white/70 text-xs font-medium w-[80px] text-center">Cant.</TableHead>
              <TableHead className="text-white/70 text-xs font-medium w-[120px] text-right">Precio Unit.</TableHead>
              <TableHead className="text-white/70 text-xs font-medium w-[100px] text-right">Dto. %</TableHead>
              <TableHead className="text-white/70 text-xs font-medium w-[100px] text-right">IVA %</TableHead>
              <TableHead className="text-white/70 text-xs font-medium w-[120px] text-right">Total</TableHead>
              <TableHead className="text-white/70 text-xs font-medium w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-white/40 py-8">
                  No hay líneas. Haz clic en "Añadir línea" para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line, index) => (
                <TableRow key={line.tempId || line.id} className="border-b border-white/5">
                  <TableCell>
                    <ProductSearchInput
                      value={line.concept}
                      onChange={(value) => updateLine(index, "concept", value)}
                      onSelectItem={(item) => handleProductSelect(index, item)}
                      placeholder="Concepto o @buscar"
                      className="bg-white/5 border-white/10 text-white text-sm h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={getNumericDisplayValue(line.quantity, 'quantity', index)}
                      onChange={(e) => handleNumericInputChange(e.target.value, 'quantity', index)}
                      onBlur={() => {
                        const inputKey = `${index}-quantity`;
                        setNumericInputValues(prev => {
                          const newValues = { ...prev };
                          delete newValues[inputKey];
                          return newValues;
                        });
                      }}
                      className="bg-white/5 border-white/10 text-white text-sm h-9 text-center"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={getNumericDisplayValue(line.unit_price, 'unit_price', index)}
                      onChange={(e) => handleNumericInputChange(e.target.value, 'unit_price', index)}
                      onBlur={() => {
                        const inputKey = `${index}-unit_price`;
                        setNumericInputValues(prev => {
                          const newValues = { ...prev };
                          delete newValues[inputKey];
                          return newValues;
                        });
                      }}
                      className="bg-white/5 border-white/10 text-white text-sm h-9 text-right"
                      placeholder="0,00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={getNumericDisplayValue(line.discount_percent, 'discount_percent', index)}
                      onChange={(e) => handleNumericInputChange(e.target.value, 'discount_percent', index)}
                      onBlur={() => {
                        const inputKey = `${index}-discount_percent`;
                        setNumericInputValues(prev => {
                          const newValues = { ...prev };
                          delete newValues[inputKey];
                          return newValues;
                        });
                      }}
                      className="bg-white/5 border-white/10 text-white text-sm h-9 text-right"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={line.tax_rate.toString()}
                      onValueChange={(value) => updateLine(index, "tax_rate", parseFloat(value))}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-white/10">
                        {taxOptions.map((tax) => (
                          <SelectItem key={tax.value} value={tax.value.toString()}>
                            {tax.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right text-white font-medium">
                    {formatCurrency(line.total)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(index)}
                      className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totals Summary */}
      {lines.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Base imponible:</span>
            <span className="text-white font-medium">{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.taxes.map((tax) => (
            <div key={tax.rate} className="flex justify-between text-sm">
              <span className="text-white/60">{tax.label}:</span>
              <span className="text-white font-medium">{formatCurrency(tax.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
            <span className="text-white">Total:</span>
            <span className="text-white">{formatCurrency(totals.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseInvoiceLinesEditor;
