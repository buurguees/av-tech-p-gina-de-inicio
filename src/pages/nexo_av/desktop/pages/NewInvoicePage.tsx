import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2, FileText, MapPin, Link2 } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import DocumentLinesEditor, {
  type DocumentLine,
  type TaxOption,
} from "../components/documents/DocumentLinesEditor";

interface Project {
  id: string;
  project_name: string;
  project_number: string;
  site_mode?: string;
}

interface ProjectSite {
  id: string;
  site_name: string;
  city: string | null;
  is_default: boolean;
}

interface ApprovedQuote {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string;
  total: number;
}

const formatCurrencyShort = (amount: number) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + " €";

const NewInvoicePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [selectedSourceQuoteId, setSelectedSourceQuoteId] = useState<string>(
    () => searchParams.get("sourceQuoteId") || ""
  );
  const [approvedQuotes, setApprovedQuotes] = useState<ApprovedQuote[]>([]);
  const pendingSiteIdRef = useRef<string>("");

  // Cliente / Proyecto / Sitio
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  // Fechas
  const [issueDate, setIssueDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  // Líneas e impuestos
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchClients();
    fetchSaleTaxes();
    fetchApprovedQuotes();
    const urlClientId = searchParams.get("clientId");
    if (urlClientId) setSelectedClientId(urlClientId);
  }, [searchParams]);

  // Añadir una línea vacía al cargar los impuestos por primera vez (solo si no venimos de un presupuesto)
  useEffect(() => {
    if (taxOptions.length > 0 && lines.length === 0 && !selectedSourceQuoteId) {
      setLines([
        {
          tempId: crypto.randomUUID(),
          concept: "",
          description: "",
          quantity: 1,
          unit_price: 0,
          tax_rate: defaultTaxRate,
          discount_percent: 0,
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          line_order: 1,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxOptions]);

  // Pre-rellenar desde presupuesto origen
  const loadFromQuote = useCallback(async (quoteId: string) => {
    if (!quoteId || taxOptions.length === 0) return;
    try {
      const { data: quoteData, error: quoteError } = await supabase.rpc("get_quote", {
        p_quote_id: quoteId,
      });
      if (quoteError) throw quoteError;
      const q = quoteData?.[0] as any;
      if (!q) return;

      setSelectedClientId(q.client_id);
      if (q.project_id) setSelectedProjectId(q.project_id);
      if (q.site_id) pendingSiteIdRef.current = q.site_id;

      const { data: linesData, error: linesError } = await supabase.rpc("get_quote_lines", {
        p_quote_id: quoteId,
      });
      if (linesError) throw linesError;

      const mappedLines = ((linesData || []) as any[]).map((l, idx) => ({
        tempId: crypto.randomUUID(),
        concept: l.concept,
        description: l.description || "",
        quantity: l.quantity,
        unit_price: l.unit_price,
        tax_rate: l.tax_rate,
        discount_percent: l.discount_percent ?? 0,
        subtotal: l.subtotal,
        tax_amount: l.tax_amount,
        total: l.total,
        line_order: idx + 1,
      }));
      setLines(mappedLines);
    } catch (e) {
      console.error("Error loading quote data for invoice:", e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxOptions]);

  useEffect(() => {
    if (!selectedSourceQuoteId || taxOptions.length === 0) return;
    void loadFromQuote(selectedSourceQuoteId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSourceQuoteId, taxOptions]);

  // Proyectos al cambiar cliente
  useEffect(() => {
    if (selectedClientId) {
      fetchClientProjects(selectedClientId);
    } else {
      setProjects([]);
      setSelectedProjectId("");
      setProjectSites([]);
      setSelectedSiteId("");
    }
  }, [selectedClientId]);

  // Pre-seleccionar proyecto desde URL
  useEffect(() => {
    const urlProjectId = searchParams.get("projectId");
    if (urlProjectId && projects.find((p) => p.id === urlProjectId)) {
      setSelectedProjectId(urlProjectId);
    }
  }, [projects, searchParams]);

  // Sitios al cambiar proyecto
  useEffect(() => {
    if (selectedProjectId) {
      fetchSites(selectedProjectId);
    } else {
      setProjectSites([]);
      setSelectedSiteId("");
    }
  }, [selectedProjectId]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.rpc("list_clients", { p_search: null });
      if (error) throw error;
      setClients(
        (data || []).map((c: { id: string; company_name: string }) => ({
          id: c.id,
          company_name: c.company_name,
        }))
      );
    } catch (e) {
      console.error("Error fetching clients:", e);
    }
  };

  const fetchApprovedQuotes = async () => {
    try {
      const { data, error } = await supabase.rpc("list_quotes", { p_search: null });
      if (error) throw error;
      setApprovedQuotes(
        ((data || []) as any[])
          .filter((q) => q.status === "APPROVED")
          .map((q) => ({
            id: q.id,
            quote_number: q.quote_number,
            client_id: q.client_id,
            client_name: q.client_name || "",
            total: q.total ?? 0,
          }))
      );
    } catch (e) {
      console.error("Error fetching approved quotes:", e);
    }
  };

  const fetchClientProjects = async (clientId: string) => {
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase.rpc("list_projects", { p_search: null });
      if (error) throw error;
      setProjects(
        (data || [])
          .filter((p: { client_id: string }) => p.client_id === clientId)
          .map((p: { id: string; project_name: string; project_number: string; site_mode?: string }) => ({
            id: p.id,
            project_name: p.project_name,
            project_number: p.project_number,
            site_mode: p.site_mode,
          }))
      );
    } catch (e) {
      console.error("Error fetching projects:", e);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchSites = async (projectId: string) => {
    try {
      const { data, error } = await supabase.rpc("list_project_sites", {
        p_project_id: projectId,
      });
      if (error) throw error;
      const sites: ProjectSite[] = (data || [])
        .filter((s: { is_active: boolean }) => s.is_active)
        .map((s: { id: string; site_name: string; city: string | null; is_default: boolean }) => ({
          id: s.id,
          site_name: s.site_name,
          city: s.city,
          is_default: s.is_default,
        }));
      setProjectSites(sites);
      const proj = projects.find((p) => p.id === projectId);
      const prefSite = pendingSiteIdRef.current;
      pendingSiteIdRef.current = "";
      if (proj?.site_mode === "SINGLE_SITE" && sites.length > 0) {
        const def = sites.find((s) => s.is_default) || sites[0];
        setSelectedSiteId(def.id);
      } else if (prefSite && sites.some((s) => s.id === prefSite)) {
        setSelectedSiteId(prefSite);
      } else {
        setSelectedSiteId("");
      }
    } catch (e) {
      console.error("Error fetching sites:", e);
      setProjectSites([]);
    }
  };

  const fetchSaleTaxes = async () => {
    try {
      const { data, error } = await supabase.rpc("list_taxes", { p_tax_type: "sales" });
      if (error) throw error;
      const options: TaxOption[] = (data || [])
        .filter((t: { is_active: boolean }) => t.is_active)
        .map((t: { rate: number; name: string }) => ({ value: t.rate, label: t.name }));
      setTaxOptions(options);
      const def = (data || []).find(
        (t: { is_default: boolean; is_active: boolean }) => t.is_default && t.is_active
      );
      setDefaultTaxRate(def?.rate ?? options[0]?.value ?? 21);
    } catch (e) {
      console.error("Error fetching taxes:", e);
      setTaxOptions([{ value: 21, label: "IVA 21%" }]);
    }
  };

  // ── Guardar ──────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!selectedClientId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" });
      return;
    }
    const selectedProject = projects.find((p) => p.id === selectedProjectId);
    if (selectedProject?.site_mode === "MULTI_SITE" && !selectedSiteId) {
      toast({
        title: "Error",
        description: "Selecciona un sitio para este proyecto multi-sitio",
        variant: "destructive",
      });
      return;
    }
    const validLines = lines.filter((l) => l.concept.trim());
    if (validLines.length === 0) {
      toast({ title: "Error", description: "Añade al menos una línea", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: invoiceData, error: invoiceError } = await supabase.rpc(
        "create_invoice_with_number",
        {
          p_client_id: selectedClientId,
          p_project_id: selectedProjectId || null,
          p_project_name: selectedProject?.project_name || null,
          p_issue_date: issueDate,
          p_due_date: dueDate,
          p_site_id: selectedSiteId || null,
          p_source_quote_id: selectedSourceQuoteId || null,
        }
      );
      if (invoiceError) throw invoiceError;
      if (!invoiceData || invoiceData.length === 0) throw new Error("No se pudo crear la factura");

      const invoiceId = invoiceData[0].invoice_id;

      for (const line of validLines) {
        const { error: lineError } = await supabase.rpc("add_invoice_line", {
          p_invoice_id: invoiceId,
          p_concept: line.concept,
          p_description: line.description || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_discount_percent: line.discount_percent ?? 0,
          p_product_id: line.product_id || null,
        });
        if (lineError) throw lineError;
      }

      toast({
        title: "Factura creada",
        description: `Factura ${invoiceData[0].invoice_number} guardada correctamente`,
      });
      navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
    } catch (error: unknown) {
      console.error("Error saving invoice:", error);
      const msg = error instanceof Error ? error.message : "No se pudo guardar la factura";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [
    selectedClientId,
    selectedProjectId,
    selectedSiteId,
    issueDate,
    dueDate,
    lines,
    projects,
    userId,
    selectedSourceQuoteId,
    navigate,
    toast,
  ]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Filtrar presupuestos aprobados por cliente si hay uno seleccionado
  const filteredApprovedQuotes = selectedClientId
    ? approvedQuotes.filter((q) => q.client_id === selectedClientId)
    : approvedQuotes;

  return (
    <div className="w-full">
      <div className="w-full px-3 md:px-4 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Barra superior */}
          <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
            <div>
              <h1 className="text-base md:text-2xl font-bold text-foreground">Nueva factura</h1>
              <p className="text-muted-foreground text-[10px] md:text-sm hidden md:block">
                {selectedSourceQuoteId
                  ? "Datos copiados del presupuesto — revisa antes de guardar"
                  : "El número se asignará automáticamente al guardar"}
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              size="icon"
              className="bg-orange-500 hover:bg-orange-600 text-white h-8 w-8 md:h-10 md:w-auto md:px-4 rounded-2xl shadow-lg shadow-orange-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/40"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden md:inline ml-2">Guardar</span>
            </Button>
          </div>

          {/* Datos de la factura */}
          <div className="bg-card rounded-2xl md:rounded-3xl border border-border p-3 md:p-6 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
              <div className="p-1.5 rounded-xl bg-muted">
                <FileText className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
              </div>
              <span className="text-muted-foreground text-[10px] md:text-xs font-medium uppercase tracking-wide">
                Datos de la factura
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {/* Presupuesto origen */}
              <div className="space-y-1.5 col-span-2 md:col-span-4">
                <Label className="text-muted-foreground text-[10px] md:text-xs flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> Presupuesto origen
                  <span className="text-muted-foreground/60">(opcional)</span>
                </Label>
                <Select
                  value={selectedSourceQuoteId || "__none__"}
                  onValueChange={(v) => {
                    const quoteId = v === "__none__" ? "" : v;
                    setSelectedSourceQuoteId(quoteId);
                    if (quoteId) {
                      void loadFromQuote(quoteId);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm rounded-xl">
                    <SelectValue placeholder="Vincular a un presupuesto aprobado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sin presupuesto origen —</SelectItem>
                    {filteredApprovedQuotes.length === 0 && selectedClientId && (
                      <SelectItem value="__empty__" disabled>
                        Sin presupuestos aprobados para este cliente
                      </SelectItem>
                    )}
                    {filteredApprovedQuotes.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.quote_number}
                        {q.client_name ? ` — ${q.client_name}` : ""}
                        {" · "}
                        {formatCurrencyShort(q.total)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cliente */}
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <Label className="text-muted-foreground text-[10px] md:text-xs">Cliente</Label>
                <Select
                  value={selectedClientId || undefined}
                  onValueChange={(v) => {
                    setSelectedClientId(v);
                    setSelectedProjectId("");
                    setSelectedSiteId("");
                    setProjectSites([]);
                    // Si el cliente cambia manualmente y no coincide con el del presupuesto origen, limpiar el enlace
                    const linkedQuote = approvedQuotes.find((q) => q.id === selectedSourceQuoteId);
                    if (linkedQuote && linkedQuote.client_id !== v) {
                      setSelectedSourceQuoteId("");
                    }
                  }}
                >
                  <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm rounded-xl">
                    <SelectValue placeholder="Seleccionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Proyecto */}
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <Label className="text-muted-foreground text-[10px] md:text-xs">Proyecto</Label>
                <Select
                  value={
                    !selectedClientId || projects.length === 0
                      ? undefined
                      : selectedProjectId || "__none__"
                  }
                  onValueChange={(v) => {
                    setSelectedProjectId(v === "__none__" ? "" : v);
                    setSelectedSiteId("");
                    setProjectSites([]);
                  }}
                  disabled={!selectedClientId || loadingProjects || projects.length === 0}
                >
                  <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm rounded-xl">
                    <SelectValue
                      placeholder={
                        !selectedClientId
                          ? "Selecciona un cliente primero"
                          : projects.length === 0
                            ? "Sin proyectos"
                            : "Seleccionar proyecto..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sin proyecto —</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_name} ({p.project_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sitio MULTI_SITE */}
              {selectedProject?.site_mode === "MULTI_SITE" && projectSites.length > 0 && (
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-muted-foreground text-[10px] md:text-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Sitio de instalación *
                  </Label>
                  <Select
                    value={selectedSiteId || undefined}
                    onValueChange={setSelectedSiteId}
                  >
                    <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm rounded-xl">
                      <SelectValue placeholder="Seleccionar sitio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projectSites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.site_name}
                          {s.city ? ` — ${s.city}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sitio SINGLE_SITE (read-only) */}
              {selectedProject?.site_mode === "SINGLE_SITE" && projectSites.length > 0 && (
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-muted-foreground text-[10px] md:text-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Sitio
                  </Label>
                  <div className="text-sm font-medium text-foreground px-3 py-2 bg-muted/30 rounded-xl border border-border">
                    {projectSites[0]?.site_name}
                    {projectSites[0]?.city ? ` — ${projectSites[0].city}` : ""}
                  </div>
                </div>
              )}

              {/* Fecha emisión */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[10px] md:text-xs">
                  Fecha emisión
                </Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-8 md:h-9 text-xs md:text-sm rounded-xl"
                />
              </div>

              {/* Vencimiento */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[10px] md:text-xs">
                  Vencimiento
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 md:h-9 text-xs md:text-sm rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Editor de líneas */}
          <div className="bg-card rounded-2xl border border-border p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Líneas de la factura
              </span>
              <span className="text-muted-foreground text-xs">
                Usa @ para buscar en el catálogo
              </span>
            </div>
            <DocumentLinesEditor
              lines={lines}
              onLinesChange={setLines}
              taxOptions={taxOptions}
              defaultTaxRate={defaultTaxRate}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NewInvoicePage;
