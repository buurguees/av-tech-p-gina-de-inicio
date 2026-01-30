import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, GripVertical, Trash2, Plus, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import ProductSearchInput from "../components/common/ProductSearchInput";
import { cn } from "@/lib/utils";

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// ============= TAX BADGE DROPDOWN =============
interface TaxBadgeDropdownProps {
  value: number;
  onChange: (value: number) => void;
  options: TaxOption[];
}

const TaxBadgeDropdown = ({ value, onChange, options }: TaxBadgeDropdownProps) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md",
          "bg-muted hover:bg-muted/80 text-xs font-medium",
          "transition-colors"
        )}
      >
        <span className="text-muted-foreground">×</span>
        <span>{selectedOption?.label || `${value}%`}</span>
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg min-w-[120px]">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                  value === opt.value && "bg-primary/10 text-primary font-medium"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
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
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

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
    }
  }, [selectedClientId]);

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
        }))
      );
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
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
          discount_percent: line.discount_percent,
          subtotal: line.subtotal,
          tax_amount: line.tax_amount,
          total: line.total,
          group_name: line.group_name || null,
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
    setLines(prev => [...prev, newLine]);
  }, [calculateLineValues, defaultTaxRate, lines.length]);

  const updateLine = useCallback(
    (index: number, field: keyof DocumentLine, value: any) => {
      setLines(prev => {
        const updated = [...prev];
        updated[index] = calculateLineValues({ ...updated[index], [field]: value });
        return updated;
      });
    },
    [calculateLineValues]
  );

  const removeLine = useCallback((index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index).map((line, i) => ({ ...line, line_order: i + 1 })));
  }, []);

  const parseNumber = (value: string): number => {
    if (!value) return 0;
    const cleaned = value.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleNumericFocus = (index: number, field: string, value: number) => {
    setEditingValues(prev => ({ ...prev, [`${index}-${field}`]: value === 0 ? "" : value.toString() }));
  };

  const handleNumericBlur = (index: number, field: string) => {
    setEditingValues(prev => {
      const copy = { ...prev };
      delete copy[`${index}-${field}`];
      return copy;
    });
  };

  const getDisplayValue = (index: number, field: string, value: number): string => {
    const key = `${index}-${field}`;
    if (editingValues[key] !== undefined) return editingValues[key];
    return value === 0 ? "" : formatCurrency(value);
  };

  // Totals
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

  // Filter out LOST clients
  const availableClients = clients.filter(client => client.lead_stage !== 'LOST');

  return (
    <div className="h-[calc(100vh-3.25rem)] overflow-y-auto bg-background">
      {/* Navigation Bar with DetailActionButton */}
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="p-6 space-y-6"
      >
        {/* Document Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-card border border-border rounded-xl">
          {/* Cliente */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</label>
            <Select
              value={selectedClientId || undefined}
              onValueChange={(value) => { setSelectedClientId(value); setSelectedProjectId(""); }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {availableClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Proyecto */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proyecto</label>
            <Select
              value={
                !selectedClientId || projects.length === 0
                  ? undefined
                  : (selectedProjectId || "__none__")
              }
              onValueChange={(v) => setSelectedProjectId(v === "__none__" ? "" : v)}
              disabled={!selectedClientId || projects.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !selectedClientId ? "Selecciona un cliente" : projects.length === 0 ? "Sin proyectos" : "Seleccionar proyecto..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sin proyecto —</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.project_name} ({p.project_number})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha</label>
            <input
              type="date"
              value={issueDate}
              disabled
              className="w-full h-11 px-4 bg-muted/50 border border-border rounded-xl text-sm text-muted-foreground"
            />
          </div>

          {/* Vencimiento */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencimiento</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Lines Editor - Fixed layout without horizontal scroll */}
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_2fr_1.5fr_80px_100px_80px_100px_36px] bg-muted/50 border-b border-border">
            <div className="px-2 py-3.5" />
            <div className="px-3 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concepto</div>
            <div className="px-3 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</div>
            <div className="px-2 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Cant.</div>
            <div className="px-2 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Precio</div>
            <div className="px-2 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">IVA</div>
            <div className="px-2 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Total</div>
            <div className="px-2 py-3.5" />
          </div>

          {/* Lines */}
          <div className="divide-y divide-border">
            {lines.map((line, index) => (
              <div
                key={line.tempId || line.id || index}
                className="grid grid-cols-[40px_2fr_1.5fr_80px_100px_80px_100px_36px] items-center hover:bg-muted/20 transition-colors group"
              >
                {/* Drag Handle */}
                <div className="px-2 py-3 flex justify-center cursor-grab">
                  <GripVertical className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                </div>

                {/* Concept */}
                <div className="px-2 py-2">
                  <ProductSearchInput
                    value={line.concept}
                    onChange={(value) => updateLine(index, "concept", value)}
                    onSelectItem={(item) => {
                      // Update all fields from catalog item
                      setLines(prev => {
                        const updated = [...prev];
                        updated[index] = calculateLineValues({
                          ...updated[index],
                          concept: item.name,
                          description: item.description || updated[index].description,
                          unit_price: item.price,
                          tax_rate: item.tax_rate,
                        });
                        return updated;
                      });
                    }}
                    placeholder="@buscar o escribe..."
                    className="w-full h-10 px-3 bg-transparent border border-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg text-sm transition-all outline-none"
                  />
                </div>

                {/* Description */}
                <div className="px-2 py-2">
                  <input
                    type="text"
                    value={line.description || ""}
                    onChange={(e) => updateLine(index, "description", e.target.value)}
                    placeholder="Descripción..."
                    className="w-full h-10 px-3 bg-transparent border border-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg text-sm text-muted-foreground transition-all outline-none"
                  />
                </div>

                {/* Quantity */}
                <div className="px-2 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={getDisplayValue(index, "quantity", line.quantity)}
                    onFocus={() => handleNumericFocus(index, "quantity", line.quantity)}
                    onChange={(e) => {
                      setEditingValues(prev => ({ ...prev, [`${index}-quantity`]: e.target.value }));
                      updateLine(index, "quantity", parseNumber(e.target.value));
                    }}
                    onBlur={() => handleNumericBlur(index, "quantity")}
                    placeholder="1"
                    className="w-full h-10 px-2 bg-transparent border border-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg text-sm text-right tabular-nums font-medium transition-all outline-none"
                  />
                </div>

                {/* Price */}
                <div className="px-2 py-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={getDisplayValue(index, "unit_price", line.unit_price)}
                    onFocus={() => handleNumericFocus(index, "unit_price", line.unit_price)}
                    onChange={(e) => {
                      setEditingValues(prev => ({ ...prev, [`${index}-unit_price`]: e.target.value }));
                      updateLine(index, "unit_price", parseNumber(e.target.value));
                    }}
                    onBlur={() => handleNumericBlur(index, "unit_price")}
                    placeholder="0,00"
                    className="w-full h-10 px-2 bg-transparent border border-transparent hover:border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg text-sm text-right tabular-nums font-medium transition-all outline-none"
                  />
                </div>

                {/* Tax */}
                <div className="px-2 py-2 flex justify-center">
                  <TaxBadgeDropdown value={line.tax_rate} onChange={(v) => updateLine(index, "tax_rate", v)} options={taxOptions} />
                </div>

                {/* Total */}
                <div className="px-3 py-2 text-right">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {line.total > 0 ? `${formatCurrency(line.total)}€` : "—"}
                  </span>
                </div>

                {/* Delete */}
                <div className="px-2 py-2 flex justify-center">
                  <button
                    onClick={() => removeLine(index)}
                    className="p-1.5 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add Line Row */}
            <div
              onClick={addEmptyLine}
              className="grid grid-cols-[40px_2fr_1.5fr_80px_100px_80px_100px_36px] items-center hover:bg-muted/30 transition-colors cursor-pointer py-1"
            >
              <div className="px-2 py-3 flex justify-center">
                <Plus className="w-4 h-4 text-muted-foreground/40" />
              </div>
              <div className="px-3 py-3 col-span-7">
                <span className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                  + Añadir línea
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-80 p-5 bg-card border border-border rounded-xl space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground tabular-nums">{formatCurrency(totals.subtotal)} €</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">IVA</span>
              <span className="font-medium text-foreground tabular-nums">{formatCurrency(totals.taxAmount)} €</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-xl font-bold text-foreground tabular-nums">{formatCurrency(totals.total)} €</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NewQuotePage;
