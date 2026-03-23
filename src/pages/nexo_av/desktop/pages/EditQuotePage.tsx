// EditQuotePage - Quote editing with tax selector
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Loader2, FileText, GripVertical, MapPin, ChevronDown, Clock, Link2, X } from "lucide-react";
import { motion } from "motion/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useToast } from "@/hooks/use-toast";
import ProductSearchInput from "../components/common/ProductSearchInput";
import { QUOTE_STATUSES, getStatusInfo } from "@/constants/quoteStatuses";
import { SortableLineRow } from "../components/documents/SortableLineRow";
import { useDocumentLines } from "../hooks/useDocumentLines";
import { useDisplacementRules } from "@/pages/nexo_av/shared/hooks/useDisplacementRules";
import { useCompanionRules } from "@/pages/nexo_av/shared/hooks/useCompanionRules";

// Estados que bloquean la edición
const LOCKED_STATES = ["SENT", "APPROVED", "REJECTED", "EXPIRED", "INVOICED"];
interface Client {
  id: string;
  company_name: string;
  lead_stage?: string;
}
interface Project {
  id: string;
  project_number: string;
  project_name: string;
  site_mode?: string;
}
interface ProjectSite {
  id: string;
  site_name: string;
  city: string | null;
  is_default: boolean;
}
interface QuoteLine {
  id?: string;
  tempId?: string;
  concept: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  line_order?: number;
  group_name?: string;
  product_id?: string;
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}
interface TaxOption {
  value: number;
  label: string;
}
interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_name: string | null;
  site_id: string | null;
  site_name: string | null;
  status: string;
  valid_until: string | null;
  created_at: string;
}
const EditQuotePageDesktop = () => {
  const navigate = useNavigate();
  const {
    userId,
    quoteId
  } = useParams<{
    userId: string;
    quoteId: string;
  }>();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>("DRAFT");
  const [validUntil, setValidUntil] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);
  const [dirtyLines, setDirtyLines] = useState<Set<number>>(new Set());
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [expandedDescs, setExpandedDescs] = useState<Set<string>>(new Set());

  const toggleDesc = useCallback((key: string) => {
    setExpandedDescs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const {
    expandedDescriptionIndex,
    setExpandedDescriptionIndex,
    numericInputValues,
    setNumericInputValues,
    calculateLineValues: calcLine,
    handleNumericInputChange: handleNumericChange,
    clearNumericInputKey,
    getNumericDisplayValue,
    computeTotals,
  } = useDocumentLines(defaultTaxRate, taxOptions);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  useEffect(() => {
    if (quoteId) {
      fetchQuoteData();
      fetchClients();
      fetchSaleTaxes();
    }
  }, [quoteId]);

  // Filter out LOST clients
  const availableClients = useMemo(() => {
    return clients.filter(client => client.lead_stage !== 'LOST');
  }, [clients]);

  // Fetch projects when client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchClientProjects(selectedClientId);
    } else {
      setProjects([]);
      setSelectedProjectId("");
    }
  }, [selectedClientId]);

  // Set project after projects are loaded and quote has project_id
  useEffect(() => {
    if (projects.length > 0 && quote?.project_id && !selectedProjectId) {
      const projectExists = projects.some(p => p.id === quote.project_id);
      if (projectExists) {
        setSelectedProjectId(quote.project_id);
      }
    }
  }, [projects, quote?.project_id, selectedProjectId]);

  // Load sites when project changes
  useEffect(() => {
    if (selectedProjectId) {
      const proj = projects.find(p => p.id === selectedProjectId);
      if (proj?.site_mode === "MULTI_SITE" || proj?.site_mode === "SINGLE_SITE") {
        fetchSites(selectedProjectId);
      } else {
        setProjectSites([]);
        setSelectedSiteId("");
      }
    } else {
      setProjectSites([]);
      setSelectedSiteId("");
    }
  }, [selectedProjectId, projects]);

  // Set site_id from quote after sites are loaded
  useEffect(() => {
    if (projectSites.length > 0 && quote?.site_id && !selectedSiteId) {
      const siteExists = projectSites.some(s => s.id === quote.site_id);
      if (siteExists) {
        setSelectedSiteId(quote.site_id);
      }
    }
  }, [projectSites, quote?.site_id]);

  // Update valid_until when status changes to DRAFT
  // This ensures that whenever we're in DRAFT status, the date is recalculated
  useEffect(() => {
    if (currentStatus === "DRAFT") {
      const today = new Date();
      const validUntilDate = new Date(today);
      validUntilDate.setDate(validUntilDate.getDate() + 30);
      const newValidUntil = validUntilDate.toISOString().split("T")[0];
      // Only update if different to avoid unnecessary re-renders
      if (validUntil !== newValidUntil) {
        setValidUntil(newValidUntil);
      }
    }
    // When status changes from DRAFT to another status, keep the current validUntil
    // (it will be saved as-is in handleSave)
  }, [currentStatus]);
  const fetchQuoteData = async () => {
    try {
      setLoading(true);

      // Fetch quote - get_quote ahora devuelve project_id directamente
      const {
        data: quoteData,
        error: quoteError
      } = await supabase.rpc("get_quote", {
        p_quote_id: quoteId
      });
      if (quoteError) throw quoteError;
      if (!quoteData || quoteData.length === 0) throw new Error("Presupuesto no encontrado");
      const quoteInfo = quoteData[0];

      // Verificar si el presupuesto está bloqueado
      const isLocked = LOCKED_STATES.includes(quoteInfo.status);
      if (isLocked) {
        toast({
          title: "Presupuesto bloqueado",
          description: `El presupuesto está en estado "${getStatusInfo(quoteInfo.status).label}" y no puede ser editado.`,
          variant: "destructive"
        });
        navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
        return;
      }

      // Set quote con todos los datos incluyendo project_id
      setQuote(quoteInfo);
      setSelectedClientId(quoteInfo.client_id);
      setCurrentStatus(quoteInfo.status);

      // If status is DRAFT, calculate valid_until as today + 30 days
      // Otherwise, use the stored valid_until date
      if (quoteInfo.status === "DRAFT") {
        const today = new Date();
        const validUntilDate = new Date(today);
        validUntilDate.setDate(validUntilDate.getDate() + 30);
        setValidUntil(validUntilDate.toISOString().split("T")[0]);
      } else {
        setValidUntil(quoteInfo.valid_until ? quoteInfo.valid_until.split('T')[0] : '');
      }

      // Fetch quote lines (already ordered by line_order from DB)
      const {
        data: linesData,
        error: linesError
      } = await supabase.rpc("get_quote_lines", {
        p_quote_id: quoteId
      });
      if (linesError) throw linesError;
      setLines((linesData || []).map((line: any) => ({
        ...line,
        description: line.description || ""
      })));
    } catch (error: any) {
      console.error("Error fetching quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el presupuesto",
        variant: "destructive"
      });
      navigate(`/nexo-av/${userId}/quotes`);
    } finally {
      setLoading(false);
    }
  };
  const fetchClients = async () => {
    try {
      const {
        data,
        error
      } = await supabase.rpc("list_clients", {
        p_search: null
      });
      if (error) throw error;
      setClients(data?.map((c: any) => ({
        id: c.id,
        company_name: c.company_name,
        lead_stage: c.lead_stage
      })) || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };
  const fetchClientProjects = async (clientId: string) => {
    setLoadingProjects(true);
    try {
      const {
        data,
        error
      } = await supabase.rpc("list_projects", {
        p_search: null
      });
      if (error) throw error;
      const clientProjects = (data || []).filter((p: any) => p.client_id === clientId);
      setProjects(clientProjects.map((p: any) => ({
        id: p.id,
        project_number: p.project_number,
        project_name: p.project_name,
        site_mode: p.site_mode || undefined,
      })));
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };
  const fetchSites = async (projectId: string) => {
    try {
      const { data, error } = await supabase.rpc("list_project_sites", { p_project_id: projectId });
      if (error) throw error;
      const sites: ProjectSite[] = (data || [])
        .filter((s: any) => s.is_active)
        .map((s: any) => ({
          id: s.id,
          site_name: s.site_name,
          city: s.city,
          is_default: s.is_default,
        }));
      setProjectSites(sites);
      // Auto-select for SINGLE_SITE
      const proj = projects.find(p => p.id === projectId);
      if (proj?.site_mode === "SINGLE_SITE" && sites.length > 0) {
        const defaultSite = sites.find(s => s.is_default) || sites[0];
        setSelectedSiteId(defaultSite.id);
      }
    } catch (error) {
      console.error("Error fetching sites:", error);
      setProjectSites([]);
    }
  };

  const fetchSaleTaxes = async () => {
    try {
      const {
        data,
        error
      } = await supabase.rpc("list_taxes", {
        p_tax_type: "sales"
      });
      if (error) throw error;
      const options: TaxOption[] = (data || []).filter((t: any) => t.is_active).map((t: any) => ({
        value: t.rate,
        label: t.name
      }));
      setTaxOptions(options);
      const defaultTax = (data || []).find((t: any) => t.is_default && t.is_active);
      if (defaultTax) {
        setDefaultTaxRate(defaultTax.rate);
      } else if (options.length > 0) {
        setDefaultTaxRate(options[0].value);
      }
    } catch (error) {
      console.error("Error fetching taxes:", error);
      setTaxOptions([{
        value: 21,
        label: "IVA 21%"
      }]);
    }
  };
  const calculateLineValues = (line: Partial<QuoteLine>): QuoteLine => {
    return { ...calcLine(line), description: line.description || "" } as QuoteLine;
  };
  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({});
  const autoSaveLine = async (line: QuoteLine) => {
    // Only save if concept is present or it's an existing line being cleared (which might be valid? no, usually require concept)
    if (!line.concept && !line.id) return;

    // Use tempId or id as key
    const uniqueKey = line.id || line.tempId || "unknown";
    try {
      // @ts-ignore
      const {
        data: rpcData,
        error
      } = await supabase.rpc("auto_save_quote_line", {
        p_line_id: line.id || null,
        // null for new
        p_quote_id: quoteId,
        p_concept: line.concept,
        p_description: line.description || null,
        p_quantity: line.quantity,
        p_unit_price: line.unit_price,
        p_tax_rate: line.tax_rate,
        p_discount_percent: line.discount_percent,
        p_group_name: line.group_name || null,
        p_line_order: line.line_order // We will handle order separately usually, but can pass it if known
      });
      if (error) throw error;

      // Update state if new line got an ID
      const data = rpcData as any;
      if (!line.id && data?.line_id) {
        setLines(prev => prev.map(l => {
          if (l.tempId === line.tempId) {
            return {
              ...l,
              id: data.line_id,
              isNew: false,
              isModified: false
            };
          }
          return l;
        }));
      } else {
        // Just clear isModified
        setLines(prev => prev.map(l => {
          if (l.id === line.id) {
            return {
              ...l,
              isModified: false
            };
          }
          return l;
        }));
      }
      setLastSavedTime(new Date());
    } catch (err) {
      console.error("Auto-save failed", err);
    }
  };
  const addLine = () => {
    const newLine = calculateLineValues({
      tempId: crypto.randomUUID(),
      concept: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: defaultTaxRate,
      discount_percent: 0,
      isNew: true
    });
    setLines([...lines, newLine]);
  };
  const updateLine = (index: number, field: keyof QuoteLine, value: any) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = calculateLineValues({
        ...updated[index],
        [field]: value,
        isModified: !updated[index].isNew,
      });

      const cfg = displacementConfig;
      if (field === "quantity" && cfg && updated[index].product_id === cfg.kmProductId) {
        const km = value as number;
        const parentKey = updated[index].id || updated[index].tempId || String(index);
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
                    line_order: updated.length + 1,
                    isNew: true,
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
          return updated.map((l, i) => ({ ...l, line_order: i + 1 }));
        }
      }

      // Lógica de acompañante: actualizar cantidad companion si cambia qty del trigger
      if (field === "quantity" && updated[index].product_id) {
        const rule = findRuleForTrigger(updated[index].product_id!);
        if (rule) {
          const triggerKey = updated[index].id || updated[index].tempId || String(index);
          if (!companionSuppressedRef.current.has(triggerKey)) {
            const newQty = value as number;
            const companionIdx = index + 1;
            if (
              companionIdx < updated.length &&
              updated[companionIdx].product_id === rule.companionProductId &&
              !updated[companionIdx].isDeleted
            ) {
              const newCompanionQty = newQty * rule.quantityRatio;
              updated[companionIdx] = calculateLineValues({
                ...updated[companionIdx],
                quantity: newCompanionQty,
                unit_price: rule.companionSalePrice,
                isModified: updated[companionIdx].id ? true : updated[companionIdx].isModified,
              });
            }
          }
        }
      }

      return updated;
    });

    // Debounced Auto-Save — accedemos a la línea actualizada tras el setState
    const updatedLine = calculateLineValues({
      ...lines[index],
      [field]: value,
      isModified: !lines[index]?.isNew,
    });
    const uniqueKey = updatedLine.id || updatedLine.tempId;
    if (uniqueKey) {
      if (debounceRef.current[uniqueKey]) clearTimeout(debounceRef.current[uniqueKey]);
      debounceRef.current[uniqueKey] = setTimeout(() => {
        autoSaveLine(updatedLine);
      }, 1000);
    }
  };
  const handleProductSelect = (index: number, item: {
    id?: string;
    type?: string;
    name: string;
    code: string;
    price: number;
    tax_rate: number;
    description?: string;
    category_name?: string;
    subcategory_name?: string;
  }) => {
    const updatedLines = [...lines];
    const currentQuantity = updatedLines[index].quantity;
    const lineData = {
      ...updatedLines[index],
      concept: item.name,
      description: item.description || "",
      unit_price: item.price,
      tax_rate: item.tax_rate || defaultTaxRate,
      quantity: currentQuantity,
      group_name: item.code || updatedLines[index].group_name,
      product_id: item.id,
      isModified: !updatedLines[index].isNew,
    };
    updatedLines[index] = calculateLineValues(lineData);

    // Auto-añadir companion si hay regla y no está suprimida
    if (item.id) {
      const rule = findRuleForTrigger(item.id);
      if (rule) {
        const triggerKey = updatedLines[index].id || updatedLines[index].tempId || String(index);
        if (!companionSuppressedRef.current.has(triggerKey)) {
          const companionLine = calculateLineValues({
            tempId: crypto.randomUUID(),
            concept: rule.companionName,
            description: "",
            quantity: currentQuantity * rule.quantityRatio,
            unit_price: rule.companionSalePrice,
            tax_rate: rule.companionTaxRate,
            discount_percent: 0,
            product_id: rule.companionProductId,
            line_order: updatedLines.length + 1,
            isNew: true,
          });
          const existingCompIdx = updatedLines.findIndex((l, i) => i > index && l.product_id === rule.companionProductId && !l.isDeleted);
          if (existingCompIdx >= 0) {
            updatedLines[existingCompIdx] = { ...companionLine, id: updatedLines[existingCompIdx].id, isNew: false, isModified: true };
            if (existingCompIdx !== index + 1) {
              const [removed] = updatedLines.splice(existingCompIdx, 1);
              updatedLines.splice(index + 1, 0, removed);
            }
          } else {
            updatedLines.splice(index + 1, 0, companionLine);
          }
        }
      }
    }

    setLines(updatedLines.map((l, i) => ({ ...l, line_order: i + 1 })));
  };
  const removeLine = (index: number) => {
    setLines((prev) => {
      const line = prev[index];
      let filtered: QuoteLine[];

      if (line.id) {
        // Mark existing line for deletion
        filtered = prev.map((l, i) => i === index ? { ...l, isDeleted: true } : l);
      } else {
        // Remove new line completely
        filtered = prev.filter((_, i) => i !== index);
      }

      if (displacementConfig) {
        if (line.product_id === displacementConfig.kmProductId) {
          filtered = filtered.map((l) =>
            l.product_id === displacementConfig.hoursProductId ? { ...l, isDeleted: true } : l
          );
          const removedKey = line.id || line.tempId;
          if (removedKey) {
            setSuppressedKmKeys((s) => { const n = new Set(s); n.delete(removedKey); return n; });
          }
        } else if (isDisplacementChild(prev, index)) {
          const parentLine = prev[index - 1];
          const parentKey = parentLine?.id || parentLine?.tempId;
          if (parentKey) setSuppressedKmKeys((s) => new Set([...s, parentKey]));
        }
      }

      // Lógica de acompañante
      if (line.product_id) {
        const rule = findRuleForTrigger(line.product_id);
        if (rule) {
          // Es un trigger: marcar companion como eliminado
          filtered = filtered.map((l, i) => {
            if (i === index + 1 && l.product_id === rule.companionProductId && !l.isDeleted) {
              return l.id ? { ...l, isDeleted: true } : l;
            }
            return l;
          });
          // Para líneas sin id (nuevas), filtrarlas
          filtered = filtered.filter((l, i) => {
            if (i === index + 1 && l.product_id === rule.companionProductId && !l.id) return false;
            return true;
          });
          const triggerKey = line.id || line.tempId;
          if (triggerKey) setCompanionSuppressedKeys((s) => { const n = new Set(s); n.delete(triggerKey); return n; });
        } else if (isCompanionChild(prev, index)) {
          const parentLine = prev[index - 1];
          const parentKey = parentLine?.id || parentLine?.tempId;
          if (parentKey) setCompanionSuppressedKeys((s) => new Set([...s, parentKey]));
        }
      }

      return filtered;
    });
  };
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLines((prev) => {
      const visible = prev.filter((l) => !l.isDeleted);
      const oldIdx = visible.findIndex((l) => (l.id || l.tempId) === active.id);
      const newIdx = visible.findIndex((l) => (l.id || l.tempId) === over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const reordered = arrayMove(visible, oldIdx, newIdx);
      const result: QuoteLine[] = [];
      let visibleCursor = 0;
      for (const line of prev) {
        if (line.isDeleted) {
          result.push(line);
        } else {
          result.push({ ...reordered[visibleCursor], line_order: visibleCursor + 1 });
          visibleCursor++;
        }
      }
      return result;
    });
  }, []);

  const handleNumericInputChange = (
    value: string,
    field: "quantity" | "unit_price" | "discount_percent",
    actualIndex: number
  ) => {
    handleNumericChange(value, field, actualIndex, updateLine as (i: number, f: string, v: number) => void);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

  const getTotals = () => computeTotals(lines);
  const handleSave = async () => {
    // Verificar que el presupuesto no esté bloqueado
    if (quote && LOCKED_STATES.includes(quote.status)) {
      toast({
        title: "Presupuesto bloqueado",
        description: "No se pueden guardar cambios en un presupuesto bloqueado",
        variant: "destructive"
      });
      navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
      return;
    }
    if (!selectedClientId) {
      toast({
        title: "Error",
        description: "Selecciona un cliente",
        variant: "destructive"
      });
      return;
    }
    setSaving(true);
    const wasProvisional = quote?.quote_number.startsWith("BORR-");
    const isApproving = currentStatus === "APPROVED" && quote?.status !== "APPROVED";
    try {
      // Update quote
      const selectedProject = projects.find(p => p.id === selectedProjectId);

      // Calculate valid_until based on status
      let calculatedValidUntil: string | null = null;
      if (currentStatus === "DRAFT") {
        // If in DRAFT status, always recalculate valid_until as today + 30 days
        const today = new Date();
        const validUntilDate = new Date(today);
        validUntilDate.setDate(validUntilDate.getDate() + 30);
        calculatedValidUntil = validUntilDate.toISOString().split("T")[0];
        // Update local state to reflect the new date
        setValidUntil(calculatedValidUntil);
      } else {
        // If not in DRAFT, use the date set by user (or existing date)
        calculatedValidUntil = validUntil || null;
      }
      const {
        error: quoteError
      // @ts-ignore - p_site_id added via migration
      } = await supabase.rpc("update_quote", {
        p_quote_id: quoteId!,
        p_client_id: selectedClientId,
        p_project_name: selectedProject?.project_name || null,
        p_valid_until: calculatedValidUntil,
        p_status: currentStatus,
        p_project_id: selectedProjectId || null,
        p_site_id: selectedSiteId || null,
      });
      if (quoteError) throw quoteError;

      // Process lines (in order: delete, add, update)
      const lineIdsToOrder: string[] = [];

      // Sort lines by group before saving to ensure line_order matches group structure
      // Non-deleted lines only for determining order
      const linesToSort = [...lines].filter(l => !l.isDeleted);
      linesToSort.sort((a, b) => {
        const groupA = a.group_name || '';
        const groupB = b.group_name || '';
        if (groupA && !groupB) return -1; // Groups first
        if (!groupA && groupB) return 1;
        if (groupA === groupB) return (a.line_order || 0) - (b.line_order || 0); // Keep relative order
        return groupA.localeCompare(groupB, undefined, {
          numeric: true
        }); // Alphanumeric sort (Group 1 < Group 2)
      });

      // We need to map the sorted order back to the original array processing or just re-process
      // Actually, we just need the IDs in the correct order for `update_quote_lines_order`
      // But we also need to SAVE them.
      // The saving part (add/update) doesn't care about order usually, but `add_quote_line` does insert with a new order.
      // However, `update_quote_lines_order` at the end FIXES the order.
      // So we can process `lines` as is for saving, but construct `lineIdsToOrder` from the SORTED list.

      // Map of tempId/id to resolved ID
      const idMap = new Map<string, string>();

      // First pass: Save all lines (add/update)
      for (const line of lines) {
        if (line.isDeleted && line.id) {
          // Delete line
          const {
            error
          } = await supabase.rpc("delete_quote_line", {
            p_line_id: line.id
          });
          if (error) throw error;
        } else if (line.isNew && line.concept.trim()) {
          // Add new line
          const {
            data: newLineId,
            error
          } = await supabase.rpc("add_quote_line", {
            p_quote_id: quoteId!,
            p_concept: line.concept,
            p_description: line.description || null,
            p_quantity: line.quantity,
            p_unit_price: line.unit_price,
            p_tax_rate: line.tax_rate,
            p_discount_percent: line.discount_percent,
            p_group_name: line.group_name || null
          });
          if (error) throw error;
          const lineId = typeof newLineId === 'string' ? newLineId : newLineId?.[0] || newLineId;
          // Store mapping for sorting later
          if (lineId) {
            const key = line.id || line.tempId || ''; // Should be tempId for new lines
            if (key) idMap.set(key, lineId);
          }
        } else if (line.id) {
          // Update existing line
          if (line.isModified) {
            const {
              error
            } = await supabase.rpc("update_quote_line", {
              p_line_id: line.id,
              p_concept: line.concept,
              p_description: line.description || null,
              p_quantity: line.quantity,
              p_unit_price: line.unit_price,
              p_tax_rate: line.tax_rate,
              p_discount_percent: line.discount_percent
            });
            if (error) throw error;
          }
          idMap.set(line.id, line.id);
        }
      }

      // Second pass: Construct ordered ID list based on GROUPS
      // We use the same sorting logic on the lines we have in memory (ignoring deleted)
      const activeLines = lines.filter(l => !l.isDeleted && (l.id || l.isNew));
      activeLines.sort((a, b) => {
        const groupA = a.group_name || '';
        const groupB = b.group_name || '';

        // Logic: Groups first, then empty groups
        if (groupA && !groupB) return -1;
        if (!groupA && groupB) return 1;
        if (groupA === groupB) {
          // Stable sort for same group
          return lines.indexOf(a) - lines.indexOf(b);
        }
        return groupA.localeCompare(groupB, undefined, {
          numeric: true
        });
      });

      // Now build the ID list from the sorted active lines, using the idMap to get real IDs for new lines
      for (const line of activeLines) {
        const key = line.id || line.tempId;
        if (key && idMap.has(key)) {
          lineIdsToOrder.push(idMap.get(key)!);
        }
      }

      // Update line_order to match the current order in the UI
      if (lineIdsToOrder.length > 0) {
        const {
          error: orderError
        } = await supabase.rpc("update_quote_lines_order", {
          p_quote_id: quoteId!,
          p_line_ids: lineIdsToOrder
        });
        if (orderError) throw orderError;
      }

      // Show appropriate message based on what happened
      if (isApproving && wasProvisional) {
        // Fetch the updated quote to get the new number
        const {
          data: updatedQuote
        } = await supabase.rpc("get_quote", {
          p_quote_id: quoteId
        });
        const newNumber = updatedQuote?.[0]?.quote_number || "asignado";
        toast({
          title: "¡Presupuesto aprobado!",
          description: `Se ha asignado el número definitivo: ${newNumber}`
        });
      } else {
        toast({
          title: "Cambios guardados",
          description: "El presupuesto se ha actualizado correctamente"
        });
      }
      navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
    } catch (error: any) {
      console.error("Error saving quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el presupuesto",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const totals = getTotals();
  const statusInfo = getStatusInfo(currentStatus);
  if (loading) {
    return <div className="flex items-center justify-center pt-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>;
  }
  if (!quote) {
    return <div className="flex flex-col items-center justify-center pt-32">
        <FileText className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">Presupuesto no encontrado</p>
        <Button variant="link" onClick={() => navigate(`/nexo-av/${userId}/quotes`)} className="text-orange-500 mt-2">
          Volver a presupuestos
        </Button>
      </div>;
  }
  const isProvisionalNumber = quote.quote_number.startsWith("BORR-");
  const hasFinalNumber = !isProvisionalNumber && quote.quote_number.startsWith("P-");
  const displayNumber = hasFinalNumber ? quote.quote_number : `(${quote.quote_number})`;
  return <div className="w-full">
      <div className="w-full px-3 md:px-4 pb-4 md:pb-8">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5
      }}>
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 mb-4 md:mb-8">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-2xl font-bold text-foreground font-mono">{displayNumber}</h1>
                <Badge className={`${statusInfo.className} text-[10px] md:text-xs`}>
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-muted-foreground text-[10px] md:text-sm hidden md:block">Editando presupuesto</p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="h-8 md:h-10 px-4">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="hidden md:inline ml-2">Guardar</span>
            </Button>
          </div>

          {/* Quote header info - Document Header */}
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border mb-4 overflow-hidden">
            {/* Compact header bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Datos del Presupuesto</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Creado: {new Date(quote.created_at).toLocaleDateString('es-ES')}</span>
                <span className="text-border">•</span>
                <span>
                  Vence: {validUntil ? new Date(validUntil).toLocaleDateString('es-ES') : 'Sin fecha'}
                  {currentStatus === "DRAFT" && <span className="text-amber-500 ml-1">(auto)</span>}
                </span>
              </div>
            </div>
            
            {/* Main content - horizontal layout */}
            <div className="p-5 flex items-start gap-4">
              {/* Client selector - 40% */}
              <div className="flex-[4] min-w-0">
                <Label className="text-muted-foreground text-xs mb-2 block font-medium">Cliente</Label>
                <Select
                  value={selectedClientId || undefined}
                  onValueChange={(value) => {
                    setSelectedClientId(value);
                    setSelectedProjectId("");
                    setSelectedSiteId("");
                    setProjectSites([]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Project selector - 60% */}
              <div className="flex-[6] min-w-0">
                <Label className="text-muted-foreground text-xs mb-2 block font-medium">Proyecto</Label>
                <Select
                  value={
                    !selectedClientId || projects.length === 0
                      ? undefined
                      : (selectedProjectId || "__none__")
                  }
                  onValueChange={(v) => {
                    setSelectedProjectId(v === "__none__" ? "" : v);
                    setSelectedSiteId("");
                    setProjectSites([]);
                  }}
                  disabled={!selectedClientId || loadingProjects || projects.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        !selectedClientId ? "Selecciona un cliente primero" : projects.length === 0 ? "Sin proyectos disponibles" : "Seleccionar proyecto..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sin proyecto —</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.project_name} ({p.project_number})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Validity date - only editable when not draft */}
              {currentStatus !== "DRAFT" && <div className="flex-shrink-0 w-40">
                  <Label className="text-muted-foreground text-xs mb-1.5 block">Válido hasta</Label>
                  <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="h-11 text-sm" title="Fecha de validez del presupuesto" />
                </div>}
            </div>

            {/* Site selector for MULTI_SITE projects */}
            {(() => {
              const selectedProject = projects.find(p => p.id === selectedProjectId);
              const isMultiSite = selectedProject?.site_mode === "MULTI_SITE" && projectSites.length > 0;
              const isSingleSite = selectedProject?.site_mode === "SINGLE_SITE" && projectSites.length > 0;
              
              if (isMultiSite) {
                return (
                  <div className="px-5 pb-4">
                    <Label className="text-muted-foreground text-xs mb-2 block font-medium flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Sitio de instalación
                    </Label>
                    <Select value={selectedSiteId || undefined} onValueChange={setSelectedSiteId}>
                      <SelectTrigger className="w-full max-w-md">
                        <SelectValue placeholder="Seleccionar sitio..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projectSites.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.site_name}{s.city ? ` — ${s.city}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              if (isSingleSite) {
                return (
                  <div className="px-5 pb-4">
                    <Label className="text-muted-foreground text-xs mb-2 block font-medium flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Sitio
                    </Label>
                    <div className="text-sm font-medium text-foreground px-3 py-2 bg-muted/30 rounded-md border border-border max-w-md">
                      {projectSites[0]?.site_name}{projectSites[0]?.city ? ` — ${projectSites[0].city}` : ""}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Lines Table */}
          <div className="bg-card/95 backdrop-blur-sm rounded-2xl border border-border overflow-hidden mb-6 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <span className="text-foreground text-sm font-semibold uppercase tracking-wider">Líneas del presupuesto</span>
              <span className="text-muted-foreground text-xs font-medium">Escribe @nombre para buscar en el catálogo</span>
            </div>
            <div className="overflow-x-auto bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
                    <TableHead className="text-muted-foreground w-10 px-5 py-3 text-xs font-semibold uppercase tracking-wider"></TableHead>
                    <TableHead className="text-muted-foreground w-24 px-5 py-3 text-xs font-semibold uppercase tracking-wider" title="Nº de producto (aparece como REF en el PDF)">REF</TableHead>
                    <TableHead className="text-muted-foreground min-w-[280px] px-5 py-3 text-xs font-semibold uppercase tracking-wider">Concepto</TableHead>
                    <TableHead className="text-muted-foreground text-center w-28 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Cant.</TableHead>
                    <TableHead className="text-muted-foreground text-right w-32 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Precio</TableHead>
                    <TableHead className="text-muted-foreground text-center w-20 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Dto %</TableHead>
                    <TableHead className="text-muted-foreground w-36 px-5 py-3 text-xs font-semibold uppercase tracking-wider">IVA</TableHead>
                    <TableHead className="text-muted-foreground text-right w-32 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Subtotal</TableHead>
                    <TableHead className="text-muted-foreground w-14 px-5 py-3"></TableHead>
                  </TableRow>
                </TableHeader>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  onDragStart={() => setExpandedDescs(new Set())}
                >
                  <SortableContext
                    items={lines.filter((l, i) => !l.isDeleted && !isDisplacementChild(lines, i) && !isCompanionChild(lines, i)).map(l => l.id || l.tempId || "")}
                    strategy={verticalListSortingStrategy}
                  >
                    <TableBody>
                      {lines.filter(l => !l.isDeleted).map((line) => {
                        const actualIndex = lines.findIndex(l => (l.id || l.tempId) === (line.id || line.tempId));
                        const lineKey = line.id || line.tempId || String(actualIndex);
                        const isExpanded = expandedDescs.has(lineKey);
                        const isChild = isDisplacementChild(lines, actualIndex);
                        const isCompChild = isCompanionChild(lines, actualIndex);

                        // ── Sub-sección de acompañante ──────────────────────────
                        if (isCompChild) {
                          return (
                            <TableRow
                              key={`${lineKey}-companion`}
                              className="border-l-2 border-l-blue-400/50 bg-muted/10 hover:bg-muted/20"
                            >
                              <TableCell className="px-3 py-2 w-10">
                                <div className="flex justify-center">
                                  <div className="w-px h-4 bg-border/40" />
                                </div>
                              </TableCell>
                              <TableCell className="px-5 py-2 text-xs text-muted-foreground/40">—</TableCell>
                              <TableCell className="px-5 py-2">
                                <div className="flex items-center gap-1.5">
                                  <Link2 className="h-3 w-3 text-blue-400/70 shrink-0" />
                                  <span className="text-xs text-muted-foreground font-medium">{line.concept}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-5 py-2 text-center text-xs text-muted-foreground tabular-nums">
                                {line.quantity}
                              </TableCell>
                              <TableCell className="px-5 py-2 text-right text-xs text-muted-foreground tabular-nums">
                                {new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(line.unit_price)}€
                              </TableCell>
                              <TableCell />
                              <TableCell />
                              <TableCell className="px-5 py-2 text-right text-xs font-semibold text-muted-foreground tabular-nums">
                                {formatCurrency(line.subtotal)}
                              </TableCell>
                              <TableCell className="px-5 py-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLine(actualIndex)}
                                  className="h-7 w-7 text-muted-foreground/30 hover:text-muted-foreground/70"
                                  title="No incluir producto acompañante en este documento"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        // ── Sub-sección de desplazamiento ──────────────────────
                        if (isChild) {
                          return (
                            <TableRow
                              key={`${lineKey}-child`}
                              className="border-l-2 border-l-orange-300/50 bg-muted/10 hover:bg-muted/20"
                            >
                              <TableCell className="px-3 py-2 w-10">
                                <div className="flex justify-center">
                                  <div className="w-px h-4 bg-border/40" />
                                </div>
                              </TableCell>
                              <TableCell className="px-5 py-2 text-xs text-muted-foreground/40">—</TableCell>
                              <TableCell className="px-5 py-2">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3 w-3 text-orange-400/70 shrink-0" />
                                  <span className="text-xs text-muted-foreground font-medium">{line.concept}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-5 py-2 text-center text-xs text-muted-foreground tabular-nums">
                                {line.quantity} h
                              </TableCell>
                              <TableCell className="px-5 py-2 text-right text-xs text-muted-foreground tabular-nums">
                                {new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(line.unit_price)}€
                              </TableCell>
                              <TableCell />
                              <TableCell />
                              <TableCell className="px-5 py-2 text-right text-xs font-semibold text-muted-foreground tabular-nums">
                                {formatCurrency(line.subtotal)}
                              </TableCell>
                              <TableCell className="px-5 py-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLine(actualIndex)}
                                  className="h-7 w-7 text-muted-foreground/30 hover:text-muted-foreground/70"
                                  title="No cobrar horas de desplazamiento en este documento"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return (
                          <Fragment key={lineKey}>
                            <SortableLineRow
                              id={lineKey}
                              className="border-border/60 hover:bg-muted/20 transition-colors duration-150 group"
                            >
                              {(dragHandleProps) => (
                                <>
                                  <TableCell className="px-3 py-3.5 w-10">
                                    <button
                                      {...dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                      title="Arrastrar para reordenar"
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </button>
                                  </TableCell>
                                  <TableCell className="px-5 py-3.5">
                                    <Input value={line.group_name || ''} onChange={e => updateLine(actualIndex, "group_name", e.target.value)} placeholder="Nº producto" className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm pl-2 pr-0 py-2 hover:border-foreground/20 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors placeholder:text-muted-foreground/70" title="Ej: PACK-0001, SP-01-0001. Se rellena automáticamente al buscar con @" />
                                  </TableCell>
                                  <TableCell className="px-5 py-3.5">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <ProductSearchInput value={line.concept} onChange={value => updateLine(actualIndex, "concept", value)} onSelectItem={item => handleProductSelect(actualIndex, item)} placeholder="@buscar producto" className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm font-medium pl-2 pr-0 py-2 hover:border-foreground/20 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors placeholder:text-muted-foreground/70 flex-1 min-w-0" />
                                      <button
                                        onClick={() => toggleDesc(lineKey)}
                                        className={`flex-shrink-0 p-0.5 rounded transition-all duration-150 ${isExpanded ? "text-primary opacity-100" : "text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100"}`}
                                        title={isExpanded ? "Ocultar descripción" : "Añadir descripción"}
                                      >
                                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`} />
                                      </button>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-5 py-3.5">
                                    <div className="flex justify-center">
                                      <Input type="text" inputMode="numeric" value={getNumericDisplayValue(line.quantity, 'quantity', actualIndex)} onChange={e => handleNumericInputChange(e.target.value, 'quantity', actualIndex)} onBlur={() => clearNumericInputKey(actualIndex, 'quantity')} className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm text-center font-medium px-0 py-2 w-20 hover:border-foreground/20 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors placeholder:text-muted-foreground/70" placeholder="0" />
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-5 py-3.5">
                                    <Input type="text" inputMode="decimal" value={getNumericDisplayValue(line.unit_price, 'unit_price', actualIndex)} onChange={e => handleNumericInputChange(e.target.value, 'unit_price', actualIndex)} onBlur={() => clearNumericInputKey(actualIndex, 'unit_price')} className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm text-right font-medium px-0 py-2 hover:border-foreground/20 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors placeholder:text-muted-foreground/70" placeholder="0,00" />
                                  </TableCell>
                                  <TableCell className="px-5 py-3.5">
                                    <Input type="text" inputMode="decimal" value={getNumericDisplayValue(line.discount_percent || 0, 'discount_percent', actualIndex)} onChange={e => handleNumericInputChange(e.target.value, 'discount_percent', actualIndex)} onBlur={() => clearNumericInputKey(actualIndex, 'discount_percent')} className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm text-center font-medium px-0 py-2 w-12 mx-auto hover:border-foreground/20 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors placeholder:text-muted-foreground/70" placeholder="0" />
                                  </TableCell>
                                  <TableCell className="px-5 py-3.5">
                                    <div className="flex justify-center">
                                      <select value={String(line.tax_rate)} onChange={e => updateLine(actualIndex, "tax_rate", parseFloat(e.target.value))} className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm font-medium px-1 py-2 w-full hover:border-primary/50 focus:border-primary rounded-none transition-colors outline-none">
                                        {taxOptions.map(tax => (
                                          <option key={tax.value} value={String(tax.value)}>{tax.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-foreground font-semibold text-right text-sm px-5 py-3.5">
                                    {formatCurrency(line.subtotal)}
                                  </TableCell>
                                  <TableCell className="px-5 py-3.5">
                                    <Button variant="ghost" size="icon" onClick={() => removeLine(actualIndex)} className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-8 w-8 transition-colors">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </>
                              )}
                            </SortableLineRow>
                            {isExpanded && (
                              <tr className="bg-muted/10 border-border">
                                <td colSpan={9} className="px-12 pb-3 pt-1">
                                  <textarea
                                    value={line.description || ""}
                                    onChange={(e) => updateLine(actualIndex, "description", e.target.value)}
                                    placeholder="Descripción detallada (se incluye en el PDF)..."
                                    className="w-full text-xs text-muted-foreground bg-transparent border border-border/60 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/60 placeholder:text-muted-foreground/35"
                                    rows={2}
                                    // eslint-disable-next-line jsx-a11y/no-autofocus
                                    autoFocus
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                      {lines.filter(l => !l.isDeleted).length === 0 && (
                        <TableRow className="border-border">
                          <TableCell colSpan={9} className="text-center py-12">
                            <p className="text-muted-foreground text-sm mb-2">No hay líneas en este presupuesto</p>
                            <Button variant="link" onClick={addLine} className="text-orange-500 text-sm">Añadir primera línea</Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </SortableContext>
                </DndContext>
              </Table>
            </div>
            <div className="p-5 border-t border-border bg-muted/20">
              <Button variant="outline" onClick={addLine} className="border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 rounded-lg transition-all duration-200 h-10 px-4 gap-2 font-medium">
                <Plus className="h-4 w-4" />
                Añadir línea
              </Button>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-card/95 backdrop-blur-sm rounded-2xl md:rounded-3xl border border-border p-5 md:p-6 shadow-sm">
            <div className="max-w-sm ml-auto space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Base imponible</span>
                <span className="text-foreground font-semibold">{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.taxes.map(tax => <div key={tax.rate} className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{tax.label}</span>
                  <span className="text-foreground font-semibold">{formatCurrency(tax.amount)}</span>
                </div>)}
              <div className="flex justify-between pt-4 border-t border-border">
                <span className="text-foreground font-semibold text-lg">Total</span>
                <span className="text-orange-600 dark:text-orange-400 text-xl font-bold">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>;
};
export default EditQuotePageDesktop;
