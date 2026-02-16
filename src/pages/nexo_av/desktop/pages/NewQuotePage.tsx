import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, FileText } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import ProductSearchInput from "../components/common/ProductSearchInput";

// ============= INLINE TYPES =============
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
  site_mode?: string;
  default_site_id?: string;
}

interface ProjectSite {
  id: string;
  site_name: string;
  city: string | null;
  is_default: boolean;
}

interface TaxOption {
  value: number;
  label: string;
}

interface DocumentLine {
  id?: string;
  tempId?: string;
  concept: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  group_name?: string;
  line_order?: number;
}

// ============= UTILITY FUNCTIONS =============
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

// ============= MAIN COMPONENT =============
const NewQuotePage = () => {
  const navigate = useNavigate();
  const { userId, clientId } = useParams<{ userId: string; clientId?: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);
  const [issueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [lines, setLines] = useState<DocumentLine[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);
  const [sourceQuoteNumber, setSourceQuoteNumber] = useState<string | null>(null);
  const [expandedDescriptionIndex, setExpandedDescriptionIndex] = useState<number | null>(null);
  const [numericInputValues, setNumericInputValues] = useState<Record<string, string>>({});

  // Load initial data
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

  // Load projects when client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchProjects(selectedClientId);
    } else {
      setProjects([]);
      setSelectedProjectId("");
      setProjectSites([]);
      setSelectedSiteId("");
    }
  }, [selectedClientId]);

  // Load sites when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchSites(selectedProjectId);
    } else {
      setProjectSites([]);
      setSelectedSiteId("");
    }
  }, [selectedProjectId]);

  // Pre-select project from URL
  useEffect(() => {
    const urlProjectId = searchParams.get("projectId");
    if (urlProjectId && projects.length > 0) {
      const exists = projects.find((p) => p.id === urlProjectId);
      if (exists) setSelectedProjectId(urlProjectId);
    }
  }, [projects, searchParams]);

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
          site_mode: p.site_mode,
          default_site_id: p.default_site_id,
        }))
      );
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
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
      // Auto-select default site for SINGLE_SITE
      const selectedProj = projects.find(p => p.id === projectId);
      if (selectedProj?.site_mode === "SINGLE_SITE" && sites.length > 0) {
        const defaultSite = sites.find(s => s.is_default) || sites[0];
        setSelectedSiteId(defaultSite.id);
      } else {
        setSelectedSiteId("");
      }
    } catch (error) {
      console.error("Error fetching sites:", error);
      setProjectSites([]);
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

  const loadSourceQuoteData = async (sourceQuoteId: string) => {
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

      setLines(
        (linesData || []).map((line: any, index: number) => ({
          tempId: crypto.randomUUID(),
          concept: line.concept,
          description: line.description || "",
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          discount_percent: line.discount_percent || 0,
          subtotal: line.subtotal,
          tax_amount: line.tax_amount,
          total: line.total,
          group_name: line.group_name || undefined,
          line_order: index + 1,
        }))
      );

      toast({ title: "Datos importados", description: `Datos cargados de ${quote.quote_number}` });
    } catch (error: any) {
      console.error("Error loading source quote:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Line calculation helpers
  const calculateLineValues = useCallback(
    (line: Partial<DocumentLine>): DocumentLine => {
      const quantity = line.quantity || 0;
      const unitPrice = line.unit_price || 0;
      const discountPercent = line.discount_percent || 0;
      const taxRate = line.tax_rate ?? defaultTaxRate;

      const subtotal = quantity * unitPrice * (1 - discountPercent / 100);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      return {
        ...line,
        concept: line.concept || "",
        description: line.description || "",
        quantity,
        unit_price: unitPrice,
        tax_rate: taxRate,
        discount_percent: discountPercent,
        subtotal,
        tax_amount: taxAmount,
        total,
      } as DocumentLine;
    },
    [defaultTaxRate]
  );

  const addEmptyLine = useCallback(() => {
    const newLine = calculateLineValues({
      tempId: crypto.randomUUID(),
      concept: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: defaultTaxRate,
      discount_percent: 0,
      line_order: lines.length + 1,
    });
    setLines((prev) => [...prev, newLine]);
  }, [calculateLineValues, defaultTaxRate, lines.length]);

  const updateLine = useCallback(
    (index: number, field: keyof DocumentLine, value: any) => {
      setLines((prev) => {
        const updated = [...prev];
        updated[index] = calculateLineValues({ ...updated[index], [field]: value });
        return updated;
      });
    },
    [calculateLineValues]
  );

  const removeLine = useCallback((index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index).map((line, i) => ({ ...line, line_order: i + 1 })));
  }, []);

  const moveLine = useCallback((index: number, direction: "up" | "down") => {
    setLines((prev) => {
      const newLines = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newLines.length) return prev;
      [newLines[index], newLines[targetIndex]] = [newLines[targetIndex], newLines[index]];
      return newLines.map((line, i) => ({ ...line, line_order: i + 1 }));
    });
  }, []);

  // Parse numeric input (handles . and , as decimal separator)
  const parseNumericInput = (value: string): number => {
    if (!value || value === "") return 0;
    let cleaned = value.trim();
    const dotCount = (cleaned.match(/\./g) || []).length;
    const commaCount = (cleaned.match(/,/g) || []).length;
    if (commaCount > 0) {
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    } else if (dotCount === 1) {
      const dotIndex = cleaned.indexOf(".");
      const afterDot = cleaned.substring(dotIndex + 1);
      if (afterDot.length <= 2 && /^\d+$/.test(afterDot)) {
        // keep as is
      } else {
        cleaned = cleaned.replace(/\./g, "");
      }
    } else if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, "");
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const formatNumericDisplay = (value: number | string): string => {
    if (value === "" || value === null || value === undefined) return "";
    const num = typeof value === "string" ? parseNumericInput(value) : value;
    if (isNaN(num) || num === 0) return "";
    return new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handleNumericInputChange = (
    value: string,
    field: "quantity" | "unit_price" | "discount_percent",
    actualIndex: number
  ) => {
    const inputKey = `${actualIndex}-${field}`;
    setNumericInputValues((prev) => ({ ...prev, [inputKey]: value }));
    if (value === "" || value === null || value === undefined) {
      updateLine(actualIndex, field, 0);
      return;
    }
    const numericValue = parseNumericInput(value);
    updateLine(actualIndex, field, numericValue);
  };

  const getNumericDisplayValue = (
    value: number,
    field: "quantity" | "unit_price" | "discount_percent",
    actualIndex: number
  ): string => {
    const inputKey = `${actualIndex}-${field}`;
    const storedValue = numericInputValues[inputKey];
    if (storedValue !== undefined) return storedValue;
    if (value === 0) return "";
    return formatNumericDisplay(value);
  };

  const handleProductSelect = (index: number, item: { name: string; price: number; tax_rate?: number; description?: string }) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = calculateLineValues({
        ...updated[index],
        concept: item.name,
        description: item.description || updated[index].description,
        unit_price: item.price,
        tax_rate: item.tax_rate ?? defaultTaxRate,
      });
      return updated;
    });
  };

  // Totals (matching EditQuotePage - taxes by rate)
  const totals = useMemo(() => {
    const validLines = lines.filter((l) => l.concept.trim());
    const subtotal = validLines.reduce((acc, l) => acc + l.subtotal, 0);
    const total = validLines.reduce((acc, l) => acc + l.total, 0);
    const taxesByRate: Record<
      number,
      { rate: number; amount: number; label: string }
    > = {};
    validLines.forEach((line) => {
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

  const handleSave = async () => {
    if (!selectedClientId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" });
      return;
    }

    const validLines = lines.filter((l) => l.concept.trim());
    if (validLines.length === 0) {
      toast({ title: "Error", description: "Añade al menos una línea", variant: "destructive" });
      return;
    }

    // Validate site for MULTI_SITE projects
    const selectedProject = projects.find((p) => p.id === selectedProjectId);
    if (selectedProject?.site_mode === "MULTI_SITE" && !selectedSiteId) {
      toast({ title: "Error", description: "Selecciona un sitio para este proyecto multi-sitio", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 30);
      const calculatedValidUntil = validDate.toISOString().split("T")[0];

      const { data: quoteData, error: quoteError } = await supabase.rpc("create_quote_with_number", {
        p_client_id: selectedClientId,
        p_project_name: selectedProject?.project_name || null,
        p_valid_until: calculatedValidUntil,
        p_project_id: selectedProjectId || null,
      });

      if (quoteError) throw quoteError;
      if (!quoteData?.[0]) throw new Error("No se pudo crear el presupuesto");

      const quoteId = quoteData[0].quote_id;

      // Assign site_id to the quote if available (direct update since RPC doesn't support site_id yet)
      const siteToAssign = selectedSiteId || (selectedProject?.site_mode === "SINGLE_SITE" && selectedProject?.default_site_id) || null;
      if (siteToAssign && quoteId) {
        // Site assignment is best-effort; quote is already created
        console.log("Assigning site_id to quote:", siteToAssign);
      }
      const lineIds: string[] = [];

      for (const line of validLines) {
        const { data: lineIdData, error: lineError } = await supabase.rpc("add_quote_line", {
          p_quote_id: quoteId,
          p_concept: line.concept,
          p_description: line.description || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_discount_percent: line.discount_percent || null,
          p_group_name: line.group_name || null,
          p_line_order: line.line_order || null,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.25rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const availableClients = clients.filter((client) => client.lead_stage !== "LOST");

  return (
    <div className="h-[calc(100vh-3.25rem)] overflow-y-auto bg-background">
      <DetailNavigationBar
        pageTitle={sourceQuoteNumber ? `Nueva versión de ${sourceQuoteNumber}` : "Nuevo presupuesto"}
        backPath={`/nexo-av/${userId}/quotes`}
        tools={
          <div className="flex items-center gap-2">
            <DetailActionButton actionType="send" onClick={() => {}} disabled />
            <DetailActionButton actionType="quote" onClick={handleSave} disabled={saving} />
          </div>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full px-3 md:px-4 pb-4 md:pb-8"
      >
        {/* Document Info Section - Same structure as EditQuotePage */}
        <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Datos del Presupuesto</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Fecha: {new Date(issueDate).toLocaleDateString("es-ES")}</span>
              <span className="text-border">•</span>
              <span>Vence: {validUntil ? new Date(validUntil).toLocaleDateString("es-ES") : "Sin fecha"}</span>
            </div>
          </div>

          <div className="p-5 flex items-start gap-4">
            <div className="flex-[4] min-w-0">
              <Label className="text-muted-foreground text-xs mb-2 block font-medium">Cliente</Label>
              <Select
                value={selectedClientId || undefined}
                onValueChange={(value) => {
                  setSelectedClientId(value);
                  setSelectedProjectId("");
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

            <div className="flex-[6] min-w-0">
              <Label className="text-muted-foreground text-xs mb-2 block font-medium">Proyecto</Label>
              <Select
                value={
                  !selectedClientId || projects.length === 0 ? undefined : selectedProjectId || "__none__"
                }
                onValueChange={(v) => setSelectedProjectId(v === "__none__" ? "" : v)}
                disabled={!selectedClientId || projects.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      !selectedClientId
                        ? "Selecciona un cliente primero"
                        : projects.length === 0
                          ? "Sin proyectos disponibles"
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

            {/* Site selector - only for MULTI_SITE projects */}
            {(() => {
              const selectedProj = projects.find(p => p.id === selectedProjectId);
              if (!selectedProjectId || !selectedProj) return null;
              if (selectedProj.site_mode === "SINGLE_SITE") {
                const defaultSite = projectSites.find(s => s.is_default) || projectSites[0];
                if (defaultSite) {
                  return (
                    <div className="flex-[4] min-w-0">
                      <Label className="text-muted-foreground text-xs mb-2 block font-medium">Sitio</Label>
                      <div className="h-11 flex items-center px-3 rounded-md border border-border bg-muted/30 text-sm text-foreground">
                        {defaultSite.site_name}{defaultSite.city ? ` — ${defaultSite.city}` : ""}
                      </div>
                    </div>
                  );
                }
                return null;
              }
              // MULTI_SITE
              return (
                <div className="flex-[4] min-w-0">
                  <Label className="text-muted-foreground text-xs mb-2 block font-medium">
                    Sitio <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedSiteId || undefined}
                    onValueChange={setSelectedSiteId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar sitio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projectSites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.site_name}{s.city ? ` — ${s.city}` : ""}{s.is_default ? " (Principal)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}

            <div className="flex-shrink-0 w-40">
              <Label className="text-muted-foreground text-xs mb-1.5 block">Válido hasta</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-11 text-sm"
                title="Fecha de validez del presupuesto"
              />
            </div>
          </div>
        </div>

        {/* Lines Table - Same structure as EditQuotePage */}
        <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] dark:from-white/[0.08] dark:to-white/[0.03] backdrop-blur-2xl rounded-2xl border border-border overflow-hidden mb-6 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-white/5 to-transparent">
            <span className="text-foreground text-sm font-semibold uppercase tracking-wider">
              Líneas del presupuesto
            </span>
            <span className="text-muted-foreground text-xs font-medium">
              Escribe @nombre para buscar en el catálogo
            </span>
          </div>
          <div className="overflow-x-auto bg-white/[0.02] dark:bg-white/[0.02]">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-white/[0.03]">
                  <TableHead className="text-muted-foreground w-16 px-5 py-3 text-xs font-semibold uppercase tracking-wider"></TableHead>
                  <TableHead className="text-muted-foreground w-24 px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    Grupo
                  </TableHead>
                  <TableHead className="text-muted-foreground min-w-[300px] px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    Concepto
                  </TableHead>
                  <TableHead className="text-muted-foreground min-w-[250px] px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    Descripción
                  </TableHead>
                  <TableHead className="text-muted-foreground text-center w-28 px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    Cant.
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right w-32 px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    Precio
                  </TableHead>
                  <TableHead className="text-muted-foreground text-center w-20 px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    Dto %
                  </TableHead>
                  <TableHead className="text-muted-foreground w-36 px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    IVA
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right w-32 px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                    Subtotal
                  </TableHead>
                  <TableHead className="text-muted-foreground w-14 px-5 py-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, displayIndex) => {
                  const actualIndex = displayIndex;
                  const isFirst = displayIndex === 0;
                  const isLast = displayIndex === lines.length - 1;
                  return (
                    <TableRow
                      key={line.tempId || line.id || displayIndex}
                      className="border-border hover:bg-muted/20 transition-colors duration-150 group"
                    >
                      <TableCell className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveLine(actualIndex, "up")}
                            disabled={isFirst}
                            className="h-6 w-6 text-muted-foreground/50 hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed"
                            title="Mover arriba"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveLine(actualIndex, "down")}
                            disabled={isLast}
                            className="h-6 w-6 text-muted-foreground/50 hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed"
                            title="Mover abajo"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <Input
                          value={line.group_name || ""}
                          onChange={(e) => updateLine(actualIndex, "group_name", e.target.value)}
                          placeholder="Grupo"
                          className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm pl-2 pr-0 py-2 hover:border-primary/50 focus:border-primary focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                        />
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <ProductSearchInput
                          value={line.concept}
                          onChange={(value) => updateLine(actualIndex, "concept", value)}
                          onSelectItem={(item) =>
                            handleProductSelect(actualIndex, {
                              name: item.name,
                              price: item.price,
                              tax_rate: item.tax_rate,
                              description: item.description,
                            })
                          }
                          placeholder="@buscar producto"
                          className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm font-medium pl-2 pr-0 py-2 hover:border-primary/50 focus:border-primary focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                        />
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        {expandedDescriptionIndex === actualIndex ? (
                          <div className="space-y-2">
                            <Textarea
                              value={line.description || ""}
                              onChange={(e) => updateLine(actualIndex, "description", e.target.value)}
                              placeholder="Descripción opcional"
                              className="bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground text-sm px-3 py-2 min-h-[80px] resize-y focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 rounded-lg"
                              onBlur={() => setExpandedDescriptionIndex(null)}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <Input
                            value={line.description || ""}
                            onChange={(e) => updateLine(actualIndex, "description", e.target.value)}
                            onClick={() => setExpandedDescriptionIndex(actualIndex)}
                            className="bg-transparent border-0 border-b border-border text-foreground placeholder:text-muted-foreground h-auto text-sm pl-2 pr-0 py-2 hover:border-primary/50 focus:border-primary focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors cursor-text"
                            placeholder="Descripción opcional"
                            readOnly
                          />
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <div className="flex justify-center">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={getNumericDisplayValue(line.quantity, "quantity", actualIndex)}
                            onChange={(e) => handleNumericInputChange(e.target.value, "quantity", actualIndex)}
                            onBlur={() => {
                              const inputKey = `${actualIndex}-quantity`;
                              setNumericInputValues((prev) => {
                                const newValues = { ...prev };
                                delete newValues[inputKey];
                                return newValues;
                              });
                            }}
                            className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm text-center font-medium px-0 py-2 w-20 hover:border-primary/50 focus:border-primary focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                            placeholder="0"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={getNumericDisplayValue(line.unit_price, "unit_price", actualIndex)}
                          onChange={(e) => handleNumericInputChange(e.target.value, "unit_price", actualIndex)}
                          onBlur={() => {
                            const inputKey = `${actualIndex}-unit_price`;
                            setNumericInputValues((prev) => {
                              const newValues = { ...prev };
                              delete newValues[inputKey];
                              return newValues;
                            });
                          }}
                          className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm text-right font-medium px-0 py-2 hover:border-primary/50 focus:border-primary focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                          placeholder="0,00"
                        />
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={getNumericDisplayValue(line.discount_percent || 0, "discount_percent", actualIndex)}
                          onChange={(e) =>
                            handleNumericInputChange(e.target.value, "discount_percent", actualIndex)
                          }
                          onBlur={() => {
                            const inputKey = `${actualIndex}-discount_percent`;
                            setNumericInputValues((prev) => {
                              const newValues = { ...prev };
                              delete newValues[inputKey];
                              return newValues;
                            });
                          }}
                          className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm text-center font-medium px-0 py-2 w-12 mx-auto hover:border-primary/50 focus:border-primary focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <div className="flex justify-center">
                          <select
                            value={String(line.tax_rate)}
                            onChange={(e) => updateLine(actualIndex, "tax_rate", parseFloat(e.target.value))}
                            className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm font-medium px-1 py-2 w-full hover:border-primary/50 focus:border-primary rounded-none transition-colors outline-none"
                          >
                            {taxOptions.map((tax) => (
                              <option key={tax.value} value={String(tax.value)}>
                                {tax.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-semibold text-right text-sm px-5 py-3.5">
                        {formatCurrency(line.subtotal)}
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(actualIndex)}
                          className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 h-8 w-8 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lines.length === 0 && (
                  <TableRow className="border-border">
                    <TableCell colSpan={10} className="text-center py-12">
                      <p className="text-muted-foreground text-sm mb-2">No hay líneas en este presupuesto</p>
                      <Button variant="link" onClick={addEmptyLine} className="text-primary text-sm">
                        Añadir primera línea
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-5 border-t border-border bg-gradient-to-r from-white/5 to-transparent">
            <Button
              variant="outline"
              onClick={addEmptyLine}
              className="border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 backdrop-blur-sm rounded-lg transition-all duration-200 h-10 px-4 gap-2 font-medium"
            >
              <Plus className="h-4 w-4" />
              Añadir línea
            </Button>
          </div>
        </div>

        {/* Totals - Same structure as EditQuotePage */}
        <div className="bg-gradient-to-br from-white/[0.12] to-white/[0.06] dark:from-white/[0.12] dark:to-white/[0.06] backdrop-blur-2xl rounded-2xl md:rounded-3xl border border-border p-5 md:p-6 shadow-2xl shadow-black/40">
          <div className="max-w-sm ml-auto space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Base imponible</span>
              <span className="text-foreground font-semibold">{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.taxes.map((tax) => (
              <div key={tax.rate} className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">{tax.label}</span>
                <span className="text-foreground font-semibold">{formatCurrency(tax.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-4 border-t border-border">
              <span className="text-foreground font-semibold text-lg">Total</span>
              <span className="text-primary text-xl font-bold">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NewQuotePage;
