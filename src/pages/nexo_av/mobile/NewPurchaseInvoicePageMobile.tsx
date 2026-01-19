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
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FormLineEditorMobile from "../components/mobile/FormLineEditorMobile";
import MobileTotalsFooter from "../components/mobile/MobileTotalsFooter";

interface Supplier {
  id: string;
  company_name: string;
}

interface Technician {
  id: string;
  company_name: string;
}

interface Client {
  id: string;
  company_name: string;
}

interface Project {
  id: string;
  project_name: string;
  client_id: string;
}

interface PurchaseInvoiceLine {
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

const NewPurchaseInvoicePageMobile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [entityType, setEntityType] = useState<"SUPPLIER" | "TECHNICIAN">("SUPPLIER");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [lines, setLines] = useState<PurchaseInvoiceLine[]>([]);
  const [documentType, setDocumentType] = useState<"INVOICE" | "EXPENSE">(
    searchParams.get("type") === "EXPENSE" ? "EXPENSE" : "INVOICE"
  );

  // Line editor state
  const [editingLine, setEditingLine] = useState<PurchaseInvoiceLine | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Calcular totales
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const taxAmount = lines.reduce((sum, line) => sum + line.tax_amount, 0);
  const total = lines.reduce((sum, line) => sum + line.total, 0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchProjectsForClient(selectedClientId);
    } else {
      setProjects([]);
      setSelectedProjectId("");
    }
  }, [selectedClientId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase.rpc("list_suppliers", {
        p_search: null,
        p_status: "ACTIVE",
      });
      if (suppliersError) throw suppliersError;
      setSuppliers((suppliersData || []).map((s: any) => ({
        id: s.id,
        company_name: s.company_name,
      })));

      // Fetch technicians
      const { data: techniciansData, error: techniciansError } = await supabase.rpc("list_technicians", {
        p_search: null,
        p_status: "ACTIVE",
      });
      if (techniciansError) throw techniciansError;
      setTechnicians((techniciansData || []).map((t: any) => ({
        id: t.id,
        company_name: t.company_name,
      })));

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase.rpc("list_clients", {});
      if (clientsError) throw clientsError;
      setClients((clientsData || []).map((c: any) => ({
        id: c.id,
        company_name: c.company_name,
      })));

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

  const fetchProjectsForClient = async (clientId: string) => {
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase.rpc("list_projects", { p_search: null });
      if (!error && data) {
        const clientProjects = data.filter((p: any) => p.client_id === clientId);
        setProjects(clientProjects.map((p: any) => ({
          id: p.id,
          project_name: p.project_name,
          client_id: p.client_id,
        })));
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleAddLine = () => {
    setEditingLine(null);
    setEditorOpen(true);
  };

  const handleEditLine = (line: PurchaseInvoiceLine) => {
    setEditingLine(line);
    setEditorOpen(true);
  };

  const handleSaveLine = (line: PurchaseInvoiceLine) => {
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

  const handleDeleteLine = (lineToDelete: PurchaseInvoiceLine) => {
    setLines(prev => prev.filter(l => l.tempId !== lineToDelete.tempId));
    toast({
      title: "Línea eliminada",
      description: "La línea se ha eliminado de la factura",
    });
  };

  const handleSave = async () => {
    // Validation
    if (!invoiceNumber.trim()) {
      toast({
        title: "Número de factura requerido",
        description: "Debes indicar el número de factura",
        variant: "destructive",
      });
      return;
    }

    if (entityType === "SUPPLIER" && !selectedSupplierId) {
      toast({
        title: "Proveedor requerido",
        description: "Debes seleccionar un proveedor",
        variant: "destructive",
      });
      return;
    }

    if (entityType === "TECHNICIAN" && !selectedTechnicianId) {
      toast({
        title: "Técnico requerido",
        description: "Debes seleccionar un técnico",
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

      // Create purchase invoice
      const { data: invoiceData, error: invoiceError } = await supabase.rpc("create_purchase_invoice", {
        p_invoice_number: invoiceNumber.trim(),
        p_document_type: documentType,
        p_issue_date: issueDate,
        p_due_date: dueDate || null,
        p_supplier_id: entityType === "SUPPLIER" ? selectedSupplierId : null,
        p_technician_id: entityType === "TECHNICIAN" ? selectedTechnicianId : null,
        p_project_id: selectedProjectId || null,
        p_notes: null,
      });

      if (invoiceError) throw invoiceError;
      if (!invoiceData || invoiceData.length === 0) throw new Error("No se pudo crear la factura");

      const invoiceId = invoiceData[0].purchase_invoice_id;

      // Create invoice lines
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const { error: lineError } = await supabase.rpc("add_purchase_invoice_line", {
          p_invoice_id: invoiceId,
          p_concept: line.concept.trim(),
          p_description: line.description?.trim() || null,
          p_quantity: line.quantity,
          p_unit_price: line.unit_price,
          p_tax_rate: line.tax_rate,
          p_discount_percent: line.discount_percent,
          p_line_order: i + 1,
        } as any);

        if (lineError) throw lineError;
      }

      toast({
        title: "Factura de compra creada",
        description: `Se ha creado la factura correctamente`,
      });

      navigate(`/nexo-av/${userId}/purchase-invoices/${invoiceId}`);
    } catch (error: any) {
      console.error("Error creating purchase invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la factura de compra",
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
          <h1 className="font-semibold text-lg">
            Nueva {documentType === "EXPENSE" ? "Gasto" : "Factura de Compra"}
          </h1>
          <p className="text-sm text-muted-foreground">Completa los campos</p>
        </div>
      </div>

      {/* Form Content */}
      <div className="px-4 py-4 space-y-6">
        {/* Invoice Number */}
        <div className="space-y-2">
          <Label htmlFor="invoice_number">
            Número de Factura <span className="text-destructive">*</span>
          </Label>
          <Input
            id="invoice_number"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Ej: INV-2024-001"
            className="h-12"
          />
        </div>

        {/* Entity Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="entity_type">Tipo de Entidad</Label>
          <Select value={entityType} onValueChange={(value: "SUPPLIER" | "TECHNICIAN") => setEntityType(value)}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SUPPLIER">Proveedor</SelectItem>
              <SelectItem value="TECHNICIAN">Técnico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Supplier or Technician Selection */}
        {entityType === "SUPPLIER" ? (
          <div className="space-y-2">
            <Label htmlFor="supplier">
              Proveedor <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="technician">
              Técnico <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecciona un técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((technician) => (
                  <SelectItem key={technician.id} value={technician.id}>
                    {technician.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Client Selection (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="client">Cliente (Opcional)</Label>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Sin cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin cliente</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Project Selection (Optional) */}
        {selectedClientId && (
          <div className="space-y-2">
            <Label htmlFor="project">Proyecto (Opcional)</Label>
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={loadingProjects}
            >
              <SelectTrigger className="h-12">
                <SelectValue
                  placeholder={
                    loadingProjects
                      ? "Cargando..."
                      : projects.length === 0
                      ? "Sin proyectos"
                      : "Selecciona un proyecto"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin proyecto</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
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
                Pulsa "Añadir" para agregar una línea
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
        saveLabel={`Crear ${documentType === "EXPENSE" ? "Gasto" : "Factura"}`}
        disabled={
          !invoiceNumber.trim() ||
          (entityType === "SUPPLIER" && !selectedSupplierId) ||
          (entityType === "TECHNICIAN" && !selectedTechnicianId) ||
          !issueDate ||
          lines.length === 0
        }
      />
    </div>
  );
};

export default NewPurchaseInvoicePageMobile;
