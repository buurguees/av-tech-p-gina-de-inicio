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
import { ArrowLeft, Plus, Trash2, FileCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FormLineEditorMobile from "../components/mobile/FormLineEditorMobile";
import MobileTotalsFooter from "../components/mobile/MobileTotalsFooter";

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
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  project_id?: string | null;
}

const NewInvoicePageMobile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [approvedQuotes, setApprovedQuotes] = useState<Quote[]>([]);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  
  // Line editor state
  const [editingLine, setEditingLine] = useState<InvoiceLine | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Calcular totales
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const taxAmount = lines.reduce((sum, line) => sum + line.tax_amount, 0);
  const total = lines.reduce((sum, line) => sum + line.total, 0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase.rpc("list_clients", {
        p_search: null,
      });
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Get clientId or quoteId from URL if provided
      const clientIdFromUrl = searchParams.get("clientId");
      const quoteIdFromUrl = searchParams.get("quoteId");
      
      if (quoteIdFromUrl) {
        // Create from quote - load quote data
        await loadQuoteData(quoteIdFromUrl);
      } else if (clientIdFromUrl) {
        setSelectedClientId(clientIdFromUrl);
        await fetchProjectsForClient(clientIdFromUrl);
        await fetchApprovedQuotes(clientIdFromUrl);
      }

      // Set default dates
      const today = new Date();
      setIssueDate(today.toISOString().split("T")[0]);
      
      const dueDateValue = new Date(today);
      dueDateValue.setDate(dueDateValue.getDate() + 30);
      setDueDate(dueDateValue.toISOString().split("T")[0]);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos iniciales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadQuoteData = async (quoteId: string) => {
    try {
      // Get quote details
      const { data: quoteData, error: quoteError } = await supabase.rpc("get_quote_details", {
        p_quote_id: quoteId,
      });
      if (quoteError) throw quoteError;
      if (!quoteData || quoteData.length === 0) return;

      const quote = quoteData[0];
      setSelectedClientId(quote.client_id);
      setSelectedProjectId(quote.project_id || "");
      setSelectedQuoteId(quoteId);

      // Get quote lines
      const { data: linesData, error: linesError } = await supabase.rpc("get_quote_lines", {
        p_quote_id: quoteId,
      });
      if (linesError) throw linesError;
      
      if (linesData) {
        const invoiceLines: InvoiceLine[] = linesData.map((line: any, index: number) => ({
          tempId: `temp-${index}`,
          concept: line.concept,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          discount_percent: line.discount_percent,
          subtotal: line.subtotal,
          tax_amount: line.tax_amount,
          total: line.total,
        }));
        setLines(invoiceLines);
      }

      await fetchProjectsForClient(quote.client_id);
      await fetchApprovedQuotes(quote.client_id);
    } catch (error) {
      console.error("Error loading quote:", error);
    }
  };

  const fetchProjectsForClient = async (clientId: string) => {
    try {
      const { data, error } = await supabase.rpc("list_projects", { p_search: null });
      if (!error && data) {
        const clientProjects = data.filter((p: any) => p.client_id === clientId);
        setProjects(clientProjects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchApprovedQuotes = async (clientId: string) => {
    try {
      const { data, error } = await supabase.rpc("list_quotes", { p_search: null });
      if (!error && data) {
        const clientApprovedQuotes = data.filter(
          (q: any) => q.client_id === clientId && q.status === "APPROVED"
        );
        setApprovedQuotes(clientApprovedQuotes);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
    }
  };

  const handleClientChange = async (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId("");
    setSelectedQuoteId("");
    setLines([]);
    
    await fetchProjectsForClient(clientId);
    await fetchApprovedQuotes(clientId);
  };

  const handleQuoteChange = async (quoteId: string) => {
    if (!quoteId || quoteId === "none") {
      setSelectedQuoteId("");
      setLines([]);
      return;
    }
    
    await loadQuoteData(quoteId);
  };

  const handleAddLine = () => {
    setEditingLine(null);
    setEditorOpen(true);
  };

  const handleEditLine = (line: InvoiceLine) => {
    setEditingLine(line);
    setEditorOpen(true);
  };

  const handleSaveLine = (line: InvoiceLine) => {
    if (editingLine) {
      // Update existing line
      setLines(prev =>
        prev.map(l => (l.tempId === editingLine.tempId ? { ...line, tempId: editingLine.tempId } : l))
      );
    } else {
      // Add new line
      setLines(prev => [...prev, { ...line, tempId: `temp-${Date.now()}` }]);
    }
  };

  const handleDeleteLine = (lineToDelete: InvoiceLine) => {
    setLines(prev => prev.filter(l => l.tempId !== lineToDelete.tempId));
    toast({
      title: "Línea eliminada",
      description: "La línea se ha eliminado de la factura",
    });
  };

  const handleSave = async () => {
    // Validation
    if (!selectedClientId) {
      toast({
        title: "Cliente requerido",
        description: "Debes seleccionar un cliente",
        variant: "destructive",
      });
      return;
    }

    if (!issueDate) {
      toast({
        title: "Fecha de emisión requerida",
        description: "Debes indicar la fecha de emisión",
        variant: "destructive",
      });
      return;
    }

    if (lines.length === 0) {
      toast({
        title: "Sin líneas",
        description: "Debes agregar al menos una línea",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase.rpc("create_invoice", {
        p_client_id: selectedClientId,
        p_project_id: selectedProjectId || null,
        p_quote_id: selectedQuoteId || null,
        p_issue_date: issueDate,
        p_due_date: dueDate || null,
        p_notes: null,
      });

      if (invoiceError) throw invoiceError;

      const invoiceId = Array.isArray(invoiceData) ? invoiceData[0].id : invoiceData.id;

      // Create invoice lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const { error: lineError } = await supabase.rpc("add_invoice_line", {
          p_invoice_id: invoiceId,
          p_concept: line.concept,
          p_description: line.description || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_discount_percent: line.discount_percent,
          p_line_order: i,
        });

        if (lineError) throw lineError;
      }

      toast({
        title: "Factura creada",
        description: `Se ha creado la factura correctamente`,
      });

      navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la factura",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-[240px]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-semibold text-lg">Nueva Factura</h1>
          <p className="text-sm text-muted-foreground">Completa los campos</p>
        </div>
      </div>

      {/* Form Content */}
      <div className="px-4 py-4 space-y-6">
        {/* Client Selection */}
        <div className="space-y-2">
          <Label htmlFor="client">
            Cliente <span className="text-destructive">*</span>
          </Label>
          <Select value={selectedClientId} onValueChange={handleClientChange}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Create from Approved Quote */}
        {approvedQuotes.length > 0 && (
          <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
              <FileCheck className="h-4 w-4" />
              Crear desde presupuesto aprobado
            </div>
            <Select value={selectedQuoteId || "none"} onValueChange={handleQuoteChange}>
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Seleccionar presupuesto..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Factura vacía</SelectItem>
                {approvedQuotes.map((quote) => (
                  <SelectItem key={quote.id} value={quote.id}>
                    {quote.quote_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Project Selection */}
        {projects.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="project">Proyecto (opcional)</Label>
            <Select value={selectedProjectId || "none"} onValueChange={(value) => setSelectedProjectId(value === "none" ? "" : value)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Sin proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin proyecto</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_number} - {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Dates - Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="issue_date">
              Fecha emisión <span className="text-destructive">*</span>
            </Label>
            <Input
              id="issue_date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date">Fecha vencimiento</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-12"
            />
          </div>
        </div>

        {/* Lines Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Líneas de la factura</Label>
            <Button
              onClick={handleAddLine}
              size="sm"
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir
            </Button>
          </div>

          {lines.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No hay líneas agregadas</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pulsa "Añadir" o carga desde un presupuesto
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((line) => (
                <div
                  key={line.tempId}
                  className="border rounded-lg p-3 bg-card"
                  onClick={() => handleEditLine(line)}
                  style={{ touchAction: 'manipulation' }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium truncate">{line.concept}</p>
                      {line.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {line.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLine(line);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {line.quantity} × {line.unit_price.toFixed(2)} €
                    </span>
                    <span className="font-semibold">
                      {line.total.toFixed(2)} €
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Line Editor */}
      <FormLineEditorMobile
        line={editingLine}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSaveLine}
        type="invoice"
      />

      {/* Totals Footer */}
      <MobileTotalsFooter
        subtotal={subtotal}
        taxAmount={taxAmount}
        total={total}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        saveLabel="Crear Factura"
        disabled={!selectedClientId || !issueDate || lines.length === 0}
      />
    </div>
  );
};

export default NewInvoicePageMobile;
