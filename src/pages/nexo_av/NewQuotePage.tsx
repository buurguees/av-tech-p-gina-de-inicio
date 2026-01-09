import { useState, useEffect } from "react";
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
import { ArrowLeft, Plus, Trash2, Save, Loader2, GripVertical, FileText } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import NexoHeader from "./components/NexoHeader";
import ProductSearchInput from "./components/ProductSearchInput";

interface Client {
  id: string;
  company_name: string;
}

interface Project {
  id: string;
  project_number: string;
  project_name: string;
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
}

interface TaxOption {
  value: number;
  label: string;
}

const NewQuotePage = () => {
  const navigate = useNavigate();
  const { userId, clientId } = useParams<{ userId: string; clientId?: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [quoteNumber, setQuoteNumber] = useState("Generando...");
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);
  const [sourceQuoteNumber, setSourceQuoteNumber] = useState<string | null>(null);

  // Initialize from URL params and fetch taxes
  useEffect(() => {
    fetchClients();
    fetchSaleTaxes();
    
    // Pre-select client from URL params
    const urlClientId = searchParams.get('clientId') || clientId;
    if (urlClientId) {
      setSelectedClientId(urlClientId);
    }
    
    // Check if we're creating a new version from an existing quote
    const sourceQuoteId = searchParams.get('sourceQuoteId');
    if (sourceQuoteId) {
      loadSourceQuoteData(sourceQuoteId);
    }
  }, [clientId, searchParams]);

  // Load data from source quote for "Nueva versión" functionality
  const loadSourceQuoteData = async (sourceQuoteId: string) => {
    setLoading(true);
    try {
      // Fetch quote details
      const { data: quoteData, error: quoteError } = await supabase.rpc("get_quote", {
        p_quote_id: sourceQuoteId,
      });
      if (quoteError) throw quoteError;
      if (!quoteData || quoteData.length === 0) throw new Error("Presupuesto no encontrado");
      
      const quoteInfo = quoteData[0];
      setSourceQuoteNumber(quoteInfo.quote_number);
      setSelectedClientId(quoteInfo.client_id);

      // Get project_id from list_quotes (get_quote doesn't return it)
      const { data: quotesListData } = await supabase.rpc("list_quotes", {
        p_search: quoteInfo.quote_number,
      });
      const projectId = (quotesListData?.find((q: any) => q.id === sourceQuoteId) as any)?.project_id as string | undefined;
      if (projectId) {
        setSelectedProjectId(projectId);
      }

      // Fetch quote lines
      const { data: linesData, error: linesError } = await supabase.rpc("get_quote_lines", {
        p_quote_id: sourceQuoteId,
      });
      if (linesError) throw linesError;
      
      // Convert lines to our format with new tempIds
      const importedLines: QuoteLine[] = (linesData || []).map((line: any) => ({
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
      }));
      
      setLines(importedLines);
      
      toast({
        title: "Datos importados",
        description: `Se han cargado los datos del presupuesto ${quoteInfo.quote_number}`,
      });
    } catch (error: any) {
      console.error("Error loading source quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los datos del presupuesto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      
      // Set default tax rate
      const defaultTax = (data || []).find((t: any) => t.is_default && t.is_active);
      if (defaultTax) {
        setDefaultTaxRate(defaultTax.rate);
      } else if (options.length > 0) {
        setDefaultTaxRate(options[0].value);
      }
    } catch (error) {
      console.error("Error fetching taxes:", error);
      // Fallback options
      setTaxOptions([{ value: 21, label: "IVA 21%" }]);
    }
  };

  // Fetch projects when client changes and pre-select project from URL
  useEffect(() => {
    if (selectedClientId) {
      fetchClientProjects(selectedClientId).then(() => {
        // Pre-select project from URL params after projects are loaded
        const urlProjectId = searchParams.get('projectId');
        if (urlProjectId) {
          setSelectedProjectId(urlProjectId);
        }
      });
    } else {
      setProjects([]);
      setSelectedProjectId("");
    }
  }, [selectedClientId, searchParams]);

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
      // Filter projects by client_id
      const clientProjects = (data || []).filter((p: any) => p.client_id === clientId);
      setProjects(clientProjects.map((p: any) => ({
        id: p.id,
        project_number: p.project_number,
        project_name: p.project_name,
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

  const calculateLineValues = (line: Partial<QuoteLine>): QuoteLine => {
    const quantity = line.quantity || 0;
    const unitPrice = line.unit_price || 0;
    const discountPercent = line.discount_percent || 0;
    const taxRate = line.tax_rate || 21;

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
    } as QuoteLine;
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
    });
    setLines([...lines, newLine]);
  };

  const updateLine = (index: number, field: keyof QuoteLine, value: any) => {
    const updatedLines = [...lines];
    updatedLines[index] = calculateLineValues({
      ...updatedLines[index],
      [field]: value,
    });
    setLines(updatedLines);
  };

  const handleProductSelect = (index: number, item: { id: string; type: string; name: string; code: string; price: number; tax_rate: number; description?: string }) => {
    const updatedLines = [...lines];
    // Keep existing quantity, update everything else
    const currentQuantity = updatedLines[index].quantity;
    
    updatedLines[index] = calculateLineValues({
      ...updatedLines[index],
      concept: item.name,
      description: item.description || "",
      unit_price: item.price,
      tax_rate: item.tax_rate || defaultTaxRate, // Fallback to default if undefined
      quantity: currentQuantity,
    });
    
    setLines(updatedLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const getTotals = () => {
    const subtotal = lines.reduce((acc, line) => acc + line.subtotal, 0);
    const total = lines.reduce((acc, line) => acc + line.total, 0);
    
    // Group taxes by rate - this ensures each tax rate is shown separately
    const taxesByRate: Record<number, { rate: number; amount: number; label: string }> = {};
    lines.forEach((line) => {
      // Only include taxes with non-zero amounts
      if (line.tax_amount !== 0) {
        if (!taxesByRate[line.tax_rate]) {
          // Find the label from taxOptions, or use rate percentage as fallback
          const taxOption = taxOptions.find(t => t.value === line.tax_rate);
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
      taxes: Object.values(taxesByRate).sort((a, b) => b.rate - a.rate), // Sort by rate descending
      total,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleSave = async (asDraft: boolean = true) => {
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
      // Create quote with auto-generated number
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      const { data: quoteData, error: quoteError } = await supabase.rpc(
        "create_quote_with_number",
        {
          p_client_id: selectedClientId,
          p_project_name: selectedProject?.project_name || null,
          p_valid_until: validUntil,
          p_project_id: selectedProjectId || null,
        }
      );

      if (quoteError) throw quoteError;
      if (!quoteData || quoteData.length === 0) throw new Error("No se pudo crear el presupuesto");

      const quoteId = quoteData[0].quote_id;

      // Add all lines
      for (const line of lines) {
        if (line.concept.trim()) {
          const { error: lineError } = await supabase.rpc("add_quote_line", {
            p_quote_id: quoteId,
            p_concept: line.concept,
            p_description: line.description || null,
            p_quantity: line.quantity,
            p_unit_price: line.unit_price,
            p_tax_rate: line.tax_rate,
            p_discount_percent: line.discount_percent,
          });
          if (lineError) throw lineError;
        }
      }

      toast({
        title: "Presupuesto creado",
        description: `Presupuesto ${quoteData[0].quote_number} guardado correctamente`,
      });

      navigate(`/nexo-av/${userId}/quotes`);
    } catch (error: any) {
      console.error("Error saving quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el presupuesto",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totals = getTotals();

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <NexoHeader title="Nuevo Presupuesto" userId={userId || ""} />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black pb-mobile-nav">
      <NexoHeader title={sourceQuoteNumber ? "Nueva Versión" : "Nuevo Presupuesto"} userId={userId || ""} />

      <main className="container mx-auto px-3 md:px-4 pt-20 md:pt-24 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 mb-4 md:mb-8">
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/nexo-av/${userId}/quotes`)}
                className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 md:h-10 md:w-10"
              >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <div>
                <h1 className="text-base md:text-2xl font-bold text-white">
                  {sourceQuoteNumber ? "Nueva versión" : "Nuevo presupuesto"}
                </h1>
                <p className="text-white/60 text-[10px] md:text-sm hidden md:block">
                  {sourceQuoteNumber 
                    ? `Basado en ${sourceQuoteNumber}` 
                    : "El número se asignará automáticamente al guardar"}
                </p>
              </div>
            </div>

            <Button
              onClick={() => handleSave(false)}
              disabled={saving}
              size="icon"
              className="bg-orange-500 hover:bg-orange-600 text-white h-8 w-8 md:h-10 md:w-auto md:px-4"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden md:inline ml-2">Guardar</span>
            </Button>
          </div>

          {/* Quote header info - Client Data */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg md:rounded-xl border border-white/10 p-3 md:p-6 mb-3 md:mb-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
              <div className="p-1.5 rounded bg-white/5">
                <FileText className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
              </div>
              <span className="text-white/60 text-[10px] md:text-xs font-medium uppercase tracking-wide">Datos del documento</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <div className="space-y-1 md:space-y-2 col-span-2 md:col-span-1">
                <Label className="text-white/70 text-[10px] md:text-sm">Contacto</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="text-white text-xs md:text-sm">
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:space-y-2 col-span-2 md:col-span-1">
                <Label className="text-white/70 text-[10px] md:text-sm">Proyecto</Label>
                <Select 
                  value={selectedProjectId} 
                  onValueChange={setSelectedProjectId}
                  disabled={!selectedClientId || loadingProjects}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder={
                      !selectedClientId 
                        ? "Cliente primero" 
                        : loadingProjects 
                          ? "Cargando..." 
                          : projects.length === 0 
                            ? "Sin proyectos"
                            : "Seleccionar"
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="text-white text-xs md:text-sm">
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-white/70 text-[10px] md:text-sm">Fecha</Label>
                <Input
                  type="date"
                  value={new Date().toISOString().split("T")[0]}
                  disabled
                  className="bg-white/5 border-white/10 text-white h-8 md:h-10 text-xs md:text-sm"
                />
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-white/70 text-[10px] md:text-sm">Vence</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-8 md:h-10 text-xs md:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Mobile Lines - Vertical Cards */}
          <div className="md:hidden space-y-2 mb-3">
            {/* Lines Header */}
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-[10px] font-medium uppercase tracking-wide">Líneas del presupuesto</span>
              <span className="text-white/40 text-[9px]">Usa @nombre para buscar</span>
            </div>

            {lines.map((line, index) => (
              <div key={line.tempId || line.id} className="bg-zinc-900/50 rounded-lg border border-orange-500/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-orange-500/70 text-[10px] font-mono">Línea {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(index)}
                    className="text-white/40 hover:text-red-400 hover:bg-red-500/10 h-6 w-6"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                
                <ProductSearchInput
                  value={line.concept}
                  onChange={(value) => updateLine(index, "concept", value)}
                  onSelectItem={(item) => handleProductSelect(index, item)}
                  placeholder="Concepto o @buscar"
                />
                
                <Input
                  value={line.description}
                  onChange={(e) => updateLine(index, "description", e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="bg-white/5 border-white/10 text-white/80 h-8 text-xs"
                />
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-white/50 text-[9px]">Cant.</Label>
                    <Input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, "quantity", parseFloat(e.target.value) || 0)}
                      className="bg-white/5 border-white/10 text-white h-8 text-xs text-center"
                      min="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/50 text-[9px]">Precio</Label>
                    <Input
                      type="number"
                      value={line.unit_price}
                      onChange={(e) => updateLine(index, "unit_price", parseFloat(e.target.value) || 0)}
                      className="bg-white/5 border-white/10 text-white h-8 text-xs"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/50 text-[9px]">IVA</Label>
                    <Select
                      value={line.tax_rate.toString()}
                      onValueChange={(v) => updateLine(index, "tax_rate", parseFloat(v))}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        {taxOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value.toString()} className="text-white text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end pt-1 border-t border-white/10">
                  <span className="text-white font-medium text-xs">{formatCurrency(line.total)}</span>
                </div>
              </div>
            ))}
            
            <Button
              variant="outline"
              onClick={addLine}
              className="w-full border-white/20 text-white hover:bg-white/10 h-9 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Añadir línea
            </Button>
          </div>

          {/* Desktop Lines table */}
          <div className="hidden md:block bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-orange-500/20 overflow-hidden mb-6">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white/60 text-xs font-medium uppercase tracking-wide">Líneas del presupuesto</span>
              <span className="text-white/40 text-xs">Escribe @nombre para buscar en el catálogo</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70 w-8"></TableHead>
                  <TableHead className="text-white/70">Concepto (usa @buscar)</TableHead>
                  <TableHead className="text-white/70 w-32">Descripción</TableHead>
                  <TableHead className="text-white/70 text-center w-20">Cantidad</TableHead>
                  <TableHead className="text-white/70 text-right w-24">Precio</TableHead>
                  <TableHead className="text-white/70 w-36">Impuestos</TableHead>
                  <TableHead className="text-white/70 text-right w-28">Total</TableHead>
                  <TableHead className="text-white/70 w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={line.tempId || line.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/30">
                      <GripVertical className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <ProductSearchInput
                        value={line.concept}
                        onChange={(value) => updateLine(index, "concept", value)}
                        onSelectItem={(item) => handleProductSelect(index, item)}
                        placeholder="Concepto o @buscar"
                        className="bg-transparent border-0 p-0 h-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(index, "description", e.target.value)}
                        placeholder="Desc"
                        className="bg-transparent border-0 text-white/80 placeholder:text-white/30 p-0 h-auto focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, "quantity", parseFloat(e.target.value) || 0)}
                        className="bg-transparent border-0 text-white text-center p-0 h-auto focus-visible:ring-0 w-16 mx-auto"
                        min="0"
                        step="1"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={line.unit_price}
                        onChange={(e) => updateLine(index, "unit_price", parseFloat(e.target.value) || 0)}
                        className="bg-transparent border-0 text-white text-right p-0 h-auto focus-visible:ring-0"
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={line.tax_rate.toString()}
                        onValueChange={(v) => updateLine(index, "tax_rate", parseFloat(v))}
                      >
                        <SelectTrigger className="bg-white/10 border-white/10 text-white h-8 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          {taxOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value.toString()} className="text-white">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-white text-right font-medium">
                      {formatCurrency(line.total)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(index)}
                        className="text-white/40 hover:text-red-400 hover:bg-red-500/10 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="p-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={addLine}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Añadir línea
              </Button>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg md:rounded-xl border border-white/10 p-3 md:p-6 w-full md:w-80">
              <div className="space-y-2 md:space-y-3">
                <div className="flex justify-between text-white/70 text-xs md:text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.taxes.map((tax) => (
                  <div key={tax.rate} className="flex justify-between text-white/70 text-xs md:text-sm">
                    <span>{tax.label}</span>
                    <span>{formatCurrency(tax.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-white text-sm md:text-lg font-bold pt-2 md:pt-3 border-t border-white/10">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default NewQuotePage;
