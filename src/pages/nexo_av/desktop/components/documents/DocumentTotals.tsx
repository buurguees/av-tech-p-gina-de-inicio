import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { DocumentLine, TaxOption } from "./DocumentLinesEditor";

interface TaxBreakdown {
  rate: number;
  amount: number;
  label: string;
}

interface TotalsData {
  subtotal: number;
  taxes: TaxBreakdown[];
  total: number;
}

interface DocumentTotalsProps {
  lines: DocumentLine[];
  taxOptions: TaxOption[];
  className?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export default function DocumentTotals({
  lines,
  taxOptions,
  className,
}: DocumentTotalsProps) {
  const totals = useMemo((): TotalsData => {
    const subtotal = lines.reduce((acc, line) => acc + line.subtotal, 0);
    const total = lines.reduce((acc, line) => acc + line.total, 0);

    // Group taxes by rate
    const taxesByRate: Record<number, TaxBreakdown> = {};
    lines.forEach((line) => {
      if (line.tax_amount !== 0) {
        if (!taxesByRate[line.tax_rate]) {
          const taxOption = taxOptions.find((t) => t.value === line.tax_rate);
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
  }, [lines, taxOptions]);

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl shadow-sm p-6 w-full sm:w-80",
        className
      )}
    >
      <div className="space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-base text-muted-foreground">Base imponible</span>
          <span className="text-base font-semibold text-foreground">
            {formatCurrency(totals.subtotal)}
          </span>
        </div>

        {/* Tax breakdown */}
        {totals.taxes.map((tax) => (
          <div key={tax.rate} className="flex justify-between items-center">
            <span className="text-base text-muted-foreground">{tax.label}</span>
            <span className="text-base font-medium text-foreground">
              {formatCurrency(tax.amount)}
            </span>
          </div>
        ))}

        {/* Divider */}
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-foreground">Total</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(totals.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
