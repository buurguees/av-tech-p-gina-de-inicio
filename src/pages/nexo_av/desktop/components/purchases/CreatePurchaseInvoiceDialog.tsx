import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus } from "lucide-react";
import PurchaseInvoiceLinesEditor, { PurchaseInvoiceLine } from "./PurchaseInvoiceLinesEditor";
import SupplierSearchInput from "../suppliers/SupplierSearchInput";
import ProjectSearchInput from "../projects/ProjectSearchInput";
import ProductSearchInput from "../common/ProductSearchInput";

interface Supplier {
  id: string;
  company_name: string;
  tax_id: string | null;
}

interface Technician {
  id: string;
  company_name: string;
  tax_id: string | null;
  withholding_tax_rate: number | null;
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

interface CreatePurchaseInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedDocumentId?: string; // ID de documento pendiente a completar
  preselectedSupplierId?: string;
  preselectedTechnicianId?: string;
  preselectedClientId?: string;
  preselectedProjectId?: string;
  documentType?: "INVOICE" | "EXPENSE";
}

export default function CreatePurchaseInvoiceDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedDocumentId,
  preselectedSupplierId,
  preselectedTechnicianId,
  preselectedClientId,
  preselectedProjectId,
  documentType = "INVOICE",
}: CreatePurchaseInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Data lists
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [entityType, setEntityType] = useState<"SUPPLIER" | "TECHNICIAN">(
    preselectedSupplierId ? "SUPPLIER" : preselectedTechnicianId ? "TECHNICIAN" : "SUPPLIER"
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(preselectedSupplierId || "");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>(preselectedTechnicianId || "");
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || "");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(preselectedProjectId || "");
  const [lines, setLines] = useState<PurchaseInvoiceLine[]>([]);
  const [notes, setNotes] = useState("");
  const [supplierSearchValue, setSupplierSearchValue] = useState("");
  const [projectSearchValue, setProjectSearchValue] = useState("");

  // Fetch initial data
  useEffect(() => {
    if (open) {
      fetchInitialData();
    }
  }, [open]);

  // Fetch projects when client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchClientProjects(selectedClientId);
    } else {
      setProjects([]);
      setSelectedProjectId("");
    }
  }, [selectedClientId]);

  // Load preselected document data if provided
  useEffect(() => {
    if (open && preselectedDocumentId) {
      loadPendingDocument();
    }
  }, [open, preselectedDocumentId]);

  const fetchInitialData = async () => {
    try {
      setLoadingData(true);

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase.rpc("list_suppliers", {
        p_search: null,
        p_status: "ACTIVE",
      });
      if (suppliersError) throw suppliersError;
      setSuppliers((suppliersData || []).map((s: any) => ({
        id: s.id,
        company_name: s.company_name,
        tax_id: s.tax_id,
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
        tax_id: t.tax_id,
        withholding_tax_rate: t.withholding_tax_rate,
      })));

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase.rpc("list_clients", {});
      if (clientsError) throw clientsError;
      setClients((clientsData || []).map((c: any) => ({
        id: c.id,
        company_name: c.company_name,
      })));

      // Fetch projects if client is preselected
      if (preselectedClientId) {
        await fetchClientProjects(preselectedClientId);
      }
    } catch (error: any) {
      console.error("Error fetching initial data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoadingData(false);
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
        project_name: p.project_name,
        client_id: p.client_id,
      })));
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadPendingDocument = async () => {
    if (!preselectedDocumentId) return;
    try {
      const { data, error } = await supabase.rpc("get_purchase_invoice", {
        p_invoice_id: preselectedDocumentId,
      });
      if (error) throw error;
      if (!data || data.length === 0) return;

      const doc = data[0];
      
      // Set basic info
      setInvoiceNumber(doc.invoice_number || "");
      setIssueDate(doc.issue_date || new Date().toISOString().split("T")[0]);
      setDueDate(doc.due_date || "");
      setNotes(doc.notes || "");
      
      // Set entity type and ID
      if (doc.supplier_id) {
        setEntityType("SUPPLIER");
        setSelectedSupplierId(doc.supplier_id);
        setSupplierSearchValue(doc.supplier_name || "");
      } else if (doc.technician_id) {
        setEntityType("TECHNICIAN");
        setSelectedTechnicianId(doc.technician_id);
        setSupplierSearchValue(doc.technician_name || "");
      }
      
      // Set client and project
      if (doc.client_id) {
        setSelectedClientId(doc.client_id);
        await fetchClientProjects(doc.client_id);
        if (doc.project_id) {
          setSelectedProjectId(doc.project_id);
          setProjectSearchValue(doc.project_name || "");
        }
      }

      // Load lines
      const { data: linesData, error: linesError } = await supabase.rpc("get_purchase_invoice_lines", {
        p_invoice_id: preselectedDocumentId,
      });
      if (!linesError && linesData) {
        setLines(linesData.map((l: any) => ({
          id: l.id,
          concept: l.concept,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate,
          discount_percent: l.discount_percent || 0,
          withholding_tax_rate: l.withholding_tax_rate || 0,
          subtotal: l.subtotal,
          tax_amount: l.tax_amount,
          withholding_amount: l.withholding_amount || 0,
          total: l.total,
        })));
      }
    } catch (error: any) {
      console.error("Error loading pending document:", error);
      toast.error("Error al cargar el documento pendiente");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceNumber.trim()) {
      toast.error("El número de factura es obligatorio");
      return;
    }

    if (entityType === "SUPPLIER" && !selectedSupplierId) {
      toast.error("Selecciona un proveedor");
      return;
    }

    if (entityType === "TECHNICIAN" && !selectedTechnicianId) {
      toast.error("Selecciona un técnico");
      return;
    }

    if (lines.length === 0) {
      toast.error("Añade al menos una línea a la factura");
      return;
    }

    setLoading(true);
    try {
      // Calculate totals
      const taxBase = lines.reduce((sum, line) => sum + line.subtotal, 0);
      const taxAmount = lines.reduce((sum, line) => sum + line.tax_amount, 0);
      const total = lines.reduce((sum, line) => sum + line.total, 0);

      // Get withholding tax rate if technician
      let withholdingTaxRate: number | null = null;
      if (entityType === "TECHNICIAN" && selectedTechnicianId) {
        const technician = technicians.find(t => t.id === selectedTechnicianId);
        withholdingTaxRate = technician?.withholding_tax_rate || null;
      }

      // Calculate withholding amount (IRPF retention)
      const withholdingAmount = withholdingTaxRate && taxBase > 0
        ? (taxBase * withholdingTaxRate) / 100
        : 0;

      // Create or update purchase invoice
      if (preselectedDocumentId) {
        // Update existing document
        const { error: updateError } = await supabase.rpc("update_purchase_invoice", {
          p_invoice_id: preselectedDocumentId,
          p_invoice_number: invoiceNumber.trim(),
          p_issue_date: issueDate,
          p_due_date: dueDate || null,
          p_supplier_id: entityType === "SUPPLIER" ? selectedSupplierId : null,
          p_technician_id: entityType === "TECHNICIAN" ? selectedTechnicianId : null,
          p_client_id: selectedClientId || null,
          p_project_id: selectedProjectId || null,
          p_withholding_amount: withholdingAmount,
          p_status: "REGISTERED",
          p_notes: notes.trim() || null,
        });

        if (updateError) throw updateError;

        // Update lines
        const { data: existingLines } = await supabase.rpc("get_purchase_invoice_lines", {
          p_invoice_id: preselectedDocumentId,
        });

        // Delete existing lines
        for (const existingLine of existingLines || []) {
          await supabase.rpc("delete_purchase_invoice_line", {
            p_line_id: existingLine.id,
          } as any);
        }

        // Add new lines
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const { error: lineError } = await supabase.rpc("add_purchase_invoice_line", {
            p_invoice_id: preselectedDocumentId,
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

        toast.success("Factura de compra actualizada correctamente");
      } else {
        // Create new purchase invoice
        const { data: invoiceData, error: createError } = await supabase.rpc("create_purchase_invoice", {
          p_invoice_number: invoiceNumber.trim(),
          p_document_type: documentType,
          p_issue_date: issueDate,
          p_due_date: dueDate || null,
          p_supplier_id: entityType === "SUPPLIER" ? selectedSupplierId : null,
          p_technician_id: entityType === "TECHNICIAN" ? selectedTechnicianId : null,
          p_client_id: selectedClientId || null,
          p_project_id: selectedProjectId || null,
          p_withholding_amount: withholdingAmount,
          p_notes: notes.trim() || null,
          p_site_id: null,
        });

        if (createError) throw createError;
        if (!invoiceData) throw new Error("No se pudo crear la factura");

        // La RPC devuelve un UUID directamente o un array con un objeto
        const invoiceId = Array.isArray(invoiceData) 
          ? (invoiceData[0]?.purchase_invoice_id || invoiceData[0] || invoiceData)
          : (typeof invoiceData === 'string' ? invoiceData : invoiceData);

        // Add lines
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

        toast.success("Factura de compra creada correctamente");
      }

      // Reset form
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving purchase invoice:", error);
      toast.error(error.message || "Error al guardar la factura de compra");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInvoiceNumber("");
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setEntityType(preselectedSupplierId ? "SUPPLIER" : preselectedTechnicianId ? "TECHNICIAN" : "SUPPLIER");
    setSelectedSupplierId(preselectedSupplierId || "");
    setSelectedTechnicianId(preselectedTechnicianId || "");
    setSelectedClientId(preselectedClientId || "");
    setSelectedProjectId(preselectedProjectId || "");
    setSupplierSearchValue("");
    setProjectSearchValue("");
    setLines([]);
    setNotes("");
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {preselectedDocumentId ? "Completar Factura de Compra" : "Nueva Factura de Compra"}
          </DialogTitle>
          <DialogDescription>
            {preselectedDocumentId
              ? "Completa los datos de la factura pendiente de revisar"
              : "Crea una nueva factura de compra o gasto"}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/40" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Datos Básicos</TabsTrigger>
                <TabsTrigger value="lines">Líneas</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Número de Factura *</Label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Ej: INV-2024-001"
                      className="bg-white/5 border-white/10 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="documentType">Tipo de Documento</Label>
                    <Select value={documentType} disabled>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INVOICE">Factura</SelectItem>
                        <SelectItem value="EXPENSE">Gasto/Ticket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Fecha de Emisión *</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Proveedor o Técnico *</Label>
                  <Select value={entityType} onValueChange={(value: "SUPPLIER" | "TECHNICIAN") => setEntityType(value)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPPLIER">Proveedor</SelectItem>
                      <SelectItem value="TECHNICIAN">Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Proveedor o Técnico *</Label>
                  <SupplierSearchInput
                    value={supplierSearchValue}
                    onChange={setSupplierSearchValue}
                    onSelectSupplier={(supplier) => {
                      setSelectedSupplierId(supplier.id);
                      setSupplierSearchValue(supplier.company_name);
                      setEntityType("SUPPLIER");
                    }}
                    onSelectTechnician={(technician) => {
                      setSelectedTechnicianId(technician.id);
                      setSupplierSearchValue(technician.company_name);
                      setEntityType("TECHNICIAN");
                    }}
                    placeholder="Buscar proveedor o técnico... o @buscar"
                    entityType="BOTH"
                    className="bg-white/5 border-white/10 text-white"
                  />
                  {selectedSupplierId && entityType === "SUPPLIER" && (
                    <p className="text-xs text-white/40 mt-1">
                      Proveedor seleccionado: {suppliers.find(s => s.id === selectedSupplierId)?.company_name}
                    </p>
                  )}
                  {selectedTechnicianId && entityType === "TECHNICIAN" && (
                    <p className="text-xs text-white/40 mt-1">
                      Técnico seleccionado: {technicians.find(t => t.id === selectedTechnicianId)?.company_name}
                      {technicians.find(t => t.id === selectedTechnicianId)?.withholding_tax_rate && (
                        <span className="ml-2">(IRPF: {technicians.find(t => t.id === selectedTechnicianId)?.withholding_tax_rate}%)</span>
                      )}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente (Opcional)</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Ninguno</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project">Proyecto (Opcional)</Label>
                    <ProjectSearchInput
                      value={projectSearchValue}
                      onChange={setProjectSearchValue}
                      onSelectProject={(project) => {
                        setSelectedProjectId(project.id);
                        setProjectSearchValue(project.project_name);
                      }}
                      placeholder="Buscar proyecto... o @buscar"
                      className="bg-white/5 border-white/10 text-white"
                    />
                    {selectedProjectId && (
                      <p className="text-xs text-white/40 mt-1">
                        Proyecto seleccionado: {projects.find(p => p.id === selectedProjectId)?.project_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[80px] bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm resize-none"
                    placeholder="Notas adicionales..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="lines">
                <PurchaseInvoiceLinesEditor lines={lines} onChange={setLines} />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : preselectedDocumentId ? (
                  "Actualizar"
                ) : (
                  "Crear"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
