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
import { ArrowLeft, Plus, Trash2, Save, Loader2, GripVertical } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import NexoHeader from "./components/NexoHeader";

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

const TAX_OPTIONS = [
  { value: 21, label: "IVA 21%" },
  { value: 10, label: "IVA 10%" },
  { value: 4, label: "IVA 4%" },
  { value: 0, label: "Sin IVA" },
];

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

  // Initialize from URL params
  useEffect(() => {
    fetchClients();
    
    // Pre-select client from URL params
    const urlClientId = searchParams.get('clientId') || clientId;
    if (urlClientId) {
      setSelectedClientId(urlClientId);
    }
  }, [clientId, searchParams]);

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
      tax_rate: 21,
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

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const getTotals = () => {
    return lines.reduce(
      (acc, line) => ({
        subtotal: acc.subtotal + line.subtotal,
        tax: acc.tax + line.tax_amount,
        total: acc.total + line.total,
      }),
      { subtotal: 0, tax: 0, total: 0 }
    );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
      <NexoHeader title="Nuevo Presupuesto" userId={userId || ""} />

      <main className="container mx-auto px-4 pt-24 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Top bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/nexo-av/${userId}/quotes`)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Nuevo presupuesto</h1>
                <p className="text-white/60 text-sm">El número se asignará automáticamente al guardar</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar como borrador
              </Button>
              <Button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="bg-avtech-orange hover:bg-avtech-orange/90 text-white"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar
              </Button>
            </div>
          </div>

          {/* Quote header info */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-white/70">Contacto</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar contacto" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="text-white">
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Número de documento</Label>
                <Input
                  value={quoteNumber}
                  disabled
                  className="bg-white/5 border-white/10 text-white/60"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Fecha</Label>
                <Input
                  type="date"
                  value={new Date().toISOString().split("T")[0]}
                  disabled
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Vencimiento</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="mt-4">
              <Label className="text-white/70">Proyecto del cliente</Label>
              <Select 
                value={selectedProjectId} 
                onValueChange={setSelectedProjectId}
                disabled={!selectedClientId || loadingProjects}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                  <SelectValue placeholder={
                    !selectedClientId 
                      ? "Selecciona un cliente primero" 
                      : loadingProjects 
                        ? "Cargando proyectos..." 
                        : projects.length === 0 
                          ? "No hay proyectos para este cliente"
                          : "Seleccionar proyecto"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-white">
                      {project.project_number} - {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClientId && projects.length === 0 && !loadingProjects && (
                <p className="text-white/40 text-xs mt-2">
                  Este cliente no tiene proyectos. Crea uno primero desde la sección de Proyectos.
                </p>
              )}
            </div>
          </div>

          {/* Lines table */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden mb-6">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70 w-8"></TableHead>
                  <TableHead className="text-white/70">Concepto</TableHead>
                  <TableHead className="text-white/70">Descripción</TableHead>
                  <TableHead className="text-white/70 text-center w-24">Cantidad</TableHead>
                  <TableHead className="text-white/70 text-right w-28">Precio</TableHead>
                  <TableHead className="text-white/70 w-32">Impuestos</TableHead>
                  <TableHead className="text-white/70 text-right w-24">Total</TableHead>
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
                      <Input
                        value={line.concept}
                        onChange={(e) => updateLine(index, "concept", e.target.value)}
                        placeholder="Escribe el concepto"
                        className="bg-transparent border-0 text-white placeholder:text-white/30 p-0 h-auto focus-visible:ring-0"
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
                        <SelectTrigger className="bg-white/10 border-white/10 text-white h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          {TAX_OPTIONS.map((opt) => (
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
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 w-full md:w-80">
              <div className="space-y-3">
                <div className="flex justify-between text-white/70">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>IVA</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
                <div className="flex justify-between text-white text-lg font-bold pt-3 border-t border-white/10">
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
