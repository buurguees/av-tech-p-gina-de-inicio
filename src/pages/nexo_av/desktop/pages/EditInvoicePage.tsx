import { useState, useEffect, lazy, useCallback } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Save, Loader2, GripVertical, FileText, MapPin } from "lucide-react";
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
import { LOCKED_FINANCE_INVOICE_STATES } from "@/constants/financeStatuses";
import { SortableLineRow } from "../components/documents/SortableLineRow";
import { useDocumentLines } from "../hooks/useDocumentLines";

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

interface InvoiceLine {
  id?: string;
  tempId?: string;
  concept: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  line_order?: number;
  isNew?: boolean;
  isModified?: boolean;
  isDeleted?: boolean;
}

interface TaxOption {
  value: number;
  label: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_name: string | null;
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
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [originalLines, setOriginalLines] = useState<InvoiceLine[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);

  const {
    numericInputValues,
    setNumericInputValues,
    calculateLineValues: calcLine,
    handleNumericInputChange: handleNumericChange,
    clearNumericInputKey,
    getNumericDisplayValue,
    computeTotals,
  } = useDocumentLines(defaultTaxRate, taxOptions);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceData();
    }
    fetchClients();
    fetchSaleTaxes();
  }, [invoiceId]);

  const fetchSaleTaxes = async () => {
    try {
      const { data, error } = await supabase.rpc("list_taxes", { p_tax_type: "sales" });
      if (error) throw error;

      const options: TaxOption[] = (data || [])
        .filter((t: any) => t.is_active)
        .map((t: any) => ({
          value: t.rate,
          label: t.name,
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
      setTaxOptions([{ value: 21, label: "IVA 21%" }]);
    }
  };

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      // Fetch invoice details using finance_get_invoice to get all new fields
      const { data: invoiceData, error: invoiceError } = await supabase.rpc("finance_get_invoice", {
        p_invoice_id: invoiceId!,
      });
      if (invoiceError) throw invoiceError;
      if (!invoiceData || invoiceData.length === 0) throw new Error("Factura no encontrada");

      const inv = Array.isArray(invoiceData) ? invoiceData[0] : invoiceData;

      // Check if invoice is locked (using is_locked field or locked states)
      const isLocked = (inv.is_locked || LOCKED_FINANCE_INVOICE_STATES.includes(inv.status)) && inv.status !== 'DRAFT';
      if (isLocked) {
        toast({
          title: "Factura bloqueada",
          description: `La factura está bloqueada y no puede ser editada. Estado: ${inv.status}`,
          variant: "destructive",
        });
        navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
        return;
      }

      setInvoice({
        id: inv.id,
        invoice_number: inv.invoice_number,
        client_id: inv.client_id,
        client_name: inv.client_name,
        project_id: inv.project_id,
        project_name: inv.project_name,
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

      // Fetch invoice lines
      const { data: linesData, error: linesError } = await supabase.rpc("finance_get_invoice_lines", {
        p_invoice_id: invoiceId!,
      });
      if (linesError) throw linesError;

      const mappedLines: InvoiceLine[] = (linesData || []).map((l: any) => ({
        id: l.id,
        concept: l.concept,
        quantity: l.quantity,
        unit_price: l.unit_price,
        tax_rate: l.tax_rate,
        discount_percent: l.discount_percent,
        subtotal: l.subtotal,
        tax_amount: l.tax_amount,
        total: l.total,
      }));

      setLines(mappedLines);
      setOriginalLines(JSON.parse(JSON.stringify(mappedLines)));

      // Fetch projects for the client
      if (inv.client_id) {
        await fetchClientProjects(inv.client_id);
      }
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar la factura",
        variant: "destructive",
      });
      navigate(`/nexo-av/${userId}/invoices`);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.rpc("list_clients", {});
      if (error) throw error;
      setClients(data?.map((c: any) => ({ id: c.id, company_name: c.company_name })) || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchClientProjects = async (clientId: string) => {
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase.rpc("list_projects", {
        p_search: null
      });
      if (error) throw error;
      const clientProjects = (data || []).filter((p: any) => p.client_id === clientId);
      setProjects(clientProjects.map((p: any) => ({
        id: p.id,
        project_number: p.project_number,
        project_name: p.project_name,
        site_mode: p.site_mode || null,
      })));
      return clientProjects;
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
      return [];
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchSitesForProject = async (projectId: string) => {
    try {
      setLoadingSites(true);
      const { data, error } = await supabase.rpc("list_project_sites", { p_project_id: projectId });
      if (error) throw error;
      const sites: ProjectSite[] = (data || [])
        .filter((s: any) => s.is_active)
        .map((s: any) => ({ id: s.id, site_name: s.site_name, city: s.city, is_default: s.is_default }));
      setProjectSites(sites);
      const proj = projects.find(p => p.id === projectId);
      if (proj?.site_mode === "SINGLE_SITE" && sites.length > 0) {
        const defaultSite = sites.find(s => s.is_default) || sites[0];
        setSelectedSiteId(defaultSite.id);
      }
    } catch (error) {
      console.error("Error fetching sites:", error);
      setProjectSites([]);
    } finally {
      setLoadingSites(false);
    }
  };

  // Fetch projects when client changes
  useEffect(() => {
    if (selectedClientId && !loading) {
      fetchClientProjects(selectedClientId);
      // Clear project selection if client changes
      if (invoice && selectedClientId !== invoice.client_id) {
        setSelectedProjectId("");
        setSelectedSiteId("");
        setProjectSites([]);
      }
    }
  }, [selectedClientId]);

  // Fetch sites when project changes
  useEffect(() => {
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project?.site_mode === "MULTI_SITE" || project?.site_mode === "SINGLE_SITE") {
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

  const calculateLineValues = (line: Partial<InvoiceLine>): InvoiceLine =>
    calcLine(line) as InvoiceLine;

  const addLine = () => {
    const newLine = calculateLineValues({
      tempId: crypto.randomUUID(),
      concept: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: defaultTaxRate,
      discount_percent: 0,
      isNew: true,
    });
    setLines([...lines, newLine]);
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: any) => {
    const updatedLines = [...lines];
    const line = updatedLines[index];

    updatedLines[index] = calculateLineValues({
      ...line,
      [field]: value,
      isModified: line.id ? true : line.isModified,
    });
    setLines(updatedLines);
  };

  const handleProductSelect = (index: number, item: { id: string; type: string; name: string; code: string; price: number; tax_rate: number; description?: string }) => {
    const updatedLines = [...lines];
    const currentLine = updatedLines[index];
    const currentQuantity = currentLine.quantity;

    const lineData = {
      ...currentLine,
      concept: item.name,
      unit_price: item.price,
      tax_rate: item.tax_rate || defaultTaxRate,
      quantity: currentQuantity,
      isModified: currentLine.id ? true : currentLine.isModified,
    };

    updatedLines[index] = calculateLineValues(lineData);
    setLines(updatedLines);
  };

  const removeLine = (index: number) => {
    const line = lines[index];
    if (line.id) {
      // Mark existing line as deleted
      const updatedLines = [...lines];
      updatedLines[index] = { ...line, isDeleted: true };
      setLines(updatedLines);
    } else {
      // Remove new line completely
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const getVisibleLines = () => lines.filter(l => !l.isDeleted);

  const getTotals = () => computeTotals(lines);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

  const handleNumericInputChange = (
    value: string,
    field: "quantity" | "unit_price" | "discount_percent",
    realIndex: number
  ) => {
    handleNumericChange(value, field, realIndex, updateLine as (i: number, f: string, v: number) => void);
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
      const result: InvoiceLine[] = [];
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

  const handleSave = async () => {
    if (!selectedClientId) {
      toast({
        title: "Error",
        description: "Selecciona un cliente",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Update invoice header
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      const { error: updateError } = await supabase.rpc("update_invoice", {
        p_invoice_id: invoiceId!,
        p_client_id: selectedClientId,
        p_project_id: selectedProjectId || null,
        p_project_name: selectedProject?.project_name || null,
        p_issue_date: issueDate,
        p_due_date: dueDate,
        // @ts-ignore - p_site_id added via migration
        p_site_id: selectedSiteId || null,
      });
      if (updateError) throw updateError;

      // Process line changes — track resolved IDs for reorder
      const idMap = new Map<string, string>(); // tempId/id → real id

      for (const line of lines) {
        if (line.isDeleted && line.id) {
          // Delete existing line
          const { error } = await supabase.rpc("delete_invoice_line", {
            p_line_id: line.id,
          });
          if (error) throw error;
        } else if (line.isNew && !line.isDeleted && line.concept.trim()) {
          // Add new line — capture returned UUID
          const { data: newId, error } = await supabase.rpc("add_invoice_line", {
            p_invoice_id: invoiceId!,
            p_concept: line.concept,
            p_description: null,
            p_quantity: line.quantity,
            p_unit_price: line.unit_price,
            p_tax_rate: line.tax_rate,
            p_discount_percent: line.discount_percent,
          });
          if (error) throw error;
          const key = line.tempId || line.id;
          if (key && newId) idMap.set(key, newId as string);
        } else if (line.isModified && line.id && !line.isDeleted) {
          // Update existing line
          const { error } = await supabase.rpc("update_invoice_line", {
            p_line_id: line.id,
            p_concept: line.concept,
            p_description: null,
            p_quantity: line.quantity,
            p_unit_price: line.unit_price,
            p_tax_rate: line.tax_rate,
            p_discount_percent: line.discount_percent,
          });
          if (error) throw error;
          idMap.set(line.id, line.id);
        } else if (line.id && !line.isDeleted) {
          // Existing unmodified line — just track its ID for reorder
          idMap.set(line.id, line.id);
        }
      }

      // Persist line order atomically
      const lineIdsToOrder = lines
        .filter(l => !l.isDeleted)
        .map(l => {
          const key = l.tempId || l.id;
          return key ? idMap.get(key) ?? l.id : undefined;
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
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la factura",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const visibleLines = getVisibleLines();
  const totals = getTotals();

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

  return (
    <div className="w-full">
      <div className="w-full px-3 md:px-4 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 mb-4 md:mb-8">
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

          {/* Invoice header info */}
          <div className="bg-card rounded-2xl md:rounded-3xl border border-border p-3 md:p-6 mb-3 md:mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
              <div className="p-1.5 rounded-xl bg-muted">
                <FileText className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
              </div>
              <span className="text-muted-foreground text-[10px] md:text-xs font-medium uppercase tracking-wide">Datos de la factura</span>
              <span className="ml-auto text-orange-500 font-mono text-xs">{invoice.invoice_number}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <div className="space-y-1 md:space-y-2 col-span-2 md:col-span-1">
                <Label className="text-muted-foreground text-[10px] md:text-sm">Cliente</Label>
                <Select
                  value={selectedClientId || undefined}
                  onValueChange={(value) => {
                    setSelectedClientId(value);
                    setSelectedProjectId("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:space-y-2 col-span-2 md:col-span-1">
                <Label className="text-muted-foreground text-[10px] md:text-sm">Proyecto</Label>
                <Select
                  value={
                    !selectedClientId || projects.length === 0
                      ? undefined
                      : (selectedProjectId || "__none__")
                  }
                  onValueChange={(v) => setSelectedProjectId(v === "__none__" ? "" : v)}
                  disabled={!selectedClientId || loadingProjects}
                >
                  <SelectTrigger className="w-full">
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
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Site Selector - MULTI_SITE */}
              {selectedProjectId && projects.find(p => p.id === selectedProjectId)?.site_mode === "MULTI_SITE" && projectSites.length > 0 && (
                <div className="space-y-1 md:space-y-2 col-span-2">
                  <Label className="text-muted-foreground text-[10px] md:text-sm flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Sitio de instalación *
                  </Label>
                  <Select value={selectedSiteId || undefined} onValueChange={setSelectedSiteId} disabled={loadingSites}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={loadingSites ? "Cargando sitios..." : "Seleccionar sitio..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {projectSites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.site_name}{s.city ? ` — ${s.city}` : ""}{s.is_default ? " ★" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Site info - SINGLE_SITE */}
              {selectedProjectId && projects.find(p => p.id === selectedProjectId)?.site_mode === "SINGLE_SITE" && projectSites.length > 0 && (
                <div className="space-y-1 md:space-y-2 col-span-2">
                  <Label className="text-muted-foreground text-[10px] md:text-sm flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Sitio
                  </Label>
                  <div className="text-sm font-medium text-foreground px-3 py-2 bg-muted rounded-xl border border-border">
                    {projectSites[0]?.site_name}{projectSites[0]?.city ? ` — ${projectSites[0].city}` : ""}
                  </div>
                </div>
              )}

              <div className="space-y-1 md:space-y-2">
                <Label className="text-muted-foreground text-[10px] md:text-sm">Fecha emisión</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-8 md:h-10 text-xs md:text-sm rounded-xl"
                />
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-muted-foreground text-[10px] md:text-sm">Vencimiento</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 md:h-10 text-xs md:text-sm rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Lines table */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <span className="text-foreground text-sm font-semibold uppercase tracking-wider">Líneas de la factura</span>
              <span className="text-muted-foreground text-xs font-medium">Escribe @nombre para buscar en el catálogo</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground w-10 px-5 py-3 text-xs font-semibold uppercase tracking-wider"></TableHead>
                    <TableHead className="text-muted-foreground min-w-[300px] px-5 py-3 text-xs font-semibold uppercase tracking-wider">Concepto</TableHead>
                    <TableHead className="text-muted-foreground text-center w-28 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Cant.</TableHead>
                    <TableHead className="text-muted-foreground text-right w-32 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Precio</TableHead>
                    <TableHead className="text-muted-foreground text-center w-20 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Dto %</TableHead>
                    <TableHead className="text-muted-foreground w-36 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Impuestos</TableHead>
                    <TableHead className="text-muted-foreground text-right w-32 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Total</TableHead>
                    <TableHead className="text-muted-foreground w-14 px-5 py-3"></TableHead>
                  </TableRow>
                </TableHeader>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={visibleLines.map(l => l.id || l.tempId || "")}
                    strategy={verticalListSortingStrategy}
                  >
                    <TableBody>
                      {visibleLines.map((line) => {
                        const realIndex = lines.findIndex(l => (l.id || l.tempId) === (line.id || line.tempId));
                        return (
                          <SortableLineRow
                            key={line.tempId || line.id}
                            id={line.id || line.tempId || ""}
                            className="border-border hover:bg-muted/40 transition-colors duration-150 group"
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
                                  <ProductSearchInput
                                    value={line.concept}
                                    onChange={(value) => updateLine(realIndex, "concept", value)}
                                    onSelectItem={(item) => handleProductSelect(realIndex, item)}
                                    placeholder="Concepto o @buscar"
                                    className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm font-medium pl-2 pr-0 py-2 hover:border-primary/40 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                                  />
                                </TableCell>
                                <TableCell className="px-5 py-3.5">
                                  <div className="flex justify-center">
                                    <Input type="text" inputMode="numeric" value={getNumericDisplayValue(line.quantity, 'quantity', realIndex)} onChange={(e) => handleNumericInputChange(e.target.value, 'quantity', realIndex)} onBlur={() => clearNumericInputKey(realIndex, 'quantity')} className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm text-center font-medium px-0 py-2 w-20 hover:border-primary/40 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors" placeholder="0" />
                                  </div>
                                </TableCell>
                                <TableCell className="px-5 py-3.5">
                                  <Input type="text" inputMode="decimal" value={getNumericDisplayValue(line.unit_price, 'unit_price', realIndex)} onChange={(e) => handleNumericInputChange(e.target.value, 'unit_price', realIndex)} onBlur={() => clearNumericInputKey(realIndex, 'unit_price')} className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm text-right font-medium px-0 py-2 hover:border-primary/40 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors" placeholder="0,00" />
                                </TableCell>
                                <TableCell className="px-5 py-3.5">
                                  <Input type="text" inputMode="decimal" value={getNumericDisplayValue(line.discount_percent || 0, 'discount_percent', realIndex)} onChange={(e) => handleNumericInputChange(e.target.value, 'discount_percent', realIndex)} onBlur={() => clearNumericInputKey(realIndex, 'discount_percent')} className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm text-center font-medium px-0 py-2 w-12 mx-auto hover:border-primary/40 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors" placeholder="0" />
                                </TableCell>
                                <TableCell className="px-5 py-3.5">
                                  <div className="flex justify-center">
                                    <select value={line.tax_rate.toString()} onChange={(e) => updateLine(realIndex, "tax_rate", parseFloat(e.target.value))} className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm font-medium px-1 py-2 w-full hover:border-primary/50 focus:border-primary rounded-none transition-colors outline-none">
                                      {taxOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value.toString()}>{opt.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                </TableCell>
                                <TableCell className="text-foreground text-right font-semibold px-5 py-3.5">
                                  {formatCurrency(line.total)}
                                </TableCell>
                                <TableCell className="px-5 py-3.5">
                                  <Button variant="ghost" size="icon" onClick={() => removeLine(realIndex)} className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-8 w-8 transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </>
                            )}
                          </SortableLineRow>
                        );
                      })}
                    </TableBody>
                  </SortableContext>
                </DndContext>
              </Table>
            </div>

            <div className="p-5 border-t border-border">
              <Button
                variant="outline"
                onClick={addLine}
                className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 backdrop-blur-sm rounded-lg transition-all duration-200 h-10 px-4 font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Añadir línea
              </Button>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="bg-card rounded-2xl md:rounded-3xl border border-border p-4 md:p-6 w-full md:w-80 shadow-sm">
              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span className="font-medium">Base imponible</span>
                  <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.taxes.map((tax) => (
                  <div key={tax.rate} className="flex justify-between text-muted-foreground text-sm">
                    <span className="font-medium">{tax.label}</span>
                    <span className="font-semibold">{formatCurrency(tax.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-foreground text-lg md:text-xl font-bold pt-3 md:pt-4 border-t border-border">
                  <span>Total</span>
                  <span className="text-orange-400">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EditInvoicePageDesktop;
