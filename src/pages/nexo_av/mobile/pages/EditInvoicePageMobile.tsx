import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Lock, FileText, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FormLineEditorMobile from "../components/mobile/FormLineEditorMobile";
import MobileTotalsFooter from "../components/mobile/MobileTotalsFooter";
import { INVOICE_STATUSES, getStatusInfo } from "@/constants/invoiceStatuses";
import { InvoicePDFDocument } from "../components/InvoicePDFViewer";
import { PDFViewer } from "@react-pdf/renderer";

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  project_id?: string | null;
  status: string;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
}

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
  id: string;
  concept: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  line_order: number;
}

interface Company {
  id: string;
  name: string;
  legal_name: string;
  tax_id: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
}

const EditInvoicePageMobile = () => {
  const navigate = useNavigate();
  const { userId, invoiceId } = useParams<{ userId: string; invoiceId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  
  // Line editor state
  const [editingLine, setEditingLine] = useState<InvoiceLine | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Calcular totales
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const taxAmount = lines.reduce((sum, line) => sum + line.tax_amount, 0);
  const total = lines.reduce((sum, line) => sum + line.total, 0);

  const isDraft = invoice?.status === "DRAFT";
  const isLocked = invoice?.status === "PAID" || invoice?.status === "CANCELLED";
  const canEditLines = isDraft;

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceData();
    }
  }, [invoiceId]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);

      // Fetch invoice details
      const { data: invoiceData, error: invoiceError } = await supabase.rpc("get_invoice_details", {
        p_invoice_id: invoiceId,
      });
      if (invoiceError) throw invoiceError;
      if (!invoiceData || invoiceData.length === 0) {
        throw new Error("Factura no encontrada");
      }

      const invoiceInfo = invoiceData[0];
      setInvoice(invoiceInfo);
      setSelectedClientId(invoiceInfo.client_id);
      setSelectedProjectId(invoiceInfo.project_id || "");
      setIssueDate(invoiceInfo.issue_date?.split("T")[0] || "");
      setDueDate(invoiceInfo.due_date?.split("T")[0] || "");

      // Fetch invoice lines
      const { data: linesData, error: linesError } = await supabase.rpc("get_invoice_lines", {
        p_invoice_id: invoiceId,
      });
      if (linesError) throw linesError;
      setLines(linesData || []);

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase.rpc("list_clients", {
        p_search: null,
      });
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch projects for selected client
      if (invoiceInfo.client_id) {
        const { data: projectsData, error: projectsError } = await supabase.rpc("list_projects", {
          p_search: null,
        });
        if (!projectsError && projectsData) {
          const clientProjects = projectsData.filter(
            (p: any) => p.client_id === invoiceInfo.client_id
          );
          setProjects(clientProjects);
        }
      }

      // Fetch company info for PDF
      const { data: companyData, error: companyError } = await supabase
        .from("internal.company_settings")
        .select("*")
        .limit(1)
        .single();
      if (!companyError && companyData) {
        setCompany(companyData);
      }

      // Fetch client data for PDF
      const { data: clientFullData, error: clientFullError } = await supabase
        .from("crm.clients")
        .select("*")
        .eq("id", invoiceInfo.client_id)
        .single();
      if (!clientFullError && clientFullData) {
        setClientData(clientFullData);
      }

      // Fetch project data for PDF if exists
      if (invoiceInfo.project_id) {
        const { data: projectFullData, error: projectFullError } = await supabase
          .from("crm.projects")
          .select("*")
          .eq("id", invoiceInfo.project_id)
          .single();
        if (!projectFullError && projectFullData) {
          setProjectData(projectFullData);
        }
      }

      // Fetch preferences for PDF
      const { data: preferencesData, error: preferencesError } = await supabase
        .from("internal.user_preferences")
        .select("*")
        .eq("user_id", userId)
        .limit(1)
        .single();
      if (!preferencesError && preferencesData) {
        setPreferences(preferencesData);
      }
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar la factura",
        variant: "destructive",
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = async (clientId: string) => {
    if (!canEditLines) return;
    
    setSelectedClientId(clientId);
    setSelectedProjectId("");
    
    // Fetch projects for selected client
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

  const handleAddLine = () => {
    if (!canEditLines) {
      toast({
        title: "Factura bloqueada",
        description: "No se pueden agregar líneas en este estado",
        variant: "destructive",
      });
      return;
    }
    setEditingLine(null);
    setEditorOpen(true);
  };

  const handleEditLine = (line: InvoiceLine) => {
    if (!canEditLines) {
      toast({
        title: "Factura bloqueada",
        description: "No se pueden editar líneas en este estado",
        variant: "destructive",
      });
      return;
    }
    setEditingLine(line);
    setEditorOpen(true);
  };

  const handleSaveLine = async (line: InvoiceLine) => {
    try {
      if (editingLine && editingLine.id) {
        // Update existing line
        const { error } = await supabase.rpc("update_invoice_line", {
          p_line_id: editingLine.id,
          p_concept: line.concept,
          p_description: line.description || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_discount_percent: line.discount_percent,
        });
        if (error) throw error;
        
        setLines(prev =>
          prev.map(l => (l.id === editingLine.id ? { ...line, id: editingLine.id, line_order: l.line_order } : l))
        );
      } else {
        // Add new line
        const { error } = await supabase.rpc("add_invoice_line", {
          p_invoice_id: invoiceId!,
          p_concept: line.concept,
          p_description: line.description || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_discount_percent: line.discount_percent,
          p_line_order: lines.length,
        });
        if (error) throw error;
        
        // Reload lines
        await fetchInvoiceData();
      }

      toast({
        title: "Línea guardada",
        description: "La línea se ha guardado correctamente",
      });
    } catch (error: any) {
      console.error("Error saving line:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la línea",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLine = async (lineToDelete: InvoiceLine) => {
    if (!canEditLines) {
      toast({
        title: "Factura bloqueada",
        description: "No se pueden eliminar líneas en este estado",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc("delete_invoice_line", {
        p_line_id: lineToDelete.id,
      });
      if (error) throw error;

      setLines(prev => prev.filter(l => l.id !== lineToDelete.id));
      toast({
        title: "Línea eliminada",
        description: "La línea se ha eliminado de la factura",
      });
    } catch (error: any) {
      console.error("Error deleting line:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la línea",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (isLocked) {
      toast({
        title: "Factura bloqueada",
        description: "No se pueden editar facturas en este estado",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.rpc("update_invoice", {
        p_invoice_id: invoiceId!,
        p_client_id: selectedClientId,
        p_project_id: selectedProjectId || null,
        p_issue_date: issueDate,
        p_due_date: dueDate || null,
      });

      if (error) throw error;

      toast({
        title: "Factura actualizada",
        description: "Los cambios se han guardado correctamente",
      });

      navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la factura",
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

  if (!invoice) {
    return null;
  }

  const statusInfo = getStatusInfo(invoice.status);

  return (
    <div className="min-h-screen bg-background pb-[240px]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">Editar Factura</h1>
            <p className="text-sm text-muted-foreground">{invoice.invoice_number}</p>
          </div>
          <Badge
            style={{
              backgroundColor: statusInfo.bgColor,
              color: statusInfo.textColor,
            }}
          >
            {statusInfo.label}
          </Badge>
        </div>
        {isLocked && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
            <Lock className="h-4 w-4" />
            <span>Factura bloqueada - Solo lectura</span>
          </div>
        )}
        {invoice.paid_amount > 0 && invoice.paid_amount < invoice.total && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded mt-2">
            <DollarSign className="h-4 w-4" />
            <span>Pagado: {invoice.paid_amount.toFixed(2)} € de {invoice.total.toFixed(2)} €</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full sticky top-[97px] z-10 bg-background border-b rounded-none h-12">
          <TabsTrigger value="info" className="flex-1">Información</TabsTrigger>
          <TabsTrigger value="lines" className="flex-1">Líneas</TabsTrigger>
          <TabsTrigger value="pdf" className="flex-1">PDF</TabsTrigger>
        </TabsList>

        {/* Tab: Información */}
        <TabsContent value="info" className="px-4 py-4 space-y-6 mt-0">
          <div className="space-y-2">
            <Label htmlFor="client">
              Cliente <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedClientId}
              onValueChange={handleClientChange}
              disabled={!canEditLines}
            >
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

          {projects.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="project">Proyecto (opcional)</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={!canEditLines}
              >
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
                disabled={!canEditLines}
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
                disabled={!canEditLines}
              />
            </div>
          </div>
        </TabsContent>

        {/* Tab: Líneas */}
        <TabsContent value="lines" className="px-4 py-4 space-y-3 mt-0">
          <div className="flex items-center justify-between">
            <Label className="text-base">Líneas de la factura</Label>
            <Button
              onClick={handleAddLine}
              size="sm"
              className="h-9"
              disabled={!canEditLines}
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir
            </Button>
          </div>

          {lines.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No hay líneas en esta factura</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((line) => (
                <div
                  key={line.id}
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
                    {canEditLines && (
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
                    )}
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
        </TabsContent>

        {/* Tab: PDF */}
        <TabsContent value="pdf" className="px-0 py-0 mt-0 h-[calc(100vh-200px)]">
          {company && clientData && lines.length > 0 ? (
            <PDFViewer width="100%" height="100%" showToolbar={false}>
              <InvoicePDFDocument
                invoice={{
                  ...invoice,
                  client_name: clientData.company_name,
                  project_name: projectData?.name || null,
                }}
                invoiceLines={lines}
                company={company}
                client={clientData}
                project={projectData}
                preferences={preferences}
              />
            </PDFViewer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  {lines.length === 0
                    ? "Agrega líneas para ver la vista previa"
                    : "Cargando vista previa..."}
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Line Editor */}
      <FormLineEditorMobile
        line={editingLine}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSaveLine}
        type="invoice"
      />

      {/* Totals Footer */}
      {!isLocked && (
        <MobileTotalsFooter
          subtotal={subtotal}
          taxAmount={taxAmount}
          total={total}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
          saveLabel="Guardar Cambios"
          disabled={!selectedClientId || !issueDate}
        />
      )}
    </div>
  );
};

export default EditInvoicePageMobile;
