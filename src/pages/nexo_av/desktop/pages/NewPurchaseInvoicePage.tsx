import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Save,
  Loader2,
  ShoppingCart,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import SupplierSearchInput from "../components/suppliers/SupplierSearchInput";
import ProjectSearchInput from "../components/projects/ProjectSearchInput";
import PurchaseInvoiceLinesEditor, { PurchaseInvoiceLine } from "../components/purchases/PurchaseInvoiceLinesEditor";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";

const NewPurchaseInvoicePageDesktop = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [lines, setLines] = useState<PurchaseInvoiceLine[]>([]);
  
  const documentType = searchParams.get("type") === "EXPENSE" ? "EXPENSE" : "INVOICE";

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const taxAmount = lines.reduce((sum, line) => sum + line.tax_amount, 0);
    const total = lines.reduce((sum, line) => sum + line.total, 0);
    return { subtotal, taxAmount, total };
  }, [lines]);

  const handleSave = async () => {
    // Validation
    if (!supplierId && !technicianId) {
      toast.error("Debes seleccionar un proveedor o técnico");
      return;
    }

    if (lines.length === 0) {
      toast.error("Añade al menos una línea de factura");
      return;
    }

    try {
      setSaving(true);

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase.rpc(
        "create_purchase_invoice",
        {
          p_invoice_number: supplierInvoiceNumber || `BORRADOR-${Date.now().toString().slice(-6)}`,
          p_document_type: documentType,
          p_status: "DRAFT",
          p_supplier_id: supplierId,
          p_technician_id: technicianId,
          p_project_id: projectId,
          p_issue_date: issueDate,
          p_due_date: dueDate || null,
          p_notes: notes || null,
        } as any
      );

      if (invoiceError) throw invoiceError;

      const invoiceId = invoiceData;

      // Add lines with error handling
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const { error: lineError } = await supabase.rpc(
          "add_purchase_invoice_line",
          {
            p_invoice_id: invoiceId,
            p_concept: line.concept,
            p_description: line.description || null,
            p_quantity: line.quantity,
            p_unit_price: line.unit_price,
            p_tax_rate: line.tax_rate,
            p_withholding_tax_rate: line.withholding_tax_rate || 0,
            p_discount_percent: line.discount_percent || 0,
          }
        );

        if (lineError) {
          console.error(`Error adding line ${i + 1}:`, lineError);
          throw new Error(`Error al añadir línea ${i + 1}: ${lineError.message}`);
        }
      }

      toast.success("Factura de compra creada correctamente");
      navigate(`/nexo-av/${userId}/purchase-invoices/${invoiceId}`);
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(`/nexo-av/${userId}/purchase-invoices`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Navigation Bar */}
      <DetailNavigationBar
        pageTitle={`Nueva ${documentType === "EXPENSE" ? "Gasto" : "Factura de Compra"}`}
        contextInfo="Creación manual"
        onBack={handleBack}
        tools={
          <DetailActionButton
            actionType="save"
            onClick={handleSave}
            loading={saving}
          />
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Proveedor/Técnico */}
            <div className="lg:col-span-2 space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Proveedor / Técnico *
              </Label>
              <SupplierSearchInput
                value={supplierId || technicianId || ""}
                onChange={(value) => {
                  // For now, treat as supplier ID
                  setSupplierId(value);
                  setTechnicianId(null);
                }}
                placeholder="Buscar proveedor o técnico..."
              />
            </div>

            {/* Proyecto */}
            <div className="lg:col-span-2 space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Proyecto (opcional)
              </Label>
              <ProjectSearchInput
                value={projectName}
                onChange={setProjectName}
                onSelectProject={(project) => {
                  setProjectId(project.id);
                  setProjectName(project.project_name);
                }}
                placeholder="Asignar a un proyecto..."
                showDropdown={true}
              />
            </div>

            {/* Nº Factura Proveedor */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Nº Factura Proveedor
              </Label>
              <Input
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="Ej: FAC-2024-001"
                className="h-11"
              />
            </div>

            {/* Fecha Emisión */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Fecha Emisión
              </Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Fecha Vencimiento */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Fecha Vencimiento
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          {/* Lines Editor */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">
              Líneas de Factura
            </h3>
            <PurchaseInvoiceLinesEditor
              lines={lines}
              onChange={setLines}
            />
          </div>

          {/* Notes and Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notes */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Notas públicas
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas que aparecerán en el documento..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Notas internas
                </Label>
                <Textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Notas internas (no visibles en documentos)..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-end">
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6 w-full sm:w-80">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-base text-muted-foreground">Base imponible</span>
                    <span className="text-base font-semibold text-foreground">
                      {formatCurrency(totals.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base text-muted-foreground">Impuestos</span>
                    <span className="text-base font-medium text-foreground">
                      {formatCurrency(totals.taxAmount)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-foreground">Total</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(totals.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-muted/30 border border-border/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-xl">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">
                  Flujo de trabajo
                </h4>
                <p className="text-sm text-muted-foreground">
                  Esta factura se guardará como <strong>Borrador</strong>. Una vez
                  creada, podrás subir el documento PDF del proveedor o asignar
                  uno desde el <strong>Escáner</strong>. Después de validar los
                  datos, podrás aprobarla y proceder a pagos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPurchaseInvoicePageDesktop;
