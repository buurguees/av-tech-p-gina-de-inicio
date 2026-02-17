/**
 * MobileNewQuotePage - Página para crear nuevo presupuesto en móvil
 * VERSIÓN: 2.0 - Bloques individuales por línea con nueva estructura
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  Package,
  Wrench,
  Boxes
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Client {
  id: string;
  company_name: string;
  client_number: string;
  lead_stage?: string;
}

interface Project {
  id: string;
  project_name: string;
  project_number: string;
  site_mode?: string | null;
}

interface ProjectSite {
  id: string;
  site_name: string;
  city: string | null;
  is_default: boolean;
  is_active: boolean;
}

interface TaxOption {
  value: number;
  label: string;
}

interface CatalogItem {
  id: string;
  type: 'product' | 'service' | 'pack';
  name: string;
  code: string;
  price: number;
  tax_rate: number;
  description?: string;
}

interface QuoteLine {
  tempId: string;
  group_name?: string;
  concept: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const MobileNewQuotePage = () => {
  const { userId, clientId } = useParams<{ userId: string; clientId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [sites, setSites] = useState<ProjectSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [loadingSites, setLoadingSites] = useState(false);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [sourceQuoteNumber, setSourceQuoteNumber] = useState<string | null>(null);
  
  // Search state for ProductSearchInput
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);

  const loadSourceQuoteData = useCallback(async (sourceQuoteId: string) => {
    try {
      const { data: quoteData, error: quoteError } = await supabase.rpc("get_quote", { p_quote_id: sourceQuoteId });
      if (quoteError) throw quoteError;
      if (!quoteData?.[0]) throw new Error("Presupuesto no encontrado");

      const quote = quoteData[0];
      setSourceQuoteNumber(quote.quote_number);
      setSelectedClientId(quote.client_id);
      if (quote.project_id) setSelectedProjectId(quote.project_id);

      const { data: linesData, error: linesError } = await supabase.rpc("get_quote_lines", { p_quote_id: sourceQuoteId });
      if (linesError) throw linesError;

      const mappedLines = (linesData || []).map((line: any) => ({
        tempId: crypto.randomUUID(),
        group_name: line.group_name || "",
        concept: line.concept,
        description: line.description || "",
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        discount_percent: line.discount_percent || 0,
        subtotal: line.subtotal,
        tax_amount: line.tax_amount,
        total: line.total,
      }));
      setLines(mappedLines);

      toast({ title: "Datos importados", description: `Datos cargados de ${quote.quote_number}` });
    } catch (error: any) {
      console.error("Error loading source quote:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchClients(), fetchSaleTaxes()]);
      
      const urlClientId = searchParams.get("clientId") || clientId;
      if (urlClientId) {
        setSelectedClientId(urlClientId);
        await fetchProjects(urlClientId);
      }

      const sourceQuoteId = searchParams.get("sourceQuoteId");
      if (sourceQuoteId) {
        await loadSourceQuoteData(sourceQuoteId);
      } else {
        addEmptyLine();
      }
      
      setLoading(false);
    };
    init();
  }, [clientId, searchParams]);

  useEffect(() => {
    if (selectedClientId) {
      fetchProjects(selectedClientId);
    } else {
      setProjects([]);
      setSelectedProjectId("");
    }
  }, [selectedClientId]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.rpc("list_clients", { p_search: null });
      if (error) throw error;
      setClients(
        (data || []).map((c: any) => ({
          id: c.id,
          company_name: c.company_name,
          client_number: c.client_number,
          lead_stage: c.lead_stage,
        }))
      );
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchProjects = async (clientId: string) => {
    try {
      const { data, error } = await supabase.rpc("list_projects", { p_search: "" });
      if (error) throw error;
      const clientProjects = (data || []).filter((p: any) => p.client_id === clientId);
      setProjects(
        clientProjects.map((p: any) => ({
          id: p.id,
          project_name: p.project_name,
          project_number: p.project_number,
          site_mode: p.site_mode || null,
        }))
      );
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    }
  };

  const fetchSitesForProject = async (projectId: string) => {
    try {
      setLoadingSites(true);
      const { data, error } = await supabase.rpc("list_project_sites", { p_project_id: projectId });
      if (error) throw error;
      const activeSites = ((data || []) as any[]).filter((s: any) => s.is_active);
      setSites(activeSites.map((s: any) => ({
        id: s.id,
        site_name: s.site_name,
        city: s.city,
        is_default: s.is_default,
        is_active: s.is_active,
      })));
      // Auto-select default site
      const defaultSite = activeSites.find((s: any) => s.is_default);
      if (defaultSite) setSelectedSiteId(defaultSite.id);
    } catch (error) {
      console.error("Error fetching sites:", error);
      setSites([]);
    } finally {
      setLoadingSites(false);
    }
  };

  const fetchSaleTaxes = async () => {
    try {
      const { data, error } = await supabase.rpc("list_taxes", { p_tax_type: "sales" });
      if (error) throw error;
      const options: TaxOption[] = (data || [])
        .filter((t: any) => t.is_active)
        .map((t: any) => ({ value: t.rate, label: t.name }));
      setTaxOptions(options);
      const defaultTax = (data || []).find((t: any) => t.is_default && t.is_active);
      setDefaultTaxRate(defaultTax?.rate ?? options[0]?.value ?? 21);
    } catch (error) {
      console.error("Error fetching taxes:", error);
      setTaxOptions([{ value: 21, label: "IVA 21%" }]);
    }
  };

  const searchCatalog = async (query: string, lineIndex: number) => {
    if (query.length < 1) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    setActiveSearchIndex(lineIndex);
    
    try {
      const keywords = query.toLowerCase().trim().split(/\s+/).filter(k => k.length > 0);
      
      const { data: productsData, error: productsError } = await supabase.rpc('list_products', {
        p_search: keywords[0] || query,
      });

      const { data: packsData, error: packsError } = await supabase.rpc('list_product_packs', {
        p_search: keywords[0] || query,
      });

      if (productsError) console.error('Error searching products:', productsError);
      if (packsError) console.error('Error searching packs:', packsError);

      const items: CatalogItem[] = [];

      if (productsData) {
        productsData.forEach((p: any) => {
          const itemType: 'product' | 'service' = p.type === 'service' ? 'service' : 'product';
          items.push({
            id: p.id,
            type: itemType,
            name: p.name,
            code: p.product_number,
            price: Number(p.base_price) || 0,
            tax_rate: Number(p.tax_rate) || 21,
            description: p.description || '',
          });
        });
      }

      if (packsData) {
        packsData.forEach((p: any) => {
          items.push({
            id: p.id,
            type: 'pack',
            name: p.name,
            code: p.pack_number,
            price: Number(p.final_price) || 0,
            tax_rate: Number(p.tax_rate) || 21,
            description: p.description || '',
          });
        });
      }

      const filteredItems = items.filter(item => {
        const searchText = `${item.name} ${item.code} ${item.description}`.toLowerCase();
        return keywords.every(keyword => searchText.includes(keyword));
      });

      setSearchResults(filteredItems.slice(0, 10));
      setShowSearchResults(filteredItems.length > 0);
    } catch (error) {
      console.error('Error searching catalog:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const calculateLineValues = useCallback((line: Partial<QuoteLine>): QuoteLine => {
    const quantity = line.quantity || 0;
    const unitPrice = line.unit_price || 0;
    const discountPercent = line.discount_percent || 0;
    const taxRate = line.tax_rate ?? defaultTaxRate;

    const subtotal = quantity * unitPrice * (1 - discountPercent / 100);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    return {
      tempId: line.tempId || crypto.randomUUID(),
      group_name: line.group_name || "",
      concept: line.concept || "",
      description: line.description || "",
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      discount_percent: discountPercent,
      subtotal,
      tax_amount: taxAmount,
      total,
    };
  }, [defaultTaxRate]);

  const addEmptyLine = useCallback(() => {
    const newLine = calculateLineValues({
      tempId: crypto.randomUUID(),
      group_name: "",
      concept: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: defaultTaxRate,
      discount_percent: 0,
    });
    setLines(prev => [...prev, newLine]);
  }, [calculateLineValues, defaultTaxRate]);

  const updateLine = useCallback((index: number, field: keyof QuoteLine, value: any) => {
    setLines(prev => {
      const updated = [...prev];
      updated[index] = calculateLineValues({ ...updated[index], [field]: value });
      return updated;
    });
  }, [calculateLineValues]);

  const removeLine = useCallback((index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSelectCatalogItem = (item: CatalogItem, lineIndex: number) => {
    updateLine(lineIndex, 'concept', item.name);
    updateLine(lineIndex, 'unit_price', item.price);
    updateLine(lineIndex, 'tax_rate', item.tax_rate);
    if (item.description) {
      updateLine(lineIndex, 'description', item.description);
    }
    if (item.code) {
      updateLine(lineIndex, 'group_name', item.code);
    }
    setShowSearchResults(false);
    setActiveSearchIndex(null);
  };

  const totals = useMemo(() => {
    const validLines = lines.filter(l => l.concept.trim());
    const subtotal = validLines.reduce((acc, l) => acc + l.subtotal, 0);
    const taxAmount = validLines.reduce((acc, l) => acc + l.tax_amount, 0);
    const total = validLines.reduce((acc, l) => acc + l.total, 0);
    return { subtotal, taxAmount, total };
  }, [lines]);

  const handleSave = async () => {
    if (!selectedClientId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" });
      return;
    }

    const validLines = lines.filter(l => l.concept.trim());
    if (validLines.length === 0) {
      toast({ title: "Error", description: "Añade al menos una línea", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 30);
      const calculatedValidUntil = validDate.toISOString().split("T")[0];

      const selectedProject = projects.find((p) => p.id === selectedProjectId);
      const { data: quoteData, error: quoteError } = await supabase.rpc("create_quote_with_number", {
        p_client_id: selectedClientId,
        p_project_name: selectedProject?.project_name || null,
        p_valid_until: calculatedValidUntil,
        p_project_id: selectedProjectId || null,
        p_site_id: selectedSiteId || null,
      });

      if (quoteError) throw quoteError;
      if (!quoteData?.[0]) throw new Error("No se pudo crear el presupuesto");

      const quoteId = quoteData[0].quote_id;
      const lineIds: string[] = [];

      for (const line of validLines) {
        const { data: lineIdData, error: lineError } = await supabase.rpc("add_quote_line", {
          p_quote_id: quoteId,
          p_concept: line.concept,
          p_description: line.description || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_discount_percent: line.discount_percent,
          p_group_name: line.group_name || null,
          p_line_order: null,
        });
        if (lineError) throw lineError;
        const lineId = typeof lineIdData === "string" ? lineIdData : lineIdData?.[0] || lineIdData;
        if (lineId) lineIds.push(lineId);
      }

      if (lineIds.length > 0) {
        await supabase.rpc("update_quote_lines_order", { p_quote_id: quoteId, p_line_ids: lineIds });
      }

      toast({ title: "Presupuesto creado", description: `${quoteData[0].quote_number} guardado` });
      navigate(`/nexo-av/${userId}/quotes`);
    } catch (error: any) {
      console.error("Error saving quote:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(`/nexo-av/${userId}/quotes`);
  };

  const availableClients = clients.filter(client => client.lead_stage !== 'LOST');

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* ===== HEADER ===== */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]"
            )}
            style={{ touchAction: 'manipulation' }}
            aria-label="Volver"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Atrás</span>
          </button>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-medium text-foreground truncate leading-tight">
              {sourceQuoteNumber ? `Nueva versión de ${sourceQuoteNumber}` : "Nuevo Presupuesto"}
            </h1>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            style={{ touchAction: 'manipulation', height: '32px' }}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Guardar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== FORMULARIO ===== */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-[80px]">
        <div className="px-4 py-4 space-y-4">
          {/* ===== BLOQUE: CLIENTE Y PROYECTO ===== */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cliente
              </Label>
              <Select 
                value={selectedClientId}
                onValueChange={(value) => {
                  setSelectedClientId(value);
                  setSelectedProjectId("");
                  setSites([]);
                  setSelectedSiteId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {availableClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClientId && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Proyecto
                </Label>
                <Select 
                  value={selectedProjectId}
                  onValueChange={(value) => {
                    setSelectedProjectId(value);
                    setSelectedSiteId("");
                    setSites([]);
                    const proj = projects.find(p => p.id === value);
                    if (proj?.site_mode === "MULTI_SITE" || proj?.site_mode === "SINGLE_SITE") {
                      fetchSitesForProject(value);
                    }
                  }}
                  disabled={projects.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={projects.length === 0 ? "Sin proyectos" : "Seleccionar proyecto..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_name} ({p.project_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Site selector for MULTI_SITE projects */}
            {selectedProjectId && projects.find(p => p.id === selectedProjectId)?.site_mode === "MULTI_SITE" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sitio de instalación <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedSiteId}
                  onValueChange={setSelectedSiteId}
                  disabled={loadingSites || sites.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingSites ? "Cargando sitios..." : sites.length === 0 ? "Sin sitios" : "Seleccionar sitio..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.site_name}{s.city ? ` — ${s.city}` : ""}{s.is_default ? " ★" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Proyecto multi-sitio: selecciona el sitio para este presupuesto.
                </p>
              </div>
            )}

            {/* Info display for SINGLE_SITE projects */}
            {selectedProjectId && projects.find(p => p.id === selectedProjectId)?.site_mode === "SINGLE_SITE" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sitio de instalación
                </Label>
                {loadingSites ? (
                  <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg border border-border">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Cargando...</span>
                  </div>
                ) : selectedSiteId && sites.length > 0 ? (
                  <div className="p-2.5 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm text-foreground">
                      {sites.find(s => s.id === selectedSiteId)?.site_name || "Sitio por defecto"}
                      {sites.find(s => s.id === selectedSiteId)?.city ? ` — ${sites.find(s => s.id === selectedSiteId)?.city}` : ""}
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">Se asignará automáticamente</p>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Proyecto sitio único: se asigna el sitio por defecto automáticamente.
                </p>
              </div>
            )}
          </div>

          {/* ===== BLOQUES DE LÍNEAS ===== */}
          {lines.map((line, index) => (
            <div key={line.tempId} className="space-y-3">
              {/* Bloque de línea */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-3 relative">
                {/* Botón eliminar línea */}
                {lines.length > 1 && (
                  <button
                    onClick={() => removeLine(index)}
                    className="absolute top-3 right-3 p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors z-10"
                    style={{ touchAction: 'manipulation' }}
                    aria-label="Eliminar línea"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                {/* Grupo y Concepto */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Grupo
                    </Label>
                    <Input
                      placeholder="Grupo"
                      value={line.group_name || ""}
                      onChange={(e) => updateLine(index, 'group_name', e.target.value)}
                      className="bg-card border-border"
                    />
                  </div>

                  <div className="space-y-1.5 relative">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Concepto
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Buscar o escribir el concepto"
                        value={line.concept}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateLine(index, 'concept', value);
                          if (value.length > 0) {
                            searchCatalog(value, index);
                          } else {
                            setShowSearchResults(false);
                          }
                        }}
                        onFocus={() => {
                          if (line.concept.length > 0) {
                            searchCatalog(line.concept, index);
                          }
                        }}
                        className="bg-card border-border pr-10"
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      
                      {/* Dropdown de resultados de búsqueda */}
                      {showSearchResults && activeSearchIndex === index && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => {
                              setShowSearchResults(false);
                              setActiveSearchIndex(null);
                            }}
                          />
                          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {searchLoading ? (
                              <div className="p-4 text-center">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                              </div>
                            ) : searchResults.length > 0 ? (
                              searchResults.map((item) => {
                                const Icon = item.type === 'pack' ? Boxes : item.type === 'service' ? Wrench : Package;
                                return (
                                  <button
                                    key={item.id}
                                    onClick={() => handleSelectCatalogItem(item, index)}
                                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                                    style={{ touchAction: 'manipulation' }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">{item.code}</p>
                                      </div>
                                      <p className="text-sm font-medium text-foreground">{formatCurrency(item.price)}</p>
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                Sin resultados
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Descripción */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Descripción
                  </Label>
                  <Textarea
                    placeholder="Descripción opcional..."
                    value={line.description || ""}
                    onChange={(e) => updateLine(index, 'description', e.target.value)}
                    rows={2}
                    className="bg-card border-border resize-none"
                  />
                </div>

                {/* Precio y Cantidad */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Precio
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={line.unit_price || ""}
                      onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="bg-card border-border"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Cantidad
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="1"
                      value={line.quantity || ""}
                      onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="bg-card border-border"
                    />
                  </div>
                </div>

                {/* DTO y Impuesto */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      DTO.
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0"
                      value={line.discount_percent || ""}
                      onChange={(e) => updateLine(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                      className="bg-card border-border"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Impuesto
                    </Label>
                    <Select 
                      value={line.tax_rate.toString()}
                      onValueChange={(value) => updateLine(index, 'tax_rate', parseFloat(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {taxOptions.map(tax => (
                          <SelectItem key={tax.value} value={tax.value.toString()}>
                            {tax.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Botón añadir línea debajo de cada bloque */}
              <button
                onClick={addEmptyLine}
                className={cn(
                  "w-full p-3 border-2 border-dashed border-border rounded-xl",
                  "bg-card hover:bg-muted/50 transition-colors",
                  "flex items-center justify-center gap-2",
                  "text-sm font-medium text-muted-foreground"
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <Plus className="h-4 w-4" />
                <span>Agregar línea</span>
              </button>
            </div>
          ))}

          {/* Totales */}
          {lines.some(l => l.concept.trim()) && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA</span>
                <span className="text-foreground font-medium">{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-base font-semibold text-foreground">Total</span>
                  <span className="text-base font-bold text-foreground">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileNewQuotePage;
