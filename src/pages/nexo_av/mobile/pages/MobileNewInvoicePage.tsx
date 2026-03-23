import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Boxes, ChevronDown, ChevronLeft, Loader2, Package, Plus, Save, Trash2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Client { id: string; company_name: string }
interface Project { id: string; client_id: string; project_name: string; project_number: string; site_mode?: string | null }
interface ProjectSite { id: string; site_name: string; city: string | null; is_default: boolean; is_active: boolean }
interface TaxRow { rate: number; name: string; is_active: boolean; is_default: boolean }
interface TaxOption { value: number; label: string }
interface CatalogItem { id: string; type: "product" | "service" | "pack"; name: string; code: string; price: number; tax_rate: number; description?: string }
interface InvoiceLine {
  tempId: string; concept: string; description: string; quantity: number; unit_price: number;
  tax_rate: number; discount_percent: number; subtotal: number; tax_amount: number; total: number;
  product_id?: string;
}
interface ProjectContext { client_id: string | null }

const formatCurrency = (amount: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

const MobileNewInvoicePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<ProjectSite[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 30); return date.toISOString().split("T")[0]; });
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [loadingSites, setLoadingSites] = useState(false);

  const calculateLine = useCallback((line: Partial<InvoiceLine>): InvoiceLine => {
    const quantity = line.quantity || 0;
    const unitPrice = line.unit_price || 0;
    const discount = line.discount_percent || 0;
    const tax = line.tax_rate ?? defaultTaxRate;
    const subtotal = quantity * unitPrice * (1 - discount / 100);
    const taxAmount = subtotal * (tax / 100);
    return {
      tempId: line.tempId || crypto.randomUUID(),
      concept: line.concept || "",
      description: line.description || "",
      quantity,
      unit_price: unitPrice,
      tax_rate: tax,
      discount_percent: discount,
      subtotal,
      tax_amount: taxAmount,
      total: subtotal + taxAmount,
      product_id: line.product_id,
    };
  }, [defaultTaxRate]);

  const addEmptyLine = useCallback(() => {
    setLines((prev) => [...prev, calculateLine({ quantity: 1, tax_rate: defaultTaxRate })]);
  }, [calculateLine, defaultTaxRate]);

  const updateLine = useCallback((index: number, field: keyof InvoiceLine, value: string | number) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = calculateLine({ ...next[index], [field]: value });
      return next;
    });
  }, [calculateLine]);

  const loadSites = useCallback(async (projectId: string, preferredSiteId: string) => {
    setLoadingSites(true);
    const { data, error } = await supabase.rpc("list_project_sites", { p_project_id: projectId });
    setLoadingSites(false);
    if (error) return void console.error("Error fetching sites:", error);
    const nextSites = ((data || []) as ProjectSite[]).filter((site) => site.is_active);
    setSites(nextSites);
    const project = projects.find((item) => item.id === projectId);
    if (project?.site_mode === "SINGLE_SITE" && nextSites.length > 0) {
      const defaultSite = nextSites.find((site) => site.is_default) || nextSites[0];
      setSelectedSiteId(defaultSite.id);
      return;
    }
    if (preferredSiteId && nextSites.some((site) => site.id === preferredSiteId)) setSelectedSiteId(preferredSiteId);
  }, [projects]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadClients(), loadTaxes()]);
      let clientId = searchParams.get("clientId") || "";
      const projectId = searchParams.get("projectId") || "";
      if (!clientId && projectId) {
        const projectContext = await loadProjectContext(projectId);
        clientId = projectContext?.client_id || "";
      }
      if (clientId) {
        setSelectedClientId(clientId);
        await loadProjects(clientId, projectId);
      }
      addEmptyLine();
      setLoading(false);
    };
    void init();
  }, [addEmptyLine, searchParams]);

  useEffect(() => {
    if (!selectedClientId) {
      setProjects([]);
      setSelectedProjectId("");
      setSites([]);
      setSelectedSiteId("");
      return;
    }
    void loadProjects(selectedClientId, selectedProjectId || searchParams.get("projectId") || "");
  }, [searchParams, selectedClientId, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSites([]);
      setSelectedSiteId("");
      return;
    }
    void loadSites(selectedProjectId, searchParams.get("siteId") || "");
  }, [loadSites, searchParams, selectedProjectId]);

  const loadClients = async () => {
    const { data, error } = await supabase.rpc("list_clients", { p_search: null });
    if (error) return void console.error("Error fetching clients:", error);
    setClients(((data || []) as Client[]).map((client) => ({ id: client.id, company_name: client.company_name })));
  };

  const loadProjects = async (clientId: string, preferredProjectId: string) => {
    const { data, error } = await supabase.rpc("list_projects", { p_search: "" });
    if (error) return void console.error("Error fetching projects:", error);
    const nextProjects = ((data || []) as Project[]).filter((project) => project.client_id === clientId);
    setProjects(nextProjects);
    if (preferredProjectId && nextProjects.some((project) => project.id === preferredProjectId)) setSelectedProjectId(preferredProjectId);
  };

  const loadProjectContext = async (projectId: string) => {
    const { data, error } = await supabase.rpc("get_project", { p_project_id: projectId });
    if (error) {
      console.error("Error fetching project context:", error);
      return null;
    }

    return ((data || [])[0] as ProjectContext | undefined) || null;
  };

  const loadTaxes = async () => {
    const { data, error } = await supabase.rpc("list_taxes", { p_tax_type: "sales" });
    if (error) {
      console.error("Error fetching taxes:", error);
      setTaxOptions([{ value: 21, label: "IVA 21%" }]);
      return;
    }
    const taxRows = (data || []) as TaxRow[];
    const options = taxRows.filter((tax) => tax.is_active).map((tax) => ({ value: tax.rate, label: tax.name }));
    setTaxOptions(options);
    const defaultTax = taxRows.find((tax) => tax.is_default && tax.is_active);
    setDefaultTaxRate(defaultTax?.rate ?? options[0]?.value ?? 21);
  };

  const searchCatalog = async (query: string, lineIndex: number) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setSearchLoading(true);
    setActiveSearchIndex(lineIndex);
    const { data, error } = await supabase.rpc("list_catalog_products_search", { p_search: query.trim().split(/\s+/)[0], p_include_inactive: false });
    setSearchLoading(false);
    if (error) return void console.error("Error searching catalog:", error);
    const typeMap: Record<string, CatalogItem["type"]> = { PRODUCT: "product", SERVICE: "service", BUNDLE: "pack" };
    const items = (data || []).map((item: { id: string; sku: string; name: string; description: string; product_type: string; sale_price_effective: number; tax_rate: number }) => ({
      id: item.id, type: typeMap[item.product_type] || "product", name: item.name, code: item.sku, price: Number(item.sale_price_effective ?? 0), tax_rate: Number(item.tax_rate ?? 21), description: item.description || "",
    }));
    setSearchResults(items.slice(0, 10));
    setShowSearchResults(items.length > 0);
  };

  const handleSelectCatalogItem = (item: CatalogItem, index: number) => {
    updateLine(index, "concept", item.name);
    updateLine(index, "unit_price", item.price);
    updateLine(index, "tax_rate", item.tax_rate);
    updateLine(index, "product_id", item.id);
    if (item.description) updateLine(index, "description", item.description);
    setShowSearchResults(false);
    setActiveSearchIndex(null);
  };

  const totals = useMemo(() => lines.filter((line) => line.concept.trim()).reduce((acc, line) => ({
    subtotal: acc.subtotal + line.subtotal, taxAmount: acc.taxAmount + line.tax_amount, total: acc.total + line.total,
  }), { subtotal: 0, taxAmount: 0, total: 0 }), [lines]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedSite = sites.find((site) => site.id === selectedSiteId) || sites[0];
  const showSiteSelector = selectedProject?.site_mode === "MULTI_SITE" && sites.length > 0;
  const showSingleSiteInfo = selectedProject?.site_mode === "SINGLE_SITE" && sites.length > 0;

  const handleBack = () => navigate(searchParams.get("returnTo") || `/nexo-av/${userId}/invoices`);

  const handleSave = async () => {
    if (!selectedClientId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" });
      return;
    }
    if (selectedProject?.site_mode === "MULTI_SITE" && !selectedSiteId) {
      toast({ title: "Error", description: "Selecciona un sitio para este proyecto multi-sitio", variant: "destructive" });
      return;
    }
    const validLines = lines.filter((line) => line.concept.trim());
    if (validLines.length === 0) {
      toast({ title: "Error", description: "Añade al menos una línea", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("create_invoice_with_number", {
        p_client_id: selectedClientId,
        p_project_id: selectedProjectId || null,
        p_project_name: selectedProject?.project_name || null,
        p_issue_date: issueDate,
        p_due_date: dueDate,
        p_site_id: selectedSiteId || null,
      });
      if (error) throw error;
      if (!data?.[0]) throw new Error("No se pudo crear la factura");
      const invoiceId = data[0].invoice_id;
      for (const line of validLines) {
        const { error: lineError } = await supabase.rpc("add_invoice_line", {
          p_invoice_id: invoiceId,
          p_concept: line.concept,
          p_description: line.description || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_discount_percent: line.discount_percent,
          p_product_id: line.product_id || null,
        });
        if (lineError) throw lineError;
      }
      toast({ title: "Factura creada", description: `${data[0].invoice_number} guardada correctamente` });
      navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la factura";
      console.error("Error saving invoice:", error);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="w-full h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-shrink-0 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className={cn("h-11 min-w-11 px-3 min-[400px]:px-4 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0", "text-sm font-medium leading-none", "bg-card border border-border text-foreground", "active:scale-95 transition-all duration-200", "shadow-sm")}
            style={{ touchAction: "manipulation" }}
            aria-label="Volver"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden min-[400px]:inline">Atrás</span>
          </button>
          <div className="flex-1 min-w-0"><h1 className="text-base font-medium text-foreground truncate leading-tight">Nueva Factura</h1></div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn("h-11 min-w-11 px-3 min-[400px]:px-4 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0", "text-sm font-medium leading-none", "bg-primary text-primary-foreground", "active:scale-95 transition-all duration-200", "shadow-sm", "disabled:opacity-50 disabled:cursor-not-allowed")}
            style={{ touchAction: "manipulation" }}
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="hidden min-[400px]:inline">Guardando...</span></> : <><Save className="h-4 w-4" /><span className="hidden min-[400px]:inline">Guardar</span></>}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-[80px]">
        <div className="px-4 py-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</Label>
              <Select value={selectedClientId} onValueChange={(value) => { setSelectedClientId(value); setSelectedProjectId(""); setSelectedSiteId(""); setSites([]); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                <SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {selectedClientId && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proyecto</Label>
                <Select value={selectedProjectId} onValueChange={(value) => { setSelectedProjectId(value); setSelectedSiteId(""); setSites([]); }} disabled={projects.length === 0}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={projects.length === 0 ? "Sin proyectos" : "Seleccionar proyecto..."} /></SelectTrigger>
                  <SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_name} ({project.project_number})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {showSiteSelector && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sitio de instalación <span className="text-destructive">*</span></Label>
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId} disabled={loadingSites || sites.length === 0}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={loadingSites ? "Cargando sitios..." : sites.length === 0 ? "Sin sitios" : "Seleccionar sitio..."} /></SelectTrigger>
                  <SelectContent>{sites.map((site) => <SelectItem key={site.id} value={site.id}>{site.site_name}{site.city ? ` — ${site.city}` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {showSingleSiteInfo && <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sitio</Label><div className="p-2.5 bg-muted/30 rounded-lg border border-border"><p className="text-sm text-foreground">{selectedSite?.site_name}{selectedSite?.city ? ` — ${selectedSite.city}` : ""}</p></div></div>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Emisión</Label><Input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencimiento</Label><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
            </div>
          </div>

          {lines.map((line, index) => (
            <div key={line.tempId} className="space-y-3">
              <div className="bg-card border border-border rounded-xl p-4 space-y-3 relative">
                {lines.length > 1 && <button onClick={() => setLines((prev) => prev.filter((_, currentIndex) => currentIndex !== index))} className="absolute top-3 right-3 p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors z-10" style={{ touchAction: "manipulation" }} aria-label="Eliminar línea"><Trash2 className="h-4 w-4" /></button>}
                <div className="space-y-1.5 relative">
                  <Label className="text-xs font-medium text-muted-foreground">Concepto</Label>
                  <div className="relative">
                    <Input
                      placeholder="Buscar o escribir el concepto"
                      value={line.concept}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateLine(index, "concept", value);
                        if (value) {
                          void searchCatalog(value, index);
                        } else {
                          setShowSearchResults(false);
                        }
                      }}
                      onFocus={() => { if (line.concept) void searchCatalog(line.concept, index); }}
                      className="bg-card border-border pr-10"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    {showSearchResults && activeSearchIndex === index && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => { setShowSearchResults(false); setActiveSearchIndex(null); }} />
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {searchLoading ? <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div> : searchResults.length > 0 ? searchResults.map((item) => {
                            const Icon = item.type === "pack" ? Boxes : item.type === "service" ? Wrench : Package;
                            return <button key={item.id} onClick={() => handleSelectCatalogItem(item, index)} className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0" style={{ touchAction: "manipulation" }}><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{item.name}</p><p className="text-xs text-muted-foreground">{item.code}</p></div><p className="text-sm font-medium text-foreground">{formatCurrency(item.price)}</p></div></button>;
                          }) : <div className="p-4 text-center text-sm text-muted-foreground">Sin resultados</div>}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Descripción</Label><Textarea placeholder="Descripción opcional..." value={line.description} onChange={(event) => updateLine(index, "description", event.target.value)} rows={2} className="bg-card border-border resize-none" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Precio</Label><Input type="number" min="0" step="0.01" value={line.unit_price || ""} onChange={(event) => updateLine(index, "unit_price", parseFloat(event.target.value) || 0)} className="bg-card border-border" /></div>
                  <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Cantidad</Label><Input type="number" min="0" step="0.01" value={line.quantity || ""} onChange={(event) => updateLine(index, "quantity", parseFloat(event.target.value) || 0)} className="bg-card border-border" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">DTO.</Label><Input type="number" min="0" max="100" step="0.01" value={line.discount_percent || ""} onChange={(event) => updateLine(index, "discount_percent", parseFloat(event.target.value) || 0)} className="bg-card border-border" /></div>
                  <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Impuesto</Label><Select value={line.tax_rate.toString()} onValueChange={(value) => updateLine(index, "tax_rate", parseFloat(value))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{taxOptions.map((tax) => <SelectItem key={tax.value} value={tax.value.toString()}>{tax.label}</SelectItem>)}</SelectContent></Select></div>
                </div>
              </div>
              <button onClick={addEmptyLine} className={cn("w-full p-3 border-2 border-dashed border-border rounded-xl", "bg-card hover:bg-muted/50 transition-colors", "flex items-center justify-center gap-2", "text-sm font-medium text-muted-foreground")} style={{ touchAction: "manipulation" }}><Plus className="h-4 w-4" /><span>Agregar línea</span></button>
            </div>
          ))}

          {lines.some((line) => line.concept.trim()) && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground font-medium">{formatCurrency(totals.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA</span><span className="text-foreground font-medium">{formatCurrency(totals.taxAmount)}</span></div>
              <div className="pt-2 border-t border-border"><div className="flex justify-between"><span className="text-base font-semibold text-foreground">Total</span><span className="text-base font-bold text-foreground">{formatCurrency(totals.total)}</span></div></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileNewInvoicePage;
