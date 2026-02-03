import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Trash2, Plus, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface TicketLine {
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
  // Campo para indicar si el precio introducido incluye IVA
  price_includes_tax?: boolean;
}

interface TaxOption {
  value: number;
  label: string;
}

interface TicketLinesEditorProps {
  lines: TicketLine[];
  onChange: (lines: TicketLine[]) => void;
  disabled?: boolean;
  // Modo global de entrada de precios (IVA incluido o no)
  priceIncludesTax: boolean;
  onPriceIncludesTaxChange: (value: boolean) => void;
}

const TicketLinesEditor: React.FC<TicketLinesEditorProps> = ({
  lines,
  onChange,
  disabled = false,
  priceIncludesTax,
  onPriceIncludesTaxChange,
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

      // Solo mostrar IVA (rate >= 0), excluir IRPF (rate < 0)
      const options: TaxOption[] = (data || [])
        .filter((t: any) => t.is_active && t.rate >= 0)
        .map((t: any) => ({
          value: t.rate,
          label: t.name,
        }));

      setTaxOptions(options.length > 0 ? options : [{ value: 21, label: "IVA 21%" }]);

      const defaultTax = (data || []).find((t: any) => t.is_default && t.is_active && t.rate >= 0);
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

  /**
   * Calcula los valores de la línea
   * Si priceIncludesTax es true, el precio unitario introducido INCLUYE IVA
   * y debemos calcular el subtotal "hacia atrás"
   */
  const calculateLineValues = (line: Partial<TicketLine>, includesTax: boolean): TicketLine => {
    const quantity = line.quantity || 0;
    const inputPrice = line.unit_price || 0; // Precio introducido por el usuario
    const discountPercent = line.discount_percent || 0;
    const taxRate = line.tax_rate !== undefined && line.tax_rate !== null ? line.tax_rate : defaultTaxRate;

    let subtotal: number;
    let taxAmount: number;
    let total: number;
    let unitPrice: number;

    if (includesTax) {
      // El precio introducido INCLUYE IVA (ej. 1,50 del ticket)
      // Total por línea = cantidad * precio_con_iva
      const lineTotal = quantity * inputPrice;
      
      // Aplicar descuento al total
      const discountAmount = (lineTotal * discountPercent) / 100;
      total = Math.round((lineTotal - discountAmount) * 100) / 100;
      
      // Calcular subtotal (base imponible) desde el total
      // total = subtotal * (1 + taxRate / 100)  =>  subtotal = total / (1 + taxRate / 100)
      subtotal = total / (1 + taxRate / 100);
      taxAmount = Math.round((total - subtotal) * 100) / 100;
      
      // Precio unitario SIN IVA: guardar con 4 decimales para que al recalcular
      // en backend (total = unit_price * quantity * (1+tax)) coincida el total con el ticket.
      // Si redondeamos a 2 (ej. 1,37), el backend devuelve 1,37*1,10 = 1,51 en vez de 1,50.
      unitPrice = quantity ? subtotal / quantity : 0;
      unitPrice = Math.round(unitPrice * 10000) / 10000;
    } else {
      // El precio introducido NO incluye IVA (modo normal)
      unitPrice = inputPrice;
      
      // Calculate subtotal (before discount)
      const lineSubtotal = quantity * unitPrice;
      
      // Apply discount
      const discountAmount = (lineSubtotal * discountPercent) / 100;
      subtotal = lineSubtotal - discountAmount;
      
      // Calculate tax (IVA)
      taxAmount = (subtotal * taxRate) / 100;
      
      // Total = subtotal + IVA
      total = subtotal + taxAmount;
    }

    return {
      ...line,
      concept: line.concept || "",
      description: line.description || null,
      quantity,
      // Con IVA incluido usamos 4 decimales en unit_price para que el backend no cambie el total
      unit_price: includesTax ? unitPrice : Math.round(unitPrice * 100) / 100,
      tax_rate: taxRate,
      discount_percent: discountPercent,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      price_includes_tax: includesTax,
    } as TicketLine;
  };

  const addLine = () => {
    const newLine = calculateLineValues({
      tempId: crypto.randomUUID(),
      concept: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: defaultTaxRate,
      discount_percent: 0,
    }, priceIncludesTax);
    onChange([...lines, newLine]);
  };

  const updateLine = (index: number, field: keyof TicketLine, value: any) => {
    const updatedLines = [...lines];
    updatedLines[index] = calculateLineValues({
      ...updatedLines[index],
      [field]: value,
    }, priceIncludesTax);
    onChange(updatedLines);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  // Recalcular todas las líneas cuando cambia el modo de IVA
  useEffect(() => {
    if (lines.length > 0) {
      const recalculatedLines = lines.map(line => 
        calculateLineValues(line, priceIncludesTax)
      );
      onChange(recalculatedLines);
    }
  }, [priceIncludesTax]);

  // Helper: Parse input value (handles both . and , as decimal separator)
  const parseNumericInput = (value: string): number => {
    if (!value || value === '') return 0;

    let cleaned = value.trim();

    // Count dots and commas
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

  const handleNumericInputChange = (
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
  };

  const getNumericDisplayValue = (
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
      {/* Header con selector de modo IVA */}
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-sm font-medium">Líneas del ticket</Label>
        <div className="flex items-center gap-4">
          {/* Selector de modo IVA incluido */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Precio con IVA incluido</span>
            </div>
            <Switch
              checked={priceIncludesTax}
              onCheckedChange={onPriceIncludesTaxChange}
              disabled={disabled}
            />
          </div>
          
          {!disabled && (
            <Button
              type="button"
              onClick={addLine}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Añadir línea
            </Button>
          )}
        </div>
      </div>

      {/* Indicador visual del modo actual */}
      <div className={cn(
        "text-xs px-3 py-1.5 rounded-md inline-flex items-center gap-1.5",
        priceIncludesTax 
          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
      )}>
        {priceIncludesTax ? (
          <>
            <span>💡</span>
            <span>Introduce el importe TOTAL (con IVA). Se calculará la base imponible automáticamente.</span>
          </>
        ) : (
          <>
            <span>📝</span>
            <span>Introduce el precio unitario SIN IVA. Se sumará el IVA al total.</span>
          </>
        )}
      </div>

      <div className="border border-white/10 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/5 border-b border-white/10">
              <TableHead className="text-white/70 text-xs font-medium w-[300px]">Concepto</TableHead>
              <TableHead className="text-white/70 text-xs font-medium w-[80px] text-center">Cant.</TableHead>
              <TableHead className="text-white/70 text-xs font-medium w-[120px] text-right">
                {priceIncludesTax ? "Precio (IVA incl.)" : "Precio Unit."}
              </TableHead>
              <TableHead className="text-white/70 text-xs font-medium w-[90px] text-right">IVA %</TableHead>
              <TableHead className="text-white/70 text-xs font-medium w-[100px] text-right">Base Imp.</TableHead>
              <TableHead className="text-white/70 text-xs font-medium w-[100px] text-right">Total</TableHead>
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
                <TableRow key={line.tempId || line.id} className="border-b border-border/50">
                  <TableCell>
                    {disabled ? (
                      <span className="text-sm text-foreground">{line.concept || "-"}</span>
                    ) : (
                      <Input
                        type="text"
                        value={line.concept}
                        onChange={(e) => updateLine(index, "concept", e.target.value)}
                        placeholder="Descripción del gasto"
                        className="text-sm h-9"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {disabled ? (
                      <span className="text-sm text-foreground text-center block">{line.quantity}</span>
                    ) : (
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
                        className="text-sm h-9 text-center"
                        placeholder="1"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {disabled ? (
                      <span className="text-sm text-foreground text-right block">{formatCurrency(line.unit_price)}</span>
                    ) : (
                      <Input
                        type="text"
                        value={getNumericDisplayValue(
                          priceIncludesTax ? line.total / (line.quantity || 1) : line.unit_price, 
                          'unit_price', 
                          index
                        )}
                        onChange={(e) => handleNumericInputChange(e.target.value, 'unit_price', index)}
                        onBlur={() => {
                          const inputKey = `${index}-unit_price`;
                          setNumericInputValues(prev => {
                            const newValues = { ...prev };
                            delete newValues[inputKey];
                            return newValues;
                          });
                        }}
                        className={cn(
                          "text-sm h-9 text-right",
                          priceIncludesTax && "bg-blue-500/5 border-blue-500/20"
                        )}
                        placeholder="0,00"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {disabled ? (
                      <span className="text-sm text-foreground text-right block">{line.tax_rate}%</span>
                    ) : (
                      <Select
                        value={line.tax_rate.toString()}
                        onValueChange={(value) => updateLine(index, "tax_rate", parseFloat(value))}
                      >
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {taxOptions.map((tax) => (
                            <SelectItem key={tax.value} value={tax.value.toString()}>
                              {tax.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {formatCurrency(line.subtotal)}
                  </TableCell>
                  <TableCell className="text-right text-foreground font-medium">
                    {formatCurrency(line.total)}
                  </TableCell>
                  <TableCell>
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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

export default TicketLinesEditor;
