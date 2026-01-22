import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Building2, Calendar, FileText, Edit, Lock, User, Send, Trash2, FolderKanban, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import InvoicePDFViewer from "../components/invoices/InvoicePDFViewer";
import InvoicePaymentsSection from "../components/invoices/InvoicePaymentsSection";
import { FINANCE_INVOICE_STATUSES, getFinanceStatusInfo, LOCKED_FINANCE_INVOICE_STATES } from "@/constants/financeStatuses";


const getAvailableStatusTransitions = (currentStatus: string): string[] => {
  switch (currentStatus) {
    case "DRAFT":
      return ["ISSUED", "CANCELLED"];
    case "ISSUED":
      return ["CANCELLED"];
    case "PARTIAL":
      return ["CANCELLED"];
    case "PAID":
      return [];
    case "OVERDUE":
      return ["CANCELLED"];
    case "CANCELLED":
      return [];
    default:
      return [];
  }
};

const InvoiceDetailPageDesktop = () => {
  const { userId, invoiceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchInvoiceData = async () => {
    if (!invoiceId) return;

    try {
      setLoading(true);

      // Fetch invoice using finance_get_invoice
      const { data: invoiceData, error: invoiceError } = await supabase.rpc(
        "finance_get_invoice" as any,
        { p_invoice_id: invoiceId }
      );

      if (invoiceError) throw invoiceError;

      const invoiceRecord = Array.isArray(invoiceData) ? invoiceData[0] : invoiceData;
      if (!invoiceRecord) {
        toast.error("Factura no encontrada");
        return;
      }

      setInvoice(invoiceRecord);

      // Fetch invoice lines
      const { data: linesData, error: linesError } = await supabase.rpc(
        "finance_get_invoice_lines" as any,
        { p_invoice_id: invoiceId }
      );

      if (linesError) throw linesError;
      // Sort lines by line_order to ensure correct order in PDF
      const sortedLines = (linesData || []).sort((a: any, b: any) =>
        (a.line_order || 0) - (b.line_order || 0)
      );
      setLines(sortedLines);

      // Fetch client
      if (invoiceRecord.client_id) {
        const { data: clientData } = await supabase.rpc(
          "get_client",
          { p_client_id: invoiceRecord.client_id }
        );
        if (clientData) {
          setClient(Array.isArray(clientData) ? clientData[0] : clientData);
        }
      }

      // Fetch project
      if (invoiceRecord.project_id) {
        const { data: projectData } = await supabase.rpc(
          "get_project",
          { p_project_id: invoiceRecord.project_id }
        );
        if (projectData) {
          setProject(Array.isArray(projectData) ? projectData[0] : projectData);
        }
      }

      // Fetch company settings
      const { data: companyData } = await supabase.rpc("get_company_settings");
      if (companyData) {
        setCompany(Array.isArray(companyData) ? companyData[0] : companyData);
      }

      // Fetch company preferences (for bank accounts)
      const { data: preferencesData } = await supabase.rpc("get_company_preferences");
      if (preferencesData) {
        const prefs = Array.isArray(preferencesData) ? preferencesData[0] : preferencesData;
        setPreferences({
          bank_accounts: Array.isArray(prefs?.bank_accounts) ? prefs.bank_accounts : []
        });
      }
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast.error("Error al cargar la factura");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceData();
  }, [invoiceId]);

  const handleIssueInvoice = async () => {
    if (!invoice) return;

    try {
      setUpdatingStatus(true);

      // Call finance_issue_invoice to assign definitive number
      const { data, error } = await supabase.rpc("finance_issue_invoice", {
        p_invoice_id: invoice.id,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      toast.success(`Factura emitida con número ${result?.invoice_number}`);
      fetchInvoiceData();
    } catch (error: any) {
      console.error("Error issuing invoice:", error);
      toast.error(error.message || "Error al emitir la factura");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;

    // If changing from DRAFT to ISSUED, use the issue function
    if (invoice.status === "DRAFT" && newStatus === "ISSUED") {
      return handleIssueInvoice();
    }

    try {
      setUpdatingStatus(true);

      const { error } = await supabase.rpc("finance_update_invoice" as any, {
        p_invoice_id: invoice.id,
        p_status: newStatus,
      });

      if (error) throw error;

      toast.success(`Estado actualizado a ${getFinanceStatusInfo(newStatus).label}`);
      fetchInvoiceData();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Error al actualizar el estado");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePaymentsChange = () => {
    fetchInvoiceData();
  };

  const handleDeleteInvoice = async () => {
    if (!invoice || invoice.status !== "DRAFT") return;

    try {
      setDeleting(true);

      // First delete all invoice lines
      for (const line of lines) {
        await supabase.rpc("finance_delete_invoice_line", { p_line_id: line.id });
      }

      // Then cancel/delete the invoice
      const { error } = await supabase.rpc("finance_cancel_invoice" as any, {
        p_invoice_id: invoice.id,
        p_reason: "Borrador eliminado por el usuario",
      });

      if (error) throw error;

      toast.success("Factura eliminada correctamente");
      navigate(`/nexo-av/${userId}/invoices`);
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      toast.error(error.message || "Error al eliminar la factura");
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">Factura no encontrada</p>
        <Button
          variant="outline"
          onClick={() => navigate(`/nexo-av/${userId}/invoices`)}
        >
          Volver a Facturas
        </Button>
      </div>
    );
  }

  const statusInfo = getFinanceStatusInfo(invoice.status);
  const isLocked = invoice.is_locked || LOCKED_FINANCE_INVOICE_STATES.includes(invoice.status);
  const availableTransitions = getAvailableStatusTransitions(invoice.status);
  const canChangeStatus = availableTransitions.length > 0;
  // Mostrar número definitivo si existe, sino mostrar el preliminar
  const displayNumber = invoice.invoice_number || invoice.preliminary_number || "Sin número";
  const isDraft = invoice.status === "DRAFT";
  const hasPreliminaryNumber = invoice.preliminary_number && invoice.preliminary_number !== invoice.invoice_number;

  return (
    <div className="w-full h-full">
      <div className="w-full h-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6 overflow-y-auto">
        {/* Header with Title and Back button */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={() => navigate(`/nexo-av/${userId}/invoices`)}
            title="Volver a Facturas"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight">Detalle de Factura</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs font-mono text-muted-foreground">{displayNumber}</p>
              {hasPreliminaryNumber && invoice.invoice_number && (
                <span className="text-xs text-muted-foreground">
                  (Borrador: {invoice.preliminary_number})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Badge className={statusInfo.className}>
              {isLocked && <Lock className="w-3 h-3 mr-1" />}
              {statusInfo.label}
            </Badge>
            {invoice.status === "DRAFT" && (
              <span className="text-sm text-muted-foreground">(Número preliminar)</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {invoice.status === "DRAFT" && (
              <>
                <Button
                  onClick={handleIssueInvoice}
                  disabled={updatingStatus || deleting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Emitir Factura
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/nexo-av/${userId}/invoices/${invoice.id}/edit`)}
                  disabled={deleting}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      disabled={deleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-zinc-900 border-white/10">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">¿Eliminar factura borrador?</AlertDialogTitle>
                      <AlertDialogDescription className="text-white/60">
                        Esta acción eliminará permanentemente la factura {displayNumber} y todas sus líneas.
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteInvoice}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {!isDraft && (
              <Button
                variant="outline"
                onClick={() => {
                  // El botón de descarga está en el componente InvoicePDFViewer
                  // Este botón puede servir como acceso rápido
                  const downloadButton = document.querySelector('.inline-flex.items-center.justify-center.gap-2') as HTMLElement;
                  if (downloadButton) {
                    downloadButton.click();
                  }
                }}
                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
            )}

            {canChangeStatus && invoice.status !== "DRAFT" && (
              <Select
                value={invoice.status}
                onValueChange={handleStatusChange}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Cambiar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={invoice.status} disabled>
                    {statusInfo.label} (actual)
                  </SelectItem>
                  {availableTransitions.map((status) => {
                    const info = getFinanceStatusInfo(status);
                    return (
                      <SelectItem key={status} value={status}>
                        {info.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - PDF Preview */}
          <div className="lg:col-span-2">
            <Card className="bg-white/5 border-white/10 overflow-hidden">
              <CardContent className="p-0 h-full">
                <InvoicePDFViewer
                  invoice={invoice}
                  lines={lines}
                  client={client}
                  company={company}
                  project={project}
                  preferences={preferences}
                  fileName={`Factura-${displayNumber}`}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details & Payments */}
          <div className="space-y-6">
            {/* Invoice Info */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Información
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs mb-1 text-muted-foreground">Número</p>
                    <div className="flex flex-col gap-1">
                      <p className="font-mono font-semibold">{displayNumber}</p>
                      {hasPreliminaryNumber && invoice.invoice_number && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Borrador: {invoice.preliminary_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs mb-1 text-muted-foreground">Estado</p>
                    <Badge className={statusInfo.className}>
                      {isLocked && <Lock className="w-3 h-3 mr-1" />}
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs mb-1 flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Emisión
                    </p>
                    <p>{formatDate(invoice.issue_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1 flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Vencimiento
                    </p>
                    <p className={
                      invoice.status !== "PAID" && invoice.due_date && new Date(invoice.due_date) < new Date()
                        ? "text-red-400"
                        : ""
                    }>
                      {formatDate(invoice.due_date)}
                    </p>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(invoice.subtotal || 0)}</span>
                  </div>
                  {(invoice.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Descuento</span>
                      <span className="text-red-400">-{formatCurrency(invoice.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Impuestos</span>
                    <span>{formatCurrency(invoice.tax_amount || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.total || 0)}</span>
                  </div>
                  {invoice.status !== "DRAFT" && (
                    <>
                      <div className="flex justify-between text-emerald-400 font-medium">
                        <span>Cobrado</span>
                        <span>{formatCurrency(invoice.paid_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between text-amber-500 font-bold">
                        <span>Pendiente</span>
                        <span>{formatCurrency(invoice.pending_amount || 0)}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            {client && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium text-base">{client.company_name || client.legal_name}</p>
                    {client.legal_name && client.company_name !== client.legal_name && (
                      <p className="text-sm text-muted-foreground mt-1">{client.legal_name}</p>
                    )}
                  </div>
                  {client.contact_name && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User className="w-3 h-3" />
                      <p className="text-sm">{client.contact_name}</p>
                    </div>
                  )}
                  {(client.tax_id || client.cif) && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">NIF/CIF:</span> {client.tax_id || client.cif}
                    </p>
                  )}
                  {client.contact_email && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Email:</span> {client.contact_email}
                    </p>
                  )}
                  {client.contact_phone && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Teléfono:</span> {client.contact_phone}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => navigate(`/nexo-av/${userId}/clients/${client.id}`)}
                  >
                    Ver detalles del cliente
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Project Info */}
            {project && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderKanban className="w-5 h-5" />
                    Proyecto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium text-base">
                      {project.project_name || invoice.project_name || "Sin nombre"}
                    </p>
                    {project.project_number && (
                      <p className="text-sm text-muted-foreground mt-1 font-mono">
                        Nº Proyecto: {project.project_number}
                      </p>
                    )}
                  </div>
                  {project.client_order_number && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Nº Pedido Cliente:</span> {project.client_order_number}
                    </p>
                  )}
                  {project.local_name && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Local:</span> {project.local_name}
                    </p>
                  )}
                  {(project.project_address || project.project_city) && (
                    <div className="text-sm text-muted-foreground">
                      {project.project_address && <p>{project.project_address}</p>}
                      {project.project_city && (
                        <p>{project.project_city}{project.project_city && project.project_address ? "" : ""}</p>
                      )}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => navigate(`/nexo-av/${userId}/projects/${project.id}`)}
                  >
                    Ver detalles del proyecto
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Payments Section */}
            <InvoicePaymentsSection
              invoiceId={invoice.id}
              total={invoice.total || 0}
              paidAmount={invoice.paid_amount || 0}
              pendingAmount={invoice.pending_amount || 0}
              status={invoice.status}
              isLocked={isLocked}
              onPaymentChange={handlePaymentsChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPageDesktop;
