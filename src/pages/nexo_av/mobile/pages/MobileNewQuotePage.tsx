/**
 * MobileNewQuotePage - Página para crear nuevo presupuesto en móvil
 * VERSIÓN: 2.0 - Bloques individuales por línea con nueva estructura
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Boxes,
  Clock,
  Link2,
  X
} from "lucide-react";
import { useDisplacementRules } from "@/pages/nexo_av/shared/hooks/useDisplacementRules";
import { useCompanionRules } from "@/pages/nexo_av/shared/hooks/useCompanionRules";
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
  product_id?: string;
}

interface QuoteLineRpcRow {
  group_name?: string | null;
  concept: string | null;
  description?: string | null;
  quantity: number | null;
  unit_price: number | null;
  tax_rate: number | null;
  discount_percent?: number | null;
  subtotal: number | null;
  tax_amount: number | null;
  total: number | null;
}

interface ClientRpcRow {
  id: string;
  company_name: string;
  client_number: string;
  lead_stage?: string | null;
}

interface ProjectRpcRow {
  id: string;
  client_id: string;
  project_name: string;
  project_number: string;
  site_mode?: string | null;
}

interface ProjectSiteRpcRow {
  id: string;
  site_name: string;
  city: string | null;
  is_default: boolean;
  is_active: boolean;
}

interface TaxRpcRow {
  rate: number;
  name: string;
  is_active: boolean;
  is_default: boolean;
}

type QuoteLineFieldValue = string | number | undefined | boolean;

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

  const {
    config: displacementConfig,
    suppressedRef,
    setSuppressedKmKeys,
    resolveHours,
    isDisplacementChild,
  } = useDisplacementRules();

  const {
    suppressedRef: companionSuppressedRef,
    setSuppressedTriggerKeys: setCompanionSuppressedKeys,
    findRuleForTrigger,
    isCompanionChild,
  } = useCompanionRules();

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

      const mappedLines = ((linesData || []) as QuoteLineRpcRow[]).map((line) => ({
        tempId: crypto.randomUUID(),
        group_name: line.group_name || "",
        concept: line.concept || "",
        description: line.description || "",
        quantity: line.quantity || 0,
        unit_price: line.unit_price || 0,
        tax_rate: line.tax_rate || 21,
        discount_percent: line.discount_percent || 0,
        subtotal: line.subtotal || 0,
        tax_amount: line.tax_amount || 0,
        total: line.total || 0,
      }));
      setLines(mappedLines);

      toast({ title: "Datos importados", description: `Datos cargados de ${quote.quote_number}` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo cargar el presupuesto origen";
      console.error("Error loading source quote:", error);
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }, [toast]);

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
        ((data || []) as ClientRpcRow[]).map((c) => ({
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
      const clientProjects = ((data || []) as ProjectRpcRow[]).filter((p) => p.client_id === clientId);
      setProjects(
        clientProjects.map((p) => ({
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
      const activeSites = ((data || []) as ProjectSiteRpcRow[]).filter((s) => s.is_active);
      setSites(activeSites.map((s) => ({
        id: s.id,
        site_name: s.site_name,
        city: s.city,
        is_default: s.is_default,
        is_active: s.is_active,
      })));
      // Auto-select default site
      const defaultSite = activeSites.find((s) => s.is_default);
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
      const taxRows = (data || []) as TaxRpcRow[];
      const options: TaxOption[] = taxRows
        .filter((t) => t.is_active)
        .map((t) => ({ value: t.rate, label: t.name }));
      setTaxOptions(options);
      const defaultTax = taxRows.find((t) => t.is_default && t.is_active);
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
      const searchTerm = keywords[0] || query;

      const { data: catalogData, error: catalogError } = await supabase.rpc('list_catalog_products_search', {
        p_search: searchTerm,
        p_include_inactive: false,
      });

      if (catalogError) {
        console.error('Error searching catalog:', catalogError);
        setSearchResults([]);
        setShowSearchResults(false);
        setSearchLoading(false);
        return;
      }

      const typeMap: Record<string, 'product' | 'service' | 'pack'> = {
        PRODUCT: 'product',
        SERVICE: 'service',
        BUNDLE: 'pack',
      };

      const items: CatalogItem[] = (catalogData || []).map((p: { id: string; sku: string; name: string; description: string; product_type: string; sale_price_effective: number; tax_rate: number }) => ({
        id: p.id,
        type: typeMap[p.product_type] || 'product',
        name: p.name || '',
        code: p.sku || '',
        price: Number(p.sale_price_effective ?? 0),
        tax_rate: Number(p.tax_rate ?? 21),
        description: p.description || '',
      }));

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
      product_id: line.product_id,
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

  const updateLine = useCallback((index: number, field: keyof QuoteLine, value: QuoteLineFieldValue) => {
    setLines(prev => {
      const updated = [...prev];
      updated[index] = calculateLineValues({ ...updated[index], [field]: value });

      const cfg = displacementConfig;
      if (field === "quantity" && cfg && updated[index].product_id === cfg.kmProductId) {
        const km = value as number;
        const parentKey = updated[index].tempId || String(index);
        if (!suppressedRef.current.has(parentKey)) {
          const hours = resolveHours(km);
          const hoursIdx = updated.findIndex((l, i) => i !== index && l.product_id === cfg.hoursProductId);
          if (hours > 0) {
            const baseHours =
              hoursIdx >= 0
                ? updated[hoursIdx]
                : {
                    tempId: crypto.randomUUID(),
                    concept: cfg.hoursProductName,
                    description: "",
                    unit_price: cfg.hoursUnitPrice,
                    tax_rate: cfg.hoursTaxRate,
                    discount_percent: 0,
                    product_id: cfg.hoursProductId,
                    group_name: "",
                  };
            const newHoursLine = calculateLineValues({ ...baseHours, quantity: hours });
            if (hoursIdx >= 0) {
              updated[hoursIdx] = newHoursLine;
              if (hoursIdx !== index + 1) {
                const [removed] = updated.splice(hoursIdx, 1);
                updated.splice(index + 1, 0, removed);
              }
            } else {
              updated.splice(index + 1, 0, newHoursLine);
            }
          } else if (hoursIdx >= 0) {
            updated.splice(hoursIdx, 1);
          }
        }
      }

      // Lógica de acompañante: actualizar cantidad companion si cambia qty del trigger
      if (field === "quantity" && updated[index].product_id) {
        const rule = findRuleForTrigger(updated[index].product_id!);
        if (rule) {
          const triggerKey = updated[index].tempId || String(index);
          if (!companionSuppressedRef.current.has(triggerKey)) {
            const newQty = value as number;
            const companionIdx = index + 1;
            if (
              companionIdx < updated.length &&
              updated[companionIdx].product_id === rule.companionProductId
            ) {
              updated[companionIdx] = calculateLineValues({
                ...updated[companionIdx],
                quantity: newQty * rule.quantityRatio,
                unit_price: rule.companionSalePrice,
              });
            }
          }
        }
      }

      return updated;
    });
  }, [calculateLineValues, displacementConfig, resolveHours, suppressedRef, findRuleForTrigger, companionSuppressedRef]);

  const removeLine = useCallback((index: number) => {
    setLines(prev => {
      let filtered = prev.filter((_, i) => i !== index);
      if (displacementConfig) {
        if (prev[index]?.product_id === displacementConfig.kmProductId) {
          filtered = filtered.filter((l) => l.product_id !== displacementConfig.hoursProductId);
          const removedKey = prev[index].tempId;
          if (removedKey) {
            setSuppressedKmKeys((s) => { const n = new Set(s); n.delete(removedKey); return n; });
          }
        } else if (isDisplacementChild(prev, index)) {
          const parentLine = prev[index - 1];
          const parentKey = parentLine?.tempId;
          if (parentKey) setSuppressedKmKeys((s) => new Set([...s, parentKey]));
        }
      }
      // Lógica de acompañante
      const removedLine = prev[index];
      if (removedLine?.product_id) {
        const rule = findRuleForTrigger(removedLine.product_id);
        if (rule) {
          filtered = filtered.filter((_, i) => {
            const origIdx = i >= index ? i + 1 : i;
            return !(origIdx === index + 1 && prev[index + 1]?.product_id === rule.companionProductId);
          });
          const triggerKey = removedLine.tempId;
          if (triggerKey) setCompanionSuppressedKeys((s) => { const n = new Set(s); n.delete(triggerKey); return n; });
        } else if (isCompanionChild(prev, index)) {
          const parentLine = prev[index - 1];
          const parentKey = parentLine?.tempId;
          if (parentKey) setCompanionSuppressedKeys((s) => new Set([...s, parentKey]));
        }
      }
      return filtered;
    });
  }, [displacementConfig, isDisplacementChild, setSuppressedKmKeys, findRuleForTrigger, isCompanionChild, setCompanionSuppressedKeys]);

  const handleSelectCatalogItem = (item: CatalogItem, lineIndex: number) => {
    setLines(prev => {
      const updated = [...prev];
      updated[lineIndex] = calculateLineValues({
        ...updated[lineIndex],
        concept: item.name,
        unit_price: item.price,
        tax_rate: item.tax_rate,
        description: item.description || updated[lineIndex].description,
        group_name: item.code || updated[lineIndex].group_name,
        product_id: item.id,
      });

      // Auto-añadir companion si hay regla y no está suprimida
      if (item.id) {
        const rule = findRuleForTrigger(item.id);
        if (rule) {
          const triggerKey = updated[lineIndex].tempId || String(lineIndex);
          if (!companionSuppressedRef.current.has(triggerKey)) {
            const triggerQty = updated[lineIndex].quantity;
            const companionLine = calculateLineValues({
              tempId: crypto.randomUUID(),
              group_name: "",
              concept: rule.companionName,
              description: "",
              quantity: triggerQty * rule.quantityRatio,
              unit_price: rule.companionSalePrice,
              tax_rate: rule.companionTaxRate,
              discount_percent: 0,
              product_id: rule.companionProductId,
            });
            const existingCompIdx = updated.findIndex((l, i) => i > lineIndex && l.product_id === rule.companionProductId);
            if (existingCompIdx >= 0) {
              updated[existingCompIdx] = companionLine;
              if (existingCompIdx !== lineIndex + 1) {
                const [removed] = updated.splice(existingCompIdx, 1);
                updated.splice(lineIndex + 1, 0, removed);
              }
            } else {
              updated.splice(lineIndex + 1, 0, companionLine);
            }
          }
        }
      }

      return updated;
    });
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el presupuesto";
      console.error("Error saving quote:", error);
      toast({ title: "Error", description: message, variant: "destructive" });
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
    <div className="mobile-page-viewport">
      {/* ===== HEADER ===== */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className={cn(
              "h-11 min-w-11 px-3 min-[400px]:px-4 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
              "text-sm font-medium leading-none",
              "bg-card border border-border text-foreground",
              "active:scale-95 transition-all duration-200",
              "shadow-sm"
            )}
            style={{ touchAction: 'manipulation' }}
            aria-label="Volver"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden min-[400px]:inline">Atrás</span>
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
              "h-11 min-w-11 px-3 min-[400px]:px-4 flex items-center justify-center gap-1.5 rounded-full flex-shrink-0",
              "text-sm font-medium leading-none",
              "bg-primary text-primary-foreground",
              "active:scale-95 transition-all duration-200",
              "shadow-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            style={{ touchAction: 'manipulation' }}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden min-[400px]:inline">Guardando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span className="hidden min-[400px]:inline">Guardar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== FORMULARIO ===== */}
      <div className="mobile-scroll-area">
        <div className="py-4 space-y-4">
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
          {lines.map((line, index) => {
            const isChild = isDisplacementChild(lines, index);
            const isCompChild = isCompanionChild(lines, index);

            // ── Sub-sección de acompañante ──────────────────────────
            if (isCompChild) {
              return (
                <div key={`${line.tempId}-companion`} className="ml-4 border-l-2 border-l-blue-400/50 pl-3">
                  <div className="bg-muted/10 border border-blue-300/30 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="h-3.5 w-3.5 text-blue-400/70 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground truncate">{line.concept}</p>
                        <p className="text-xs text-muted-foreground/60 tabular-nums">{line.quantity} · {formatCurrency(line.subtotal)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLine(index)}
                      className="p-1.5 text-muted-foreground/40 hover:text-muted-foreground/70 rounded-lg transition-colors flex-shrink-0"
                      style={{ touchAction: 'manipulation' }}
                      title="No incluir producto acompañante en este documento"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            // ── Sub-sección de desplazamiento ──────────────────────
            if (isChild) {
              return (
                <div key={`${line.tempId}-child`} className="ml-4 border-l-2 border-l-orange-300/50 pl-3">
                  <div className="bg-muted/10 border border-orange-300/30 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-3.5 w-3.5 text-orange-400/70 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground truncate">{line.concept}</p>
                        <p className="text-xs text-muted-foreground/60 tabular-nums">{line.quantity} h · {formatCurrency(line.subtotal)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLine(index)}
                      className="p-1.5 text-muted-foreground/40 hover:text-muted-foreground/70 rounded-lg transition-colors flex-shrink-0"
                      style={{ touchAction: 'manipulation' }}
                      title="No cobrar horas de desplazamiento en este documento"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
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

                {/* REF y Concepto */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground" title="Nº de producto (aparece como REF en el PDF)">
                      REF
                    </Label>
                    <Input
                      placeholder="Nº producto"
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
            );
          })}

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
