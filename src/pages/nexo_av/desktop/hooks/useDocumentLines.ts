/**
 * useDocumentLines — helpers compartidos para tablas de líneas de documentos
 * (presupuestos nuevos, edición de presupuestos, edición de facturas)
 *
 * Gestiona: estado de inputs numéricos, descripción expandida, cálculo de líneas y totales.
 * NO gestiona el array de líneas en sí (cada página lo gestiona con su propia lógica de guardado).
 */
import { useState } from "react";

interface TaxOption {
  value: number;
  label: string;
}

interface LineValues {
  concept: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  isDeleted?: boolean;
}

export function useDocumentLines(defaultTaxRate: number, taxOptions: TaxOption[]) {
  const [numericInputValues, setNumericInputValues] = useState<Record<string, string>>({});
  const [expandedDescriptionIndex, setExpandedDescriptionIndex] = useState<number | null>(null);

  function parseNumericInput(value: string): number {
    if (!value || value === "") return 0;
    let cleaned = value.trim();
    const dotCount = (cleaned.match(/\./g) || []).length;
    const commaCount = (cleaned.match(/,/g) || []).length;
    if (commaCount > 0) {
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    } else if (dotCount === 1) {
      const dotIndex = cleaned.indexOf(".");
      const afterDot = cleaned.substring(dotIndex + 1);
      if (!(afterDot.length <= 2 && /^\d+$/.test(afterDot))) {
        cleaned = cleaned.replace(/\./g, "");
      }
    } else if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, "");
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  function formatNumericDisplay(value: number | string): string {
    if (value === "" || value === null || value === undefined) return "";
    const num = typeof value === "string" ? parseNumericInput(value) : value;
    if (isNaN(num) || num === 0) return "";
    return new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  }

  function calculateLineValues<L extends Partial<LineValues>>(line: L): L & LineValues {
    const quantity = line.quantity || 0;
    const unitPrice = line.unit_price || 0;
    const discountPercent = line.discount_percent || 0;
    const taxRate = line.tax_rate ?? defaultTaxRate;
    const subtotal = Math.round(quantity * unitPrice * (1 - discountPercent / 100) * 100) / 100;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    return {
      ...line,
      concept: line.concept || "",
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      discount_percent: discountPercent,
      subtotal,
      tax_amount: taxAmount,
      total,
    } as L & LineValues;
  }

  function handleNumericInputChange(
    value: string,
    field: "quantity" | "unit_price" | "discount_percent",
    index: number,
    updateLine: (index: number, field: string, value: number) => void
  ) {
    const inputKey = `${index}-${field}`;
    setNumericInputValues((prev) => ({ ...prev, [inputKey]: value }));
    if (value === "" || value === null || value === undefined) {
      updateLine(index, field, 0);
      return;
    }
    updateLine(index, field, parseNumericInput(value));
  }

  function clearNumericInputKey(index: number, field: string) {
    const inputKey = `${index}-${field}`;
    setNumericInputValues((prev) => {
      const next = { ...prev };
      delete next[inputKey];
      return next;
    });
  }

  function getNumericDisplayValue(
    value: number,
    field: "quantity" | "unit_price" | "discount_percent",
    index: number
  ): string {
    const inputKey = `${index}-${field}`;
    const stored = numericInputValues[inputKey];
    if (stored !== undefined) return stored;
    if (value === 0) return "";
    return formatNumericDisplay(value);
  }

  function computeTotals(lines: LineValues[]) {
    const activeLines = lines.filter((l) => !l.isDeleted);
    const subtotal = activeLines.reduce((acc, l) => acc + l.subtotal, 0);
    const total = activeLines.reduce((acc, l) => acc + l.total, 0);
    const taxesByRate: Record<number, { rate: number; amount: number; label: string }> = {};
    activeLines.forEach((line) => {
      if (line.tax_amount !== 0) {
        if (!taxesByRate[line.tax_rate]) {
          const opt = taxOptions.find((t) => t.value === line.tax_rate);
          taxesByRate[line.tax_rate] = {
            rate: line.tax_rate,
            amount: 0,
            label: opt?.label || `IVA ${line.tax_rate}%`,
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
  }

  return {
    numericInputValues,
    setNumericInputValues,
    expandedDescriptionIndex,
    setExpandedDescriptionIndex,
    parseNumericInput,
    formatNumericDisplay,
    calculateLineValues,
    handleNumericInputChange,
    clearNumericInputKey,
    getNumericDisplayValue,
    computeTotals,
  };
}
