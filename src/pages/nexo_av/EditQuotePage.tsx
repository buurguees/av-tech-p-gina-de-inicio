// EditQuotePage - Quote editing functionality
import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, Save, Loader2, FileText } from "lucide-react";
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
  project_name: string | null;
  status: string;
  valid_until: string | null;
  created_at: string;
}

const QUOTE_STATUSES = [
  { value: "DRAFT", label: "Borrador", className: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
  { value: "SENT", label: "Enviado", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "APPROVED", label: "Aprobado", className: "bg-green-500/20 text-green-300 border-green-500/30" },
  { value: "REJECTED", label: "Rechazado", className: "bg-red-500/20 text-red-300 border-red-500/30" },
  { value: "EXPIRED", label: "Expirado", className: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  { value: "INVOICED", label: "Facturado", className: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
];

const getStatusInfo = (status: string) => {
  return QUOTE_STATUSES.find(s => s.value === status) || QUOTE_STATUSES[0];
};

const EditQuotePage = () => {
  const navigate = useNavigate();
  const { userId, quoteId } = useParams<{ userId: string; quoteId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<string>("DRAFT");
  const [validUntil, setValidUntil] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);

  useEffect(() => {
    if (quoteId) {
      fetchQuoteData();
      fetchClients();
      fetchSaleTaxes();
    }
  }, [quoteId]);

  // Fetch projects when client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchClientProjects(selectedClientId);
    } else {
      setProjects([]);
    }
  }, [selectedClientId]);

  const fetchQuoteData = async () => {
    try {
      setLoading(true);

      // Fetch quote
      const { data: quoteData, error: quoteError } = await supabase.rpc("get_quote", {
        p_quote_id: quoteId,
      });
      if (quoteError) throw quoteError;
      if (!quoteData || quoteData.length === 0) throw new Error("Presupuesto no encontrado");
      
      const quoteInfo = quoteData[0];
      setQuote(quoteInfo);
      setSelectedClientId(quoteInfo.client_id);
      setCurrentStatus(quoteInfo.status);
      setValidUntil(quoteInfo.valid_until ? quoteInfo.valid_until.split('T')[0] : '');

      // Fetch quote lines
      const { data: linesData, error: linesError } = await supabase.rpc("get_quote_lines", {
        p_quote_id: quoteId,
      });
      if (linesError) throw linesError;
      
      setLines((linesData || []).map((line: any) => ({
        ...line,
        description: line.description || "",
      })));

      // Get project_id from list_quotes
      const { data: quotesListData } = await supabase.rpc("list_quotes", {
        p_search: quoteInfo.quote_number,
      });
      const projectId = (quotesListData?.find((q: any) => q.id === quoteId) as any)?.project_id;
      if (projectId) {
        setSelectedProjectId(projectId);
      }
      
    } catch (error: any) {
      console.error("Error fetching quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el presupuesto",
        variant: "destructive",
      });
      navigate(`/nexo-av/${userId}/quotes`);
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
      const { data, error } = await supabase.rpc("list_projects", { p_search: null });
      if (error) throw error;
      const clientProjects = (data || []).filter((p: any) => p.client_id === clientId);
      setProjects(clientProjects.map((p: any) => ({
        id: p.id,
        project_number: p.project_number,
        project_name: p.project_name,
      })));
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchSaleTaxes = async () => {
    try {
      const { data, error } = await supabase.rpc("list_taxes", { p_tax_type: "Venta" });
      if (error) throw error;
      
      const options: TaxOption[] = (data || [])
        .filter((t: any) => t.is_active)
        .map((t: any) => ({
          value: t.rate,
          label: `${t.name} ${t.rate}%`,
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
      isNew: true,
    });
    setLines([...lines, newLine]);
  };

  const updateLine = (index: number, field: keyof QuoteLine, value: any) => {
    const updatedLines = [...lines];
    updatedLines[index] = calculateLineValues({
      ...updatedLines[index],
      [field]: value,
      isModified: !updatedLines[index].isNew,
    });
    setLines(updatedLines);
  };

  const handleProductSelect = (index: number, item: { id: string; type: string; name: string; code: string; price: number; tax_rate: number; description?: string }) => {
    const updatedLines = [...lines];
    const currentQuantity = updatedLines[index].quantity;
    updatedLines[index] = calculateLineValues({
      ...updatedLines[index],
      concept: item.name,
      description: item.description || "",
      unit_price: item.price,
      tax_rate: item.tax_rate,
      quantity: currentQuantity,
      isModified: !updatedLines[index].isNew,
    });
    setLines(updatedLines);
  };

  const removeLine = (index: number) => {
    const line = lines[index];
    if (line.id) {
      // Mark existing line for deletion
      const updatedLines = [...lines];
      updatedLines[index] = { ...line, isDeleted: true };
      setLines(updatedLines);
    } else {
      // Remove new line completely
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const getTotals = () => {
    const activeLines = lines.filter(l => !l.isDeleted);
    const subtotal = activeLines.reduce((acc, line) => acc + line.subtotal, 0);
    const total = activeLines.reduce((acc, line) => acc + line.total, 0);
    
    const taxesByRate: Record<number, { rate: number; amount: number; label: string }> = {};
    activeLines.forEach((line) => {
      if (line.tax_amount !== 0) {
        if (!taxesByRate[line.tax_rate]) {
          const taxOption = taxOptions.find(t => t.value === line.tax_rate);
          taxesByRate[line.tax_rate] = {
            rate: line.tax_rate,
            amount: 0,
            label: taxOption?.label || `${line.tax_rate}%`,
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
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

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
    const wasProvisional = quote?.quote_number.startsWith("BORR-");
    const isApproving = currentStatus === "APPROVED" && quote?.status !== "APPROVED";
    
    try {
      // Update quote
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      const { error: quoteError } = await supabase.rpc("update_quote", {
        p_quote_id: quoteId!,
        p_client_id: selectedClientId,
        p_project_name: selectedProject?.project_name || null,
        p_valid_until: validUntil || null,
        p_status: currentStatus,
      });
      if (quoteError) throw quoteError;

      // Process lines
      for (const line of lines) {
        if (line.isDeleted && line.id) {
          // Delete line
          const { error } = await supabase.rpc("delete_quote_line", { p_line_id: line.id });
          if (error) throw error;
        } else if (line.isNew && line.concept.trim()) {
          // Add new line
          const { error } = await supabase.rpc("add_quote_line", {
            p_quote_id: quoteId!,
            p_concept: line.concept,
            p_description: line.description || null,
            p_quantity: line.quantity,
            p_unit_price: line.unit_price,
            p_tax_rate: line.tax_rate,
            p_discount_percent: line.discount_percent,
          });
          if (error) throw error;
        } else if (line.isModified && line.id) {
          // Update existing line
          const { error } = await supabase.rpc("update_quote_line", {
            p_line_id: line.id,
            p_concept: line.concept,
            p_description: line.description || null,
            p_quantity: line.quantity,
            p_unit_price: line.unit_price,
            p_tax_rate: line.tax_rate,
            p_discount_percent: line.discount_percent,
          });
          if (error) throw error;
        }
      }

      // Show appropriate message based on what happened
      if (isApproving && wasProvisional) {
        // Fetch the updated quote to get the new number
        const { data: updatedQuote } = await supabase.rpc("get_quote", { p_quote_id: quoteId });
        const newNumber = updatedQuote?.[0]?.quote_number || "asignado";
        
        toast({
          title: "¡Presupuesto aprobado!",
          description: `Se ha asignado el número definitivo: ${newNumber}`,
        });
      } else {
        toast({
          title: "Cambios guardados",
          description: "El presupuesto se ha actualizado correctamente",
        });
      }

      navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
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
  const statusInfo = getStatusInfo(currentStatus);

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <NexoHeader title="Editar Presupuesto" userId={userId || ""} />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-black">
        <NexoHeader title="Editar Presupuesto" userId={userId || ""} />
        <div className="flex flex-col items-center justify-center pt-32">
          <FileText className="h-16 w-16 text-white/20 mb-4" />
          <p className="text-white/60">Presupuesto no encontrado</p>
          <Button
            variant="link"
            onClick={() => navigate(`/nexo-av/${userId}/quotes`)}
            className="text-orange-500 mt-2"
          >
            Volver a presupuestos
          </Button>
        </div>
      </div>
    );
  }

  const isProvisionalNumber = quote.quote_number.startsWith("BORR-");
  const hasFinalNumber = !isProvisionalNumber && quote.quote_number.startsWith("P-");
  const displayNumber = hasFinalNumber ? quote.quote_number : `(${quote.quote_number})`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black pb-mobile-nav">
      <NexoHeader title={`Editar ${displayNumber}`} userId={userId || ""} />

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
                onClick={() => navigate(`/nexo-av/${userId}/quotes/${quoteId}`)}
                className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 md:h-10 md:w-10"
              >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base md:text-2xl font-bold text-white font-mono">{displayNumber}</h1>
                  <Badge className={`${statusInfo.className} text-[10px] md:text-xs`}>
                    {statusInfo.label}
                  </Badge>
                </div>
                <p className="text-white/60 text-[10px] md:text-sm hidden md:block">Editando presupuesto</p>
              </div>
            </div>

            <Button
              onClick={handleSave}
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

          {/* Quote header info - Client Data (same as NewQuotePage) */}
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
                  value={quote.created_at.split('T')[0]}
                  disabled
                  className="bg-white/5 border-white/10 text-white/50 h-8 md:h-10 text-xs md:text-sm"
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

          {/* Mobile Lines - Vertical Cards (same as NewQuotePage) */}
          <div className="md:hidden space-y-2 mb-3">
            {/* Lines Header */}
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-[10px] font-medium uppercase tracking-wide">Líneas del presupuesto</span>
              <span className="text-white/40 text-[9px]">Usa @nombre para buscar</span>
            </div>

            {lines.filter(l => !l.isDeleted).map((line) => {
              const actualIndex = lines.findIndex(l => (l.id || l.tempId) === (line.id || line.tempId));
              return (
                <div key={line.tempId || line.id} className="bg-zinc-900/50 rounded-lg border border-orange-500/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-500/70 text-[10px] font-mono">Línea {actualIndex + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(actualIndex)}
                      className="text-white/40 hover:text-red-400 hover:bg-red-500/10 h-6 w-6"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <ProductSearchInput
                    value={line.concept}
                    onChange={(value) => updateLine(actualIndex, "concept", value)}
                    onSelectItem={(item) => handleProductSelect(actualIndex, item)}
                    placeholder="Concepto o @buscar"
                  />
                  
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(actualIndex, "description", e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="bg-white/5 border-white/10 text-white/80 h-8 text-xs"
                  />
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-white/50 text-[9px]">Cant.</Label>
                      <Input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(actualIndex, "quantity", parseFloat(e.target.value) || 0)}
                        className="bg-white/5 border-white/10 text-white h-8 text-xs text-center"
                        min="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/50 text-[9px]">Precio</Label>
                      <Input
                        type="number"
                        value={line.unit_price}
                        onChange={(e) => updateLine(actualIndex, "unit_price", parseFloat(e.target.value) || 0)}
                        className="bg-white/5 border-white/10 text-white h-8 text-xs"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/50 text-[9px]">IVA</Label>
                      <Select
                        value={line.tax_rate.toString()}
                        onValueChange={(v) => updateLine(actualIndex, "tax_rate", parseFloat(v))}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 z-50">
                          {taxOptions.map((tax) => (
                            <SelectItem key={tax.value} value={tax.value.toString()} className="text-white text-xs">
                              {tax.value}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-white/50 text-[9px]">Subtotal</span>
                    <span className="text-white font-medium text-sm">{formatCurrency(line.subtotal)}</span>
                  </div>
                </div>
              );
            })}
            
            {/* Add line button mobile */}
            <Button
              variant="outline"
              onClick={addLine}
              className="w-full border-dashed border-white/20 text-white/60 hover:bg-white/5 hover:text-white h-10 text-xs"
            >
              <Plus className="h-3 w-3 mr-1.5" />
              Añadir línea
            </Button>
          </div>

          {/* Desktop Lines Table (same structure as NewQuotePage) */}
          <div className="hidden md:block bg-white/[0.03] backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-white/80 text-sm font-medium">Líneas del presupuesto</span>
              <Button
                variant="outline"
                size="sm"
                onClick={addLine}
                className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10 h-9 px-4 gap-2"
              >
                <Plus className="h-4 w-4" />
                Añadir línea
              </Button>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60 text-xs font-medium w-[30%] pl-5">Concepto</TableHead>
                  <TableHead className="text-white/60 text-xs font-medium w-[22%]">Descripción</TableHead>
                  <TableHead className="text-white/60 text-xs font-medium text-center w-[10%]">Cant.</TableHead>
                  <TableHead className="text-white/60 text-xs font-medium text-right w-[12%]">Precio</TableHead>
                  <TableHead className="text-white/60 text-xs font-medium text-center w-[10%]">IVA</TableHead>
                  <TableHead className="text-white/60 text-xs font-medium text-right w-[12%]">Subtotal</TableHead>
                  <TableHead className="text-white/60 text-xs w-[4%] pr-5"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.filter(l => !l.isDeleted).map((line, index) => {
                  const actualIndex = lines.findIndex(l => (l.id || l.tempId) === (line.id || line.tempId));
                  return (
                    <TableRow key={line.id || line.tempId} className="border-white/10 hover:bg-white/[0.02]">
                      <TableCell className="py-2 pl-5 pr-2">
                        <ProductSearchInput
                          value={line.concept}
                          onChange={(value) => updateLine(actualIndex, "concept", value)}
                          onSelectItem={(item) => handleProductSelect(actualIndex, item)}
                          placeholder="@buscar producto"
                        />
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(actualIndex, "description", e.target.value)}
                          className="bg-white/5 border-white/10 text-white h-9 text-sm"
                          placeholder="Descripción"
                        />
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <Input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(actualIndex, "quantity", parseInt(e.target.value) || 0)}
                          className="bg-white/5 border-white/10 text-white h-9 text-sm text-center"
                        />
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => updateLine(actualIndex, "unit_price", parseFloat(e.target.value) || 0)}
                          className="bg-white/5 border-white/10 text-white h-9 text-sm text-right"
                        />
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <Select 
                          value={String(line.tax_rate)} 
                          onValueChange={(v) => updateLine(actualIndex, "tax_rate", parseFloat(v))}
                        >
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10">
                            {taxOptions.map((tax) => (
                              <SelectItem key={tax.value} value={String(tax.value)} className="text-white text-sm">
                                {tax.value}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-white font-medium text-right text-sm py-2 px-2">
                        {formatCurrency(line.subtotal)}
                      </TableCell>
                      <TableCell className="py-2 pl-2 pr-5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(actualIndex)}
                          className="text-white/30 hover:text-red-400 hover:bg-red-500/10 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lines.filter(l => !l.isDeleted).length === 0 && (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={7} className="text-center py-12">
                      <p className="text-white/40 text-sm mb-2">No hay líneas en este presupuesto</p>
                      <Button
                        variant="link"
                        onClick={addLine}
                        className="text-orange-500 text-sm"
                      >
                        Añadir primera línea
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>


          {/* Totals */}
          <div className="bg-white/[0.03] backdrop-blur-sm rounded-xl border border-white/10 p-5 md:p-6">
            <div className="max-w-sm ml-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Base imponible</span>
                <span className="text-white font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.taxes.map((tax) => (
                <div key={tax.rate} className="flex justify-between text-sm">
                  <span className="text-white/60">{tax.label}</span>
                  <span className="text-white font-medium">{formatCurrency(tax.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t border-white/20">
                <span className="text-white font-semibold text-lg">Total</span>
                <span className="text-white text-xl font-bold">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default EditQuotePage;
