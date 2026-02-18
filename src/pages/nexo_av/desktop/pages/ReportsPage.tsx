import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import {
  FolderOpen,
  FileSpreadsheet,
  Loader2,
  Download,
  HardDrive,
  Wrench,
} from "lucide-react";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function generateQuarterExcel(year: number, quarter: number) {
  const { data, error } = await supabase.rpc("get_fiscal_quarter_data", {
    p_year: year,
    p_quarter: quarter,
  });
  if (error || !data) throw new Error(error?.message ?? "Sin datos");

  const d = data as {
    ventas: Array<Record<string, unknown>>;
    compras: Array<Record<string, unknown>>;
    totales: Record<string, number>;
  };
  const t = d.totales;

  const wb = XLSX.utils.book_new();

  const resumenData = [
    ["RESUMEN FISCAL — T" + quarter + " " + year],
    [],
    ["Concepto", "Base Imponible", "IVA", "Retención", "Total"],
    ["Ventas (emitidas)", t.ventas_subtotal, t.ventas_iva, 0, t.ventas_total],
    ["Facturas de compra", t.compras_subtotal, t.compras_iva, t.compras_retencion, t.compras_total],
    ["Tickets / Gastos", t.tickets_subtotal, t.tickets_iva, 0, t.tickets_total],
    [],
    ["LIQUIDACIÓN IVA"],
    ["IVA Repercutido (ventas)", t.iva_repercutido],
    ["IVA Soportado (compras + tickets)", t.iva_soportado],
    ["IVA a declarar (Mod. 303)", t.iva_a_declarar],
    [],
    ["Retenciones IRPF (Mod. 111)", t.compras_retencion],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  wsResumen["!cols"] = [{ wch: 32 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  const ventasHeader = ["Nº Factura", "Fecha", "Cliente", "NIF Cliente", "Base Imponible", "IVA", "Total", "Cobrado", "Pendiente", "Estado"];
  const ventasRows = (d.ventas ?? []).map((v: Record<string, unknown>) => [
    v.invoice_number, fmtDate(v.issue_date as string), v.client_name, v.client_nif ?? "",
    v.subtotal, v.tax_amount, v.total, v.paid_amount, v.pending_amount, v.status,
  ]);
  const wsVentas = XLSX.utils.aoa_to_sheet([ventasHeader, ...ventasRows]);
  wsVentas["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas");

  const comprasHeader = ["Nº Interno", "Nº Proveedor", "Fecha", "Proveedor", "NIF", "Tipo", "Base Imponible", "IVA", "Retención", "Total", "Pagado", "Pendiente", "Categoría"];
  const facturas = (d.compras ?? []).filter((c: Record<string, unknown>) => c.document_type === "INVOICE");
  const tickets  = (d.compras ?? []).filter((c: Record<string, unknown>) => c.document_type === "EXPENSE");

  const mapCompra = (c: Record<string, unknown>) => [
    c.internal_purchase_number ?? c.invoice_number,
    c.supplier_invoice_number ?? "",
    fmtDate(c.issue_date as string),
    c.supplier_name,
    c.supplier_nif ?? "",
    c.document_type === "EXPENSE" ? "Ticket" : "Factura",
    c.subtotal, c.tax_amount,
    ((c.withholding_amount as number) ?? 0) + ((c.retention_amount as number) ?? 0),
    c.total, c.paid_amount, c.pending_amount,
    c.expense_category ?? "",
  ];

  const comprasData = [
    comprasHeader,
    ...facturas.map(mapCompra),
    [],
    ["--- TICKETS / GASTOS ---"],
    comprasHeader,
    ...tickets.map(mapCompra),
  ];
  const wsCompras = XLSX.utils.aoa_to_sheet(comprasData);
  wsCompras["!cols"] = [{ wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 26 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsCompras, "Compras y Tickets");

  XLSX.writeFile(wb, `Resumen_Fiscal_T${quarter}_${year}.xlsx`);
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const ReportsPage = () => {
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedQuarter, setSelectedQuarter] = useState(String(Math.ceil((new Date().getMonth() + 1) / 3)));
  const [excelLoading, setExcelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExcel = async () => {
    setExcelLoading(true);
    setError(null);
    try {
      await generateQuarterExcel(Number(selectedYear), Number(selectedQuarter));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FolderOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Documentación e Informes</h1>
          <p className="text-sm text-muted-foreground">Generador de informes fiscales trimestrales</p>
        </div>
      </div>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-500" />
            Resumen Fiscal Trimestral
          </CardTitle>
          <CardDescription>
            Genera un Excel con el resumen fiscal completo: ventas, compras, tickets, liquidacion IVA y retenciones IRPF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Año</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Trimestre</label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">T1 (Ene-Mar)</SelectItem>
                  <SelectItem value="2">T2 (Abr-Jun)</SelectItem>
                  <SelectItem value="3">T3 (Jul-Sep)</SelectItem>
                  <SelectItem value="4">T4 (Oct-Dic)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleExcel} disabled={excelLoading} className="gap-2">
              {excelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Descargar Excel T{selectedQuarter} {selectedYear}
            </Button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border border-dashed border-border bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center py-8 gap-4">
            <div className="p-3 rounded-full bg-muted">
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Explorador de archivos en mantenimiento</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                El explorador de archivos fiscales y del catalogo esta siendo migrado a una nueva infraestructura.
                Estara disponible proximamente.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-md px-3 py-1.5">
              <HardDrive className="h-3.5 w-3.5" />
              <span>Migracion a Supabase Storage en curso</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
