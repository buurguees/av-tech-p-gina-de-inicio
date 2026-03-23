import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Save, Loader2, FileText, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import { LOCKED_FINANCE_INVOICE_STATES } from "@/constants/financeStatuses";
import DocumentLinesEditor, {
  type DocumentLine,
  type TaxOption,
} from "../components/documents/DocumentLinesEditor";

interface Client {
  id: string;
  company_name: string;
}

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  site_mode?: string | null;
}

interface ProjectSite {
  id: string;
  site_name: string;
  city: string | null;
  is_default: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  project_id: string | null;
  site_id: string | null;
  issue_date: string;
  due_date: string;
  status: string;
}

const EditInvoicePageDesktop = () => {
  const navigate = useNavigate();
  const { userId, invoiceId } = useParams<{ userId: string; invoiceId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  // Cliente / Proyecto / Sitio
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [loadingSites, setLoadingSites] = useState(false);

  // Fechas
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Líneas e impuestos
  const [lines, setLines] = useState<DocumentLine[]>([]);
  // Snapshot de las líneas al cargar — para detectar cambios al guardar
  const [originalLineMap, setOriginalLineMap] = useState<Map<string, DocumentLine>>(new Map());
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (invoiceId) fetchInvoiceData();
    fetchClients();
    fetchSaleTaxes();
  }, [invoiceId]);

  // Proyectos al cambiar cliente (durante edición manual del campo)
  useEffect(() => {
    if (selectedClientId && !loading) {
      fetchClientProjects(selectedClientId);
      if (invoice && selectedClientId !== invoice.client_id) {
        setSelectedProjectId("");
        setSelectedSiteId("");
        setProjectSites([]);
      }
    }
  }, [selectedClientId]);

  // Sitios al cambiar proyecto
  useEffect(() => {
    if (selectedProjectId) {
      const proj = projects.find((p) => p.id === selectedProjectId);
      if (proj?.site_mode === "MULTI_SITE" || proj?.site_mode === "SINGLE_SITE") {
        fetchSitesForProject(selectedProjectId);
      } else {
        setProjectSites([]);
        setSelectedSiteId("");
      }
    } else {
      setProjectSites([]);
      setSelectedSiteId("");
    }
  }, [selectedProjectId, projects]);

  // ── Data fetching ─────────────────────────────────────────────────────────
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
    } catch {
      setTaxOptions([{ value: 21, label: "IVA 21%" }]);
    }
  };

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      const { data: invoiceData, error: invoiceError } = await supabase.rpc(
        "finance_get_invoice",
        { p_invoice_id: invoiceId! }
      );
      if (invoiceError) throw invoiceError;
      if (!invoiceData || invoiceData.length === 0) throw new Error("Factura no encontrada");

      const inv = Array.isArray(invoiceData) ? invoiceData[0] : invoiceData;
      const isLocked =
        (inv.is_locked || LOCKED_FINANCE_INVOICE_STATES.includes(inv.status)) &&
        inv.status !== "DRAFT";

      if (isLocked) {
        toast({
          title: "Factura bloqueada",
          description: `La factura está bloqueada. Estado: ${inv.status}`,
          variant: "destructive",
        });
        navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
        return;
      }

      setInvoice({
        id: inv.id,
        invoice_number: inv.invoice_number,
        client_id: inv.client_id,
        project_id: inv.project_id,
        site_id: inv.site_id || null,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        status: inv.status,
      });

      setSelectedClientId(inv.client_id);
      setSelectedProjectId(inv.project_id || "");
      if (inv.site_id) setSelectedSiteId(inv.site_id);
      setIssueDate(inv.issue_date?.split("T")[0] || "");
      setDueDate(inv.due_date?.split("T")[0] || "");

      // Líneas
      const { data: linesData, error: linesError } = await supabase.rpc(
        "finance_get_invoice_lines",
        { p_invoice_id: invoiceId! }
      );
      if (linesError) throw linesError;

      const mappedLines: DocumentLine[] = (linesData || []).map(
        (l: {
          id: string;
          concept: string;
          description?: string;
          quantity: number;
          unit_price: number;
          tax_rate: number;
          discount_percent: number;
          subtotal: number;
          tax_amount: number;
          total: number;
          line_order?: number;
          product_id?: string;
        }) => ({
          id: l.id,
          concept: l.concept,
          description: l.description || "",
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate,
          discount_percent: l.discount_percent,
          subtotal: l.subtotal,
          tax_amount: l.tax_amount,
          total: l.total,
          line_order: l.line_order,
          product_id: l.product_id || undefined,
        })
      );

      setLines(mappedLines);
      // Guardar snapshot para detectar cambios al guardar
      setOriginalLineMap(new Map(mappedLines.map((l) => [l.id!, l])));

      if (inv.client_id) await fetchClientProjects(inv.client_id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "No se pudo cargar la factura";
      toast({ title: "Error", description: msg, variant: "destructive" });
      navigate(`/nexo-av/${userId}/invoices`);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.rpc("list_clients", {});
      if (error) throw error;
      setClients(
        (data || []).map((c: { id: string; company_name: string }) => ({
          id: c.id,
          company_name: c.company_name,
        }))
      );
    } catch {
      /* ignore */
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
          .map((p: { id: string; project_number: string; project_name: string; site_mode?: string }) => ({
            id: p.id,
            project_number: p.project_number,
            project_name: p.project_name,
            site_mode: p.site_mode,
          }))
      );
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchSitesForProject = async (projectId: string) => {
    setLoadingSites(true);
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
      if (proj?.site_mode === "SINGLE_SITE" && sites.length > 0) {
        const def = sites.find((s) => s.is_default) || sites[0];
        setSelectedSiteId(def.id);
      }
    } catch {
      setProjectSites([]);
    } finally {
      setLoadingSites(false);
    }
  };

  // ── Guardar ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedClientId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // 1. Actualizar cabecera de factura
      const selectedProject = projects.find((p) => p.id === selectedProjectId);
      const { error: updateError } = await supabase.rpc("update_invoice", {
        p_invoice_id: invoiceId!,
        p_client_id: selectedClientId,
        p_project_id: selectedProjectId || null,
        p_project_name: selectedProject?.project_name || null,
        p_issue_date: issueDate,
        p_due_date: dueDate,
        // @ts-ignore — p_site_id añadido vía migración
        p_site_id: selectedSiteId || null,
      });
      if (updateError) throw updateError;

      // 2. Calcular delta entre líneas actuales y originales
      const currentIds = new Set(lines.filter((l) => l.id).map((l) => l.id!));
      const originalIds = new Set(originalLineMap.keys());

      // Líneas eliminadas: estaban en el original pero ya no están
      const deletedIds = [...originalIds].filter((id) => !currentIds.has(id));

      // Líneas nuevas: sin id (tienen solo tempId)
      const newLines = lines.filter((l) => !l.id && l.concept.trim());

      // Líneas modificadas: tienen id, siguen existiendo, y su contenido cambió
      const modifiedLines = lines.filter((l) => {
        if (!l.id || !originalLineMap.has(l.id)) return false;
        const orig = originalLineMap.get(l.id)!;
        return (
          l.concept !== orig.concept ||
          l.quantity !== orig.quantity ||
          l.unit_price !== orig.unit_price ||
          l.tax_rate !== orig.tax_rate ||
          l.discount_percent !== orig.discount_percent ||
          (l.description || "") !== (orig.description || "")
        );
      });

      // 3. Aplicar cambios
      for (const id of deletedIds) {
        const { error } = await supabase.rpc("delete_invoice_line", { p_line_id: id });
        if (error) throw error;
      }

      // Mapa tempId/id → id real (para reordenación tras añadir nuevas)
      const idMap = new Map<string, string>(
        lines.filter((l) => l.id).map((l) => [l.id!, l.id!])
      );

      for (const line of newLines) {
        const { data: newId, error } = await supabase.rpc("add_invoice_line", {
          p_invoice_id: invoiceId!,
          p_concept: line.concept,
          p_description: line.description || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_discount_percent: line.discount_percent,
          p_product_id: line.product_id || null,
        });
        if (error) throw error;
        const key = line.tempId || "";
        if (key && newId) idMap.set(key, newId as string);
      }

      for (const line of modifiedLines) {
        const { error } = await supabase.rpc("update_invoice_line", {
          p_line_id: line.id!,
          p_concept: line.concept,
          p_description: line.description || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_discount_percent: line.discount_percent,
          p_product_id: line.product_id || null,
        });
        if (error) throw error;
      }

      // 4. Reordenar con todos los IDs en el orden actual
      const lineIdsToOrder = lines
        .filter((l) => l.concept.trim())
        .map((l) => {
          const key = l.id || l.tempId || "";
          return idMap.get(key);
        })
        .filter((id): id is string => Boolean(id));

      if (lineIdsToOrder.length > 0) {
        const { error: orderError } = await supabase.rpc("finance_reorder_invoice_lines", {
          p_invoice_id: invoiceId!,
          p_line_ids: lineIdsToOrder,
        });
        if (orderError) throw orderError;
      }

      toast({
        title: "Factura actualizada",
        description: `Factura ${invoice?.invoice_number} guardada correctamente`,
      });
      navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "No se pudo guardar la factura";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center pt-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4" />
        <p>Factura no encontrada</p>
      </div>
    );
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

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
              <h1 className="text-base md:text-2xl font-bold text-foreground">
                Editar {invoice.invoice_number}
              </h1>
              <p className="text-muted-foreground text-[10px] md:text-sm hidden md:block">
                Modifica los datos de la factura
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
              <span className="ml-auto text-orange-500 font-mono text-xs">
                {invoice.invoice_number}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {/* Cliente */}
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <Label className="text-muted-foreground text-[10px] md:text-xs">Cliente</Label>
                <Select
                  value={selectedClientId || undefined}
                  onValueChange={(v) => {
                    setSelectedClientId(v);
                    setSelectedProjectId("");
                  }}
                >
                  <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm rounded-xl">
                    <SelectValue placeholder="Seleccionar" />
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
                  onValueChange={(v) => setSelectedProjectId(v === "__none__" ? "" : v)}
                  disabled={!selectedClientId || loadingProjects}
                >
                  <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm rounded-xl">
                    <SelectValue
                      placeholder={
                        !selectedClientId
                          ? "Cliente primero"
                          : loadingProjects
                            ? "Cargando..."
                            : projects.length === 0
                              ? "Sin proyectos"
                              : "Seleccionar"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sin proyecto —</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_name}
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
                    disabled={loadingSites}
                  >
                    <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm rounded-xl">
                      <SelectValue
                        placeholder={loadingSites ? "Cargando sitios..." : "Seleccionar sitio..."}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {projectSites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.site_name}
                          {s.city ? ` — ${s.city}` : ""}
                          {s.is_default ? " ★" : ""}
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

export default EditInvoicePageDesktop;
