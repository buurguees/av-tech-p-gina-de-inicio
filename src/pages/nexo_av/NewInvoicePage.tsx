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
import ProductSearchInput from "./components/ProductSearchInput";
import NexoHeader, { NexoLogo } from "./components/NexoHeader";
import { useNexoAvTheme } from "./hooks/useNexoAvTheme";

interface Client {
  id: string;
  company_name: string;
}

interface Project {
  id: string;
  project_number: string;
  project_name: string;
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
}

interface TaxOption {
  value: number;
  label: string;
}

const NewInvoicePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState(21);
  const [numericInputValues, setNumericInputValues] = useState<Record<string, string>>({});

  // Initialize from URL params and fetch taxes
  useEffect(() => {
    fetchClients();
    fetchSaleTaxes();
    
    // Pre-select client from URL params
    const urlClientId = searchParams.get('clientId');
    if (urlClientId) {
      setSelectedClientId(urlClientId);
    }
    
    // Pre-select project from URL params
    const urlProjectId = searchParams.get('projectId');
    if (urlProjectId) {
      setSelectedProjectId(urlProjectId);
    }
  }, [searchParams]);

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

  // Fetch projects when client changes
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

  const calculateLineValues = (line: Partial<InvoiceLine>): InvoiceLine => {
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
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      discount_percent: discountPercent,
      subtotal,
      tax_amount: taxAmount,
      total,
    } as InvoiceLine;
  };

  const addLine = () => {
    const newLine = calculateLineValues({
      tempId: crypto.randomUUID(),
      concept: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: defaultTaxRate,
      discount_percent: 0,
    });
    setLines([...lines, newLine]);
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: any) => {
    const updatedLines = [...lines];
    updatedLines[index] = calculateLineValues({
      ...updatedLines[index],
      [field]: value,
    });
    setLines(updatedLines);
  };

  const handleProductSelect = (index: number, item: { id: string; type: string; name: string; code: string; price: number; tax_rate: number; description?: string }) => {
    const updatedLines = [...lines];
    const currentQuantity = updatedLines[index].quantity;
    
    // For invoices, we use only the name (concept), NOT the description
    const lineData = {
      ...updatedLines[index],
      concept: item.name,
      unit_price: item.price,
      tax_rate: item.tax_rate || defaultTaxRate,
      quantity: currentQuantity,
    };
    
    updatedLines[index] = calculateLineValues(lineData);
    setLines(updatedLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const getTotals = () => {
    const subtotal = lines.reduce((acc, line) => acc + line.subtotal, 0);
    const total = lines.reduce((acc, line) => acc + line.total, 0);
    
    // Group taxes by rate
    const taxesByRate: Record<number, { rate: number; amount: number; label: string }> = {};
    lines.forEach((line) => {
      if (line.tax_amount !== 0) {
        if (!taxesByRate[line.tax_rate]) {
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

  // Helper: Parse input value (handles both . and , as decimal separator)
  const parseNumericInput = (value: string): number => {
    if (!value || value === '') return 0;
    
    let cleaned = value.trim();
    
    // Count dots and commas
    const dotCount = (cleaned.match(/\./g) || []).length;
    const commaCount = (cleaned.match(/,/g) || []).length;
    
    // If there's a comma, it's definitely the decimal separator (European format)
    if (commaCount > 0) {
      // Remove all dots (thousand separators) and replace comma with dot for parsing
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } else if (dotCount === 1) {
      // Single dot: check if it's likely a decimal (has digits after) or thousand separator
      const dotIndex = cleaned.indexOf('.');
      const afterDot = cleaned.substring(dotIndex + 1);
      
      // If there are 1-2 digits after the dot, treat it as decimal separator
      // Otherwise, treat it as thousand separator
      if (afterDot.length <= 2 && /^\d+$/.test(afterDot)) {
        // Decimal separator - keep as is for parsing
        cleaned = cleaned;
      } else {
        // Thousand separator - remove it
        cleaned = cleaned.replace(/\./g, '');
      }
    } else if (dotCount > 1) {
      // Multiple dots: all are thousand separators, remove them
      cleaned = cleaned.replace(/\./g, '');
    }
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Helper: Format number for display (with thousand separators and comma decimal)
  const formatNumericDisplay = (value: number | string): string => {
    if (value === '' || value === null || value === undefined) return '';
    const num = typeof value === 'string' ? parseNumericInput(value) : value;
    if (isNaN(num) || num === 0) return '';
    
    // Format with thousand separators and comma decimal
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Helper: Handle numeric input change
  const handleNumericInputChange = (value: string, field: 'quantity' | 'unit_price', index: number) => {
    const inputKey = `${index}-${field}`;
    
    // Store the raw input value for display
    setNumericInputValues(prev => ({ ...prev, [inputKey]: value }));
    
    // Allow empty string for clearing
    if (value === '' || value === null || value === undefined) {
      updateLine(index, field, 0);
      return;
    }
    
    // Parse the value (handles both . and , as decimal separator)
    const numericValue = parseNumericInput(value);
    updateLine(index, field, numericValue);
  };

  // Get display value for numeric input
  const getNumericDisplayValue = (value: number, field: 'quantity' | 'unit_price', index: number): string => {
    const inputKey = `${index}-${field}`;
    const storedValue = numericInputValues[inputKey];
    
    // If user is typing, show what they're typing
    if (storedValue !== undefined) {
      return storedValue;
    }
    
    // Otherwise format the numeric value
    if (value === 0) return '';
    return formatNumericDisplay(value);
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
    try {
      // Create invoice with auto-generated number
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      const { data: invoiceData, error: invoiceError } = await supabase.rpc(
        "create_invoice_with_number",
        {
          p_client_id: selectedClientId,
          p_project_id: selectedProjectId || null,
          p_project_name: selectedProject?.project_name || null,
          p_issue_date: issueDate,
          p_due_date: dueDate,
        }
      );

      if (invoiceError) throw invoiceError;
      if (!invoiceData || invoiceData.length === 0) throw new Error("No se pudo crear la factura");

      const invoiceId = invoiceData[0].invoice_id;

      // Add all lines
      for (const line of lines) {
        if (line.concept.trim()) {
          const { error: lineError } = await supabase.rpc("add_invoice_line", {
            p_invoice_id: invoiceId,
            p_concept: line.concept,
            p_description: null, // Invoices don't use descriptions
            p_quantity: line.quantity,
            p_unit_price: line.unit_price,
            p_tax_rate: line.tax_rate,
            p_discount_percent: line.discount_percent,
          });
          if (lineError) throw lineError;
        }
      }

      toast({
        title: "Factura creada",
        description: `Factura ${invoiceData[0].invoice_number} guardada correctamente`,
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

  const totals = getTotals();

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <NexoHeader title="Nueva Factura" userId={userId || ""} />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-[90%] max-w-[1800px] mx-auto px-3 md:px-4 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 mb-4 md:mb-8">
            <div>
              <h1 className="text-base md:text-2xl font-bold text-white">
                Nueva factura
              </h1>
              <p className="text-white/60 text-[10px] md:text-sm hidden md:block">
                El número se asignará automáticamente al guardar (F-YY-XXXXXX)
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
          <div className="bg-white/10 backdrop-blur-2xl rounded-2xl md:rounded-3xl border border-white/20 p-3 md:p-6 mb-3 md:mb-4 shadow-2xl shadow-black/30">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/20">
              <div className="p-1.5 rounded-xl bg-white/10 backdrop-blur-sm">
                <FileText className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
              </div>
              <span className="text-white/70 text-[10px] md:text-xs font-medium uppercase tracking-wide">Datos de la factura</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <div className="space-y-1 md:space-y-2 col-span-2 md:col-span-1">
                <Label className="text-white/70 text-[10px] md:text-sm">Cliente</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="bg-white/10 backdrop-blur-sm border-white/20 text-white h-8 md:h-10 text-xs md:text-sm rounded-xl transition-all hover:bg-white/15">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/10 backdrop-blur-2xl border-white/20 rounded-2xl shadow-2xl">
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
                  <SelectTrigger className="bg-white/10 backdrop-blur-sm border-white/20 text-white h-8 md:h-10 text-xs md:text-sm rounded-xl transition-all hover:bg-white/15">
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
                  <SelectContent className="bg-white/10 backdrop-blur-2xl border-white/20 rounded-2xl shadow-2xl">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="text-white text-xs md:text-sm">
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-white/70 text-[10px] md:text-sm">Fecha emisión</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="bg-white/10 backdrop-blur-sm border-white/20 text-white h-8 md:h-10 text-xs md:text-sm rounded-xl transition-all hover:bg-white/15"
                />
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-white/70 text-[10px] md:text-sm">Vencimiento</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-white/10 backdrop-blur-sm border-white/20 text-white h-8 md:h-10 text-xs md:text-sm rounded-xl transition-all hover:bg-white/15"
                />
              </div>
            </div>
          </div>

          {/* Mobile Lines - Vertical Cards */}
          <div className="md:hidden space-y-2 mb-3">
            {/* Lines Header */}
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-[10px] font-medium uppercase tracking-wide">Líneas de la factura</span>
              <span className="text-white/40 text-[9px]">Usa @nombre para buscar</span>
            </div>

            {lines.map((line, index) => (
              <div key={line.tempId || line.id} className="bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 p-3 space-y-2 shadow-xl shadow-black/20">
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
                      <SelectTrigger className="bg-white/10 backdrop-blur-sm border-white/20 text-white h-8 text-xs rounded-xl transition-all hover:bg-white/15">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white/10 backdrop-blur-2xl border-white/20 rounded-2xl shadow-2xl">
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
              className="w-full border-white/30 text-white hover:bg-white/15 backdrop-blur-sm rounded-2xl h-9 text-xs transition-all duration-200"
            >
              <Plus className="h-3 w-3 mr-1" />
              Añadir línea
            </Button>
          </div>

          {/* Desktop Lines table */}
          <div className="hidden md:block bg-gradient-to-br from-white/[0.08] to-white/[0.03] backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden mb-6 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
              <span className="text-white text-sm font-semibold uppercase tracking-wider">Líneas de la factura</span>
              <span className="text-white/50 text-xs font-medium">Escribe @nombre para buscar en el catálogo</span>
            </div>
            <div className="overflow-x-auto bg-white/[0.02]">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent bg-white/[0.03]">
                    <TableHead className="text-white/60 w-10 px-5 py-3 text-xs font-semibold uppercase tracking-wider"></TableHead>
                    <TableHead className="text-white/80 min-w-[300px] px-5 py-3 text-xs font-semibold uppercase tracking-wider">Concepto</TableHead>
                    <TableHead className="text-white/80 text-center w-28 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Cant.</TableHead>
                    <TableHead className="text-white/80 text-right w-32 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Precio</TableHead>
                    <TableHead className="text-white/80 w-36 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Impuestos</TableHead>
                    <TableHead className="text-white/80 text-right w-32 px-5 py-3 text-xs font-semibold uppercase tracking-wider">Total</TableHead>
                    <TableHead className="text-white/60 w-14 px-5 py-3"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow 
                      key={line.tempId || line.id} 
                      className="border-white/5 hover:bg-white/[0.04] transition-colors duration-150 group"
                    >
                      <TableCell className="text-white/20 group-hover:text-white/40 px-5 py-3.5 transition-colors">
                        <GripVertical className="h-4 w-4" />
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <ProductSearchInput
                          value={line.concept}
                          onChange={(value) => updateLine(index, "concept", value)}
                          onSelectItem={(item) => handleProductSelect(index, item)}
                          placeholder="Concepto o @buscar"
                          className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm font-medium pl-2 pr-0 py-2 hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                        />
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <div className="flex justify-center">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={getNumericDisplayValue(line.quantity, 'quantity', index)}
                            onChange={(e) => handleNumericInputChange(e.target.value, 'quantity', index)}
                            onBlur={() => {
                              const inputKey = `${index}-quantity`;
                              setNumericInputValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[inputKey];
                                return newValues;
                              });
                            }}
                            className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm text-center font-medium px-0 py-2 w-20 hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                            placeholder="0"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={getNumericDisplayValue(line.unit_price, 'unit_price', index)}
                          onChange={(e) => handleNumericInputChange(e.target.value, 'unit_price', index)}
                          onBlur={() => {
                            const inputKey = `${index}-unit_price`;
                            setNumericInputValues(prev => {
                              const newValues = { ...prev };
                              delete newValues[inputKey];
                              return newValues;
                            });
                          }}
                          className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm text-right font-medium px-0 py-2 hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                          placeholder="0,00"
                        />
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <div className="flex justify-center">
                          <Select
                            value={line.tax_rate.toString()}
                            onValueChange={(v) => updateLine(index, "tax_rate", parseFloat(v))}
                          >
                            <SelectTrigger className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm font-medium px-0 py-2 w-full hover:border-white/30 focus:border-orange-500/60 rounded-none shadow-none transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900/95 backdrop-blur-xl border-white/20 shadow-2xl">
                              {taxOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value.toString()} className="text-white hover:bg-white/10">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="text-white text-right font-semibold px-5 py-3.5">
                        {formatCurrency(line.total)}
                      </TableCell>
                      <TableCell className="px-5 py-3.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(index)}
                          className="text-white/30 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="p-5 border-t border-white/10 bg-gradient-to-r from-white/5 to-transparent">
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
            <div className="bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-2xl rounded-2xl md:rounded-3xl border border-white/15 p-4 md:p-6 w-full md:w-80 shadow-2xl shadow-black/40">
              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-between text-white/70 text-sm">
                  <span className="font-medium">Base imponible</span>
                  <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.taxes.map((tax) => (
                  <div key={tax.rate} className="flex justify-between text-white/70 text-sm">
                    <span className="font-medium">{tax.label}</span>
                    <span className="font-semibold">{formatCurrency(tax.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-white text-lg md:text-xl font-bold pt-3 md:pt-4 border-t border-white/20">
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
