/**
 * BatchArchiver - Generates PDFs for all emitted invoices/quotes
 * and uploads them to MinIO via the minio-proxy Edge Function.
 *
 * Uses the existing React PDF templates (InvoicePDFDocument / QuotePDFDocument)
 * so the output is identical to what the user sees in the preview.
 */
import { useState, useCallback, createElement } from "react";
import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, CheckCircle2, XCircle, Loader2, Archive, FileText, ScrollText } from "lucide-react";
import {
  InvoicePDFDocument,
  type Invoice,
  type InvoiceLine,
  type Client,
  type CompanySettings,
  type Project,
  type CompanyPreferences,
} from "@/pages/nexo_av/assets/plantillas";
import {
  QuotePDFDocument,
  type Quote,
  type QuoteLine,
} from "@/pages/nexo_av/assets/plantillas/QuotePDFDocument";

interface LogEntry {
  time: string;
  type: "info" | "success" | "error" | "warn";
  message: string;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function callMinioProxy(action: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/minio-proxy`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify({ action, ...body }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const BatchArchiver = () => {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [stats, setStats] = useState({ invoices: 0, quotes: 0, errors: 0 });

  const log = useCallback((type: LogEntry["type"], message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, type, message }]);
  }, []);

  const runBackfill = useCallback(async () => {
    setRunning(true);
    setLogs([]);
    setProgress({ current: 0, total: 0 });
    setStats({ invoices: 0, quotes: 0, errors: 0 });

    try {
      log("info", "Obteniendo configuracion de empresa...");
      const { data: companyArr } = await supabase.rpc("get_company_settings");
      const company: CompanySettings | null = companyArr?.[0] || null;
      if (!company) { log("error", "No se encontro configuracion de empresa"); setRunning(false); return; }
      log("success", `Empresa: ${company.legal_name}`);

      const { data: prefsArr } = await supabase.rpc("get_company_preferences");
      const preferences: CompanyPreferences | null = prefsArr?.[0]
        ? { bank_accounts: Array.isArray(prefsArr[0].bank_accounts) ? prefsArr[0].bank_accounts : [] }
        : null;

      // --- INVOICES ---
      log("info", "Buscando facturas sin archivar...");
      const { data: invoices, error: invErr } = await supabase.rpc("backfill_list_invoices_to_migrate");
      if (invErr) { log("error", `Error RPC: ${invErr.message}`); setRunning(false); return; }
      log("info", `Encontradas ${invoices?.length || 0} facturas por archivar`);

      // --- QUOTES ---
      log("info", "Buscando presupuestos sin archivar...");
      const { data: quotes, error: qtErr } = await supabase.rpc("backfill_list_quotes_to_migrate");
      if (qtErr) { log("error", `Error RPC: ${qtErr.message}`); setRunning(false); return; }
      log("info", `Encontrados ${quotes?.length || 0} presupuestos por archivar`);

      const allInvoices = invoices || [];
      const allQuotes = quotes || [];
      const total = allInvoices.length + allQuotes.length;
      setProgress({ current: 0, total });

      if (total === 0) {
        log("success", "Todos los documentos ya estan archivados.");
        setRunning(false);
        return;
      }

      let invOk = 0, qtOk = 0, errCount = 0;

      // Process invoices
      for (let i = 0; i < allInvoices.length; i++) {
        const inv = allInvoices[i];
        const number = inv.invoice_number || inv.preliminary_number || "SN";
        try {
          log("info", `[${i + 1}/${total}] Factura ${number}: obteniendo datos...`);

          const { data: fullInv } = await supabase.rpc("finance_get_invoice", { p_invoice_id: inv.id });
          const invoice: Invoice = Array.isArray(fullInv) ? fullInv[0] : fullInv;
          if (!invoice) throw new Error("No se encontraron datos de factura");

          const { data: linesData } = await supabase.rpc("finance_get_invoice_lines", { p_invoice_id: inv.id });
          const lines: InvoiceLine[] = (linesData || []).sort((a: InvoiceLine, b: InvoiceLine) => (a.line_order || 0) - (b.line_order || 0));

          let client: Client | null = null;
          if (invoice.client_id) {
            const { data: cData } = await supabase.rpc("get_client", { p_client_id: (invoice as any).client_id });
            client = Array.isArray(cData) ? cData[0] : cData;
          }

          let project: Project | null = null;
          if ((invoice as any).project_id) {
            const { data: pData } = await supabase.rpc("get_project", { p_project_id: (invoice as any).project_id });
            const pInfo = Array.isArray(pData) ? pData[0] : pData;
            if (pInfo) {
              project = {
                project_number: pInfo.project_number,
                project_name: pInfo.project_name,
                project_address: pInfo.project_address || null,
                project_city: pInfo.project_city || null,
                local_name: pInfo.local_name || null,
                client_order_number: pInfo.client_order_number || null,
                site_name: (invoice as any).site_name || null,
              };
            }
          }

          log("info", `[${i + 1}/${total}] Factura ${number}: generando PDF (${lines.length} lineas)...`);

          const pdfBlob = await pdf(
            createElement(InvoicePDFDocument, { invoice, lines, client, company, project, preferences })
          ).toBlob();

          if (pdfBlob.size < 1000) {
            log("warn", `Factura ${number}: PDF muy pequeno (${pdfBlob.size} bytes)`);
          }

          const base64 = await blobToBase64(pdfBlob);

          log("info", `[${i + 1}/${total}] Factura ${number}: subiendo a MinIO (${(pdfBlob.size / 1024).toFixed(1)} KB)...`);

          const result = await callMinioProxy("archive_document", {
            source_type: "ventas",
            source_id: inv.id,
            pdf_base64: base64,
          });

          log("success", `Factura ${number} -> ${result.key} (${result.size_bytes} bytes)`);
          invOk++;
        } catch (err: any) {
          log("error", `Factura ${number}: ${err.message}`);
          errCount++;
        }
        setProgress({ current: i + 1, total });
        setStats({ invoices: invOk, quotes: qtOk, errors: errCount });

        if (i < allInvoices.length - 1) await new Promise(r => setTimeout(r, 500));
      }

      // Process quotes
      for (let i = 0; i < allQuotes.length; i++) {
        const q = allQuotes[i];
        const number = q.quote_number || "SN";
        const globalIdx = allInvoices.length + i;

        try {
          log("info", `[${globalIdx + 1}/${total}] Presupuesto ${number}: obteniendo datos...`);

          const { data: fullQuote } = await supabase.rpc("get_quote", { p_quote_id: q.id });
          const quote: Quote = Array.isArray(fullQuote) ? fullQuote[0] : fullQuote;
          if (!quote) throw new Error("No se encontraron datos de presupuesto");

          const { data: linesData } = await supabase.rpc("get_quote_lines", { p_quote_id: q.id });
          const lines: QuoteLine[] = (linesData || []).sort((a: QuoteLine, b: QuoteLine) => (a.line_order || 0) - (b.line_order || 0));

          let client: Client | null = null;
          if (quote.client_id) {
            const { data: cData } = await supabase.rpc("get_client", { p_client_id: (quote as any).client_id });
            client = Array.isArray(cData) ? cData[0] : cData;
          }

          let project: Project | null = null;
          if ((quote as any).project_id) {
            const { data: pData } = await supabase.rpc("get_project", { p_project_id: (quote as any).project_id });
            const pInfo = Array.isArray(pData) ? pData[0] : pData;
            if (pInfo) {
              project = {
                project_number: pInfo.project_number,
                project_name: pInfo.project_name,
                project_address: pInfo.project_address || null,
                project_city: pInfo.project_city || null,
                local_name: pInfo.local_name || null,
                client_order_number: pInfo.client_order_number || null,
                site_name: (quote as any).site_name || null,
              };
            }
          }

          log("info", `[${globalIdx + 1}/${total}] Presupuesto ${number}: generando PDF (${lines.length} lineas)...`);

          const pdfBlob = await pdf(
            createElement(QuotePDFDocument, { quote, lines, client, company, project })
          ).toBlob();

          if (pdfBlob.size < 1000) {
            log("warn", `Presupuesto ${number}: PDF muy pequeno (${pdfBlob.size} bytes)`);
          }

          const base64 = await blobToBase64(pdfBlob);

          log("info", `[${globalIdx + 1}/${total}] Presupuesto ${number}: subiendo a MinIO (${(pdfBlob.size / 1024).toFixed(1)} KB)...`);

          const result = await callMinioProxy("archive_document", {
            source_type: "presupuestos",
            source_id: q.id,
            pdf_base64: base64,
          });

          log("success", `Presupuesto ${number} -> ${result.key} (${result.size_bytes} bytes)`);
          qtOk++;
        } catch (err: any) {
          log("error", `Presupuesto ${number}: ${err.message}`);
          errCount++;
        }
        setProgress({ current: globalIdx + 1, total });
        setStats({ invoices: invOk, quotes: qtOk, errors: errCount });

        if (i < allQuotes.length - 1) await new Promise(r => setTimeout(r, 500));
      }

      log("info", "========================================");
      log("success", `COMPLETADO: ${invOk} facturas + ${qtOk} presupuestos archivados, ${errCount} errores`);
    } catch (err: any) {
      log("error", `Error fatal: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }, [log]);

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Archive className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Archivador Fiscal Batch</h3>
            <p className="text-xs text-muted-foreground">
              Genera PDFs de facturas y presupuestos emitidos y los sube a MinIO
            </p>
          </div>
        </div>
        <Button onClick={runBackfill} disabled={running} size="sm" className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Procesando..." : "Ejecutar Backfill"}
        </Button>
      </div>

      {progress.total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress.current} / {progress.total} documentos</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="flex gap-3 text-xs">
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              {stats.invoices} facturas
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ScrollText className="h-3 w-3" />
              {stats.quotes} presupuestos
            </Badge>
            {stats.errors > 0 && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                {stats.errors} errores
              </Badge>
            )}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-muted/30 border border-border rounded-lg p-3 max-h-[400px] overflow-y-auto font-mono text-xs space-y-0.5">
          {logs.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-muted-foreground shrink-0">{entry.time}</span>
              {entry.type === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />}
              {entry.type === "error" && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
              {entry.type === "warn" && <XCircle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />}
              {entry.type === "info" && <span className="text-blue-400 shrink-0">i</span>}
              <span className={
                entry.type === "error" ? "text-red-400" :
                entry.type === "success" ? "text-green-400" :
                entry.type === "warn" ? "text-yellow-400" :
                "text-foreground"
              }>
                {entry.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BatchArchiver;
