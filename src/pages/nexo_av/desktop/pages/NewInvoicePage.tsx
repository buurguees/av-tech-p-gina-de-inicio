import { useState, useEffect, useCallback, useMemo } from "react";
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
import { SortableLineRow } from "../components/documents/SortableLineRow";
import { useDocumentLines } from "../hooks/useDocumentLines";

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
}

interface TaxOption {
  value: number;
  label: string;
}

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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const NewInvoicePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);

  const {
    expandedDescriptionIndex: _expandedDesc,
    numericInputValues,
    setNumericInputValues,
    calculateLineValues,
    handleNumericInputChange: handleNumericChange,
    clearNumericInputKey,
    getNumericDisplayValue,
    computeTotals,
  } = useDocumentLines(defaultTaxRate, taxOptions);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Init
  useEffect(() => {
    fetchClients();
    fetchSaleTaxes();
    const urlClientId = searchParams.get("clientId");
    if (urlClientId) setSelectedClientId(urlClientId);
  }, [searchParams]);

  // Load projects when client changes
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

  // Pre-select project from URL
  useEffect(() => {
    const urlProjectId = searchParams.get("projectId");
    if (urlProjectId && projects.length > 0) {
      if (projects.find((p) => p.id === urlProjectId)) setSelectedProjectId(urlProjectId);
    }
  }, [projects, searchParams]);

  // Load sites when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchSites(selectedProjectId);
    } else {
      setProjectSites([]);
      setSelectedSiteId("");
    }
  }, [selectedProjectId]);

  // Add first empty line once taxes are loaded
  useEffect(() => {
    if (taxOptions.length > 0 && lines.length === 0) {
      addEmptyLine();
    }
  }, [taxOptions]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.rpc("list_clients", { p_search: null });
      if (error) throw error;
      setClients((data || []).map((c: any) => ({ id: c.id, company_name: c.company_name })));
    } catch (e) {
      console.error("Error fetching clients:", e);
    }
  };

  const fetchClientProjects = async (clientId: string) => {
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase.rpc("list_projects", { p_search: null });
      if (error) throw error;
      setProjects(
        (data || [])
          .filter((p: any) => p.client_id === clientId)
          .map((p: any) => ({
            id: p.id,
            project_name: p.project_name,
            project_number: p.project_number,
            site_mode: p.site_mode || undefined,
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
      const { data, error } = await supabase.rpc("list_project_sites", { p_project_id: projectId });
      if (error) throw error;
      const sites: ProjectSite[] = (data || [])
        .filter((s: any) => s.is_active)
        .map((s: any) => ({ id: s.id, site_name: s.site_name, city: s.city, is_default: s.is_default }));
      setProjectSites(sites);
      const proj = projects.find((p) => p.id === projectId);
      if (proj?.site_mode === "SINGLE_SITE" && sites.length > 0) {
        const def = sites.find((s) => s.is_default) || sites[0];
        setSelectedSiteId(def.id);
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
        .filter((t: any) => t.is_active)
        .map((t: any) => ({ value: t.rate, label: t.name }));
      setTaxOptions(options);
      const def = (data || []).find((t: any) => t.is_default && t.is_active);
      setDefaultTaxRate(def?.rate ?? options[0]?.value ?? 21);
    } catch (e) {
      console.error("Error fetching taxes:", e);
      setTaxOptions([{ value: 21, label: "IVA 21%" }]);
    }
  };

  const addEmptyLine = useCallback(() => {
    setLines((prev) => [
      ...prev,
      calculateLineValues({
        tempId: crypto.randomUUID(),
        concept: "",
        quantity: 1,
        unit_price: 0,
        tax_rate: defaultTaxRate,
        discount_percent: 0,
        line_order: prev.length + 1,
      }) as InvoiceLine,
    ]);
  }, [calculateLineValues, defaultTaxRate]);

  const updateLine = useCallback(
    (index: number, field: keyof InvoiceLine, value: any) => {
      setLines((prev) => {
        const updated = [...prev];
        updated[index] = calculateLineValues({ ...updated[index], [field]: value }) as InvoiceLine;
        return updated;
      });
    },
    [calculateLineValues]
  );

  const removeLine = useCallback((index: number) => {
    setLines((prev) =>
      prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, line_order: i + 1 }))
    );
  }, []);

  const handleNumericInputChange = (
    value: string,
    field: "quantity" | "unit_price" | "discount_percent",
    index: number
  ) => {
    handleNumericChange(value, field, index, updateLine as (i: number, f: string, v: number) => void);
  };

  const handleProductSelect = (
    index: number,
    item: { name: string; code?: string; price: number; tax_rate?: number; description?: string }
  ) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = calculateLineValues({
        ...updated[index],
        concept: item.name,
        unit_price: item.price,
        tax_rate: item.tax_rate ?? defaultTaxRate,
      }) as InvoiceLine;
      return updated;
    });
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLines((prev) => {
      const oldIndex = prev.findIndex((l) => (l.id || l.tempId) === active.id);
      const newIndex = prev.findIndex((l) => (l.id || l.tempId) === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((l, i) => ({ ...l, line_order: i + 1 }));
    });
  }, []);

  const totals = useMemo(() => computeTotals(lines), [lines, computeTotals]);

  const handleSave = async () => {
    if (!selectedClientId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" });
      return;
    }
    const selectedProject = projects.find((p) => p.id === selectedProjectId);
    if (selectedProject?.site_mode === "MULTI_SITE" && !selectedSiteId) {
      toast({ title: "Error", description: "Selecciona un sitio para este proyecto multi-sitio", variant: "destructive" });
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
        }
      );
      if (invoiceError) throw invoiceError;
      if (!invoiceData || invoiceData.length === 0) throw new Error("No se pudo crear la factura");

      const invoiceId = invoiceData[0].invoice_id;

      for (const line of validLines) {
        const { error: lineError } = await supabase.rpc("add_invoice_line", {
          p_invoice_id: invoiceId,
          p_concept: line.concept,
          p_description: null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_discount_percent: line.discount_percent,
        });
        if (lineError) throw lineError;
      }

      toast({
        title: "Factura creada",
        description: `Factura ${invoiceData[0].invoice_number} guardada correctamente`,
      });
      navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast({ title: "Error", description: error.message || "No se pudo guardar la factura", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

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
              <h1 className="text-base md:text-2xl font-bold text-foreground">Nueva factura</h1>
              <p className="text-muted-foreground text-[10px] md:text-sm hidden md:block">
                El número se asignará automáticamente al guardar
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              size="icon"
              className="bg-orange-500 hover:bg-orange-600 text-white h-8 w-8 md:h-10 md:w-auto md:px-4 rounded-2xl shadow-lg shadow-orange-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="hidden md:inline ml-2">Guardar</span>
            </Button>
          </div>

          {/* Invoice header */}
          <div className="bg-card rounded-2xl md:rounded-3xl border border-border p-3 md:p-6 mb-3 md:mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
              <div className="p-1.5 rounded-xl bg-muted">
                <FileText className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
              </div>
              <span className="text-muted-foreground text-[10px] md:text-xs font-medium uppercase tracking-wide">
                Datos de la factura
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {/* Client */}
              <div className="space-y-1 md:space-y-2 col-span-2 md:col-span-1">
                <Label className="text-muted-foreground text-[10px] md:text-sm">Cliente</Label>
                <Select
                  value={selectedClientId || undefined}
                  onValueChange={(v) => {
                    setSelectedClientId(v);
                    setSelectedProjectId("");
                    setSelectedSiteId("");
                    setProjectSites([]);
                  }}
                >
                  <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm rounded-xl">
                    <SelectValue placeholder="Seleccionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project */}
              <div className="space-y-1 md:space-y-2 col-span-2 md:col-span-1">
                <Label className="text-muted-foreground text-[10px] md:text-sm">Proyecto</Label>
                <Select
                  value={!selectedClientId || projects.length === 0 ? undefined : selectedProjectId || "__none__"}
                  onValueChange={(v) => {
                    setSelectedProjectId(v === "__none__" ? "" : v);
                    setSelectedSiteId("");
                    setProjectSites([]);
                  }}
                  disabled={!selectedClientId || loadingProjects || projects.length === 0}
                >
                  <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm rounded-xl">
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

              {/* Site */}
              {selectedProject?.site_mode === "MULTI_SITE" && projectSites.length > 0 && (
                <div className="space-y-1 md:space-y-2 col-span-2">
                  <Label className="text-muted-foreground text-[10px] md:text-sm flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Sitio de instalación *
                  </Label>
                  <Select value={selectedSiteId || undefined} onValueChange={setSelectedSiteId}>
                    <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm rounded-xl">
                      <SelectValue placeholder="Seleccionar sitio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projectSites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.site_name}{s.city ? ` — ${s.city}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedProject?.site_mode === "SINGLE_SITE" && projectSites.length > 0 && (
                <div className="space-y-1 md:space-y-2 col-span-2">
                  <Label className="text-muted-foreground text-[10px] md:text-sm flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Sitio
                  </Label>
                  <div className="text-sm font-medium text-foreground px-3 py-2 bg-muted/30 rounded-md border border-border">
                    {projectSites[0]?.site_name}{projectSites[0]?.city ? ` — ${projectSites[0].city}` : ""}
                  </div>
                </div>
              )}

              {/* Dates */}
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
              <span className="text-foreground text-sm font-semibold uppercase tracking-wider">
                Líneas de la factura
              </span>
              <span className="text-muted-foreground text-xs font-medium">
                Escribe @nombre para buscar en el catálogo
              </span>
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
                    items={lines.map((l) => l.id || l.tempId || "")}
                    strategy={verticalListSortingStrategy}
                  >
                    <TableBody>
                      {lines.map((line, index) => (
                        <SortableLineRow
                          key={line.tempId || line.id}
                          id={line.id || line.tempId || String(index)}
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
                                  onChange={(value) => updateLine(index, "concept", value)}
                                  onSelectItem={(item) => handleProductSelect(index, item)}
                                  placeholder="Concepto o @buscar"
                                  className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm font-medium pl-2 pr-0 py-2 hover:border-primary/40 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                                />
                              </TableCell>
                              <TableCell className="px-5 py-3.5">
                                <div className="flex justify-center">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={getNumericDisplayValue(line.quantity, "quantity", index)}
                                    onChange={(e) => handleNumericInputChange(e.target.value, "quantity", index)}
                                    onBlur={() => clearNumericInputKey(index, "quantity")}
                                    className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm text-center font-medium px-0 py-2 w-20 hover:border-primary/40 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                                    placeholder="0"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="px-5 py-3.5">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={getNumericDisplayValue(line.unit_price, "unit_price", index)}
                                  onChange={(e) => handleNumericInputChange(e.target.value, "unit_price", index)}
                                  onBlur={() => clearNumericInputKey(index, "unit_price")}
                                  className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm text-right font-medium px-0 py-2 hover:border-primary/40 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                                  placeholder="0,00"
                                />
                              </TableCell>
                              <TableCell className="px-5 py-3.5">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={getNumericDisplayValue(line.discount_percent || 0, "discount_percent", index)}
                                  onChange={(e) => handleNumericInputChange(e.target.value, "discount_percent", index)}
                                  onBlur={() => clearNumericInputKey(index, "discount_percent")}
                                  className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm text-center font-medium px-0 py-2 w-12 mx-auto hover:border-primary/40 focus:border-primary/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                                  placeholder="0"
                                />
                              </TableCell>
                              <TableCell className="px-5 py-3.5">
                                <div className="flex justify-center">
                                  <select
                                    value={line.tax_rate.toString()}
                                    onChange={(e) => updateLine(index, "tax_rate", parseFloat(e.target.value))}
                                    className="bg-transparent border-0 border-b border-border text-foreground h-auto text-sm font-medium px-1 py-2 w-full hover:border-primary/50 focus:border-primary rounded-none transition-colors outline-none"
                                  >
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
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLine(index)}
                                  className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-8 w-8 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </>
                          )}
                        </SortableLineRow>
                      ))}
                      {lines.length === 0 && (
                        <TableRow className="border-border">
                          <TableCell colSpan={8} className="text-center py-12">
                            <p className="text-muted-foreground text-sm mb-2">No hay líneas en esta factura</p>
                            <Button variant="link" onClick={addEmptyLine} className="text-orange-400 text-sm">
                              Añadir primera línea
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </SortableContext>
                </DndContext>
              </Table>
            </div>
            <div className="p-5 border-t border-border">
              <Button
                variant="outline"
                onClick={addEmptyLine}
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

export default NewInvoicePage;
