import { useState, useEffect, lazy } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Loader2, Edit, Trash2, FileText, Building2, User, FolderOpen, Calendar, Copy, Receipt, Lock, MessageSquare, Clock, Send, MoreVertical, Share2, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import QuotePDFViewer from "./components/QuotePDFViewer";
import { QUOTE_STATUSES, getStatusInfo } from "@/constants/quoteStatuses";
import { createMobilePage } from "./MobilePageWrapper";

// Lazy load mobile version
const QuoteDetailPageMobile = lazy(() => import("./mobile/QuoteDetailPageMobile"));

interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string;
  project_name: string | null;
  project_id?: string | null;
  order_number: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  project_number: string;
  project_name: string;
  project_address: string | null;
  project_city: string | null;
  local_name: string | null;
  client_order_number: string | null;
}

interface QuoteLine {
  id: string;
  concept: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  line_order: number;
}

interface Client {
  id: string;
  company_name: string;
  legal_name: string | null;
  tax_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_postal_code: string | null;
  billing_province: string | null;
  billing_country: string | null;
  website: string | null;
}

interface CompanySettings {
  id: string;
  legal_name: string;
  commercial_name: string | null;
  tax_id: string;
  vat_number: string | null;
  fiscal_address: string;
  fiscal_city: string;
  fiscal_postal_code: string;
  fiscal_province: string;
  country: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  website: string | null;
  logo_url: string | null;
}

// States that block editing
const LOCKED_STATES = ["SENT", "APPROVED", "REJECTED", "EXPIRED", "INVOICED"];

// States that allow status changes
const getAvailableStatusTransitions = (currentStatus: string) => {
  switch (currentStatus) {
    case "DRAFT":
      return ["DRAFT", "SENT"];
    case "SENT":
      return ["SENT", "APPROVED", "REJECTED"];
    case "APPROVED":
      // Permite cambiar a Rechazado (el cliente puede cambiar de opinión)
      // INVOICED solo se hace mediante el botón de facturar
      return ["APPROVED", "REJECTED"];
    case "REJECTED":
      // Permite cambiar a Aprobado (el cliente puede reconsiderar)
      return ["REJECTED", "APPROVED"];
    case "EXPIRED":
      return ["EXPIRED"]; // Cannot be changed
    case "INVOICED":
      return ["INVOICED"]; // Cannot be changed
    default:
      return [currentStatus];
  }
};

const QuoteDetailPageDesktop = () => {
  const navigate = useNavigate();
  const { userId, quoteId } = useParams<{ userId: string; quoteId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (quoteId) {
      fetchQuoteData();
    }
  }, [quoteId]);

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

      // Fetch quote lines
      const { data: linesData, error: linesError } = await supabase.rpc("get_quote_lines", {
        p_quote_id: quoteId,
      });
      if (linesError) throw linesError;
      setLines(linesData || []);

      // Fetch client details
      if (quoteInfo.client_id) {
        const { data: clientData, error: clientError } = await supabase.rpc("get_client", {
          p_client_id: quoteInfo.client_id,
        });
        if (!clientError && clientData && clientData.length > 0) {
          setClient(clientData[0]);
        }
      }

      // Fetch project details if project exists (project_id now comes from get_quote)
      if (quoteInfo.project_id) {
        const { data: projectData, error: projectError } = await supabase.rpc("get_project", {
          p_project_id: quoteInfo.project_id,
        });
        if (!projectError && projectData && projectData.length > 0) {
          setProject({
            project_number: projectData[0].project_number,
            project_name: projectData[0].project_name,
            project_address: projectData[0].project_address,
            project_city: projectData[0].project_city,
            local_name: projectData[0].local_name,
            client_order_number: projectData[0].client_order_number,
          });
        }
      }

      // Fetch company settings
      const { data: companyData, error: companyError } = await supabase.rpc("get_company_settings");
      if (!companyError && companyData && companyData.length > 0) {
        setCompany(companyData[0]);
      }

    } catch (error: any) {
      console.error("Error fetching quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el presupuesto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quote || newStatus === quote.status) return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase.rpc("update_quote", {
        p_quote_id: quoteId!,
        p_status: newStatus,
      });

      if (error) throw error;

      // Refetch quote to get updated number if changed to SENT
      await fetchQuoteData();

      const statusLabel = getStatusInfo(newStatus).label;
      toast({
        title: "Estado actualizado",
        description: newStatus === "SENT"
          ? "El presupuesto se ha bloqueado y se ha asignado el número definitivo"
          : `El presupuesto ahora está "${statusLabel}"`,
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCreateNewVersion = async () => {
    if (!quote) return;

    // If quote is in DRAFT, first change it to SENT
    if (quote.status === "DRAFT") {
      setCreatingVersion(true);
      try {
        const { error } = await supabase.rpc("update_quote", {
          p_quote_id: quoteId!,
          p_status: "SENT",
        });

        if (error) throw error;

        toast({
          title: "Presupuesto enviado",
          description: "El presupuesto original se ha bloqueado como 'Enviado'",
        });
      } catch (error: any) {
        console.error("Error updating quote status:", error);
        toast({
          title: "Error",
          description: error.message || "No se pudo actualizar el estado",
          variant: "destructive",
        });
        setCreatingVersion(false);
        return;
      }
      setCreatingVersion(false);
    }

    // Navigate to new quote page with source quote id to copy data from
    navigate(`/nexo-av/${userId}/quotes/new?sourceQuoteId=${quoteId}`);
  };

  const handleInvoice = async () => {
    if (!quote) return;

    try {
      const { data, error } = await supabase.rpc("create_invoice_from_quote", {
        p_quote_id: quoteId!,
      });

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No se pudo crear la factura");

      const invoiceId = data[0].invoice_id;
      const invoiceNumber = data[0].invoice_number;

      toast({
        title: "Factura creada",
        description: `Se ha generado la factura ${invoiceNumber}`,
      });

      navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la factura",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleDeleteQuote = async () => {
    if (!quote || quote.status !== "DRAFT") return;

    try {
      setDeleting(true);

      // First delete all quote lines
      for (const line of lines) {
        await supabase.rpc("delete_quote_line", { p_line_id: line.id });
      }

      // Then delete the quote - we'll use update to set a 'deleted' status or simply cancel
      // Since there's no delete_quote function, let's use update to CANCELLED
      const { error } = await supabase.rpc("update_quote", {
        p_quote_id: quoteId!,
        p_status: "CANCELLED",
      });

      if (error) throw error;

      toast({
        title: "Presupuesto eliminado",
        description: `El presupuesto ${quote.quote_number} ha sido eliminado`,
      });
      navigate(`/nexo-av/${userId}/quotes`);
    } catch (error: any) {
      console.error("Error deleting quote:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el presupuesto",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Check if quote is locked
  const isLocked = quote ? LOCKED_STATES.includes(quote.status) : false;
  const canDelete = quote?.status === "DRAFT";
  const isProvisionalNumber = quote?.quote_number?.startsWith("BORR-");
  const hasFinalNumber = !isProvisionalNumber && quote?.quote_number?.startsWith("P-");
  const availableTransitions = quote ? getAvailableStatusTransitions(quote.status) : [];
  const canChangeStatus = availableTransitions.length > 1;
  const showInvoiceButton = quote?.status === "APPROVED";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Presupuesto no encontrado</p>
        <Button
          variant="link"
          onClick={() => navigate(`/nexo-av/${userId}/quotes`)}
          className="text-primary mt-2"
        >
          Volver a presupuestos
        </Button>
      </div>
    );
  }

  const statusInfo = getStatusInfo(quote.status);
  const displayNumber = hasFinalNumber ? quote.quote_number : `(${quote.quote_number})`;
  const pdfFileName = `${quote.quote_number}${quote.project_name ? ` - ${quote.project_name}` : ''}.pdf`;

  return (
    <div className="w-full">
      <div className="w-full px-3 md:px-4 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header Superior - Estilo Holded */}
          <div className="hidden md:block mb-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-white mb-1">
                  {client?.company_name || quote.client_name} - Presupuesto {displayNumber}
                </h1>
                <div className="flex items-center gap-2">
                  {canChangeStatus ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center">
                          <Badge className={`${statusInfo.className} text-xs cursor-pointer hover:opacity-80 transition-opacity`}>
                            {statusInfo.label}
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Badge>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-zinc-900 border-white/10">
                        {availableTransitions.map((status) => {
                          const info = getStatusInfo(status);
                          return (
                            <DropdownMenuItem
                              key={status}
                              onClick={() => handleStatusChange(status)}
                              className="text-white hover:bg-white/10"
                              disabled={updatingStatus}
                            >
                              <span className={`${info.className} px-2 py-0.5 rounded text-xs`}>{info.label}</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Badge className={`${statusInfo.className} text-xs`}>
                      {statusInfo.label}
                    </Badge>
                  )}
                  {isLocked && (
                    <Badge variant="outline" className="border-white/20 text-white/60 text-xs">
                      <Lock className="h-3 w-3 mr-1" />
                      Bloqueado
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10 h-8 text-xs"
                >
                  Convertir
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                    {!isLocked && (
                      <DropdownMenuItem
                        className="text-white hover:bg-white/10"
                        onClick={() => navigate(`/nexo-av/${userId}/quotes/${quoteId}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-white hover:bg-white/10">
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    {canDelete && (
                      <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white h-8 px-3 text-xs"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Enviar
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop Layout: Side by side */}
          <div className="hidden md:grid md:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
            {/* PDF Preview - Left (2/3) */}
            <div className="md:col-span-2 bg-white/5 rounded-lg border border-white/10 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
                <span className="text-white/60 text-xs font-medium">Vista previa</span>
                <span className="text-white/40 text-[10px] truncate max-w-xs">{pdfFileName}</span>
              </div>
              <div className="flex-1 min-h-0">
                <QuotePDFViewer
                  quote={quote}
                  lines={lines}
                  client={client}
                  company={company}
                  project={project}
                  fileName={pdfFileName}
                />
              </div>
            </div>

            {/* Info Panel - Right (1/3) - Estilo Holded */}
            <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden flex flex-col">
              {/* Header del Panel */}
              <div className="px-3 py-2 border-b border-white/10 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <h2 className="text-white font-mono font-bold text-sm">{displayNumber}</h2>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/60 hover:text-white hover:bg-white/10 h-7 w-7"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white/60 hover:text-white hover:bg-white/10 h-7 w-7"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                        {!isLocked && (
                          <DropdownMenuItem
                            className="text-white hover:bg-white/10"
                            onClick={() => navigate(`/nexo-av/${userId}/quotes/${quoteId}/edit`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-white hover:bg-white/10">
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {/* Status badge con dropdown integrado */}
                {canChangeStatus ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center">
                        <Badge className={`${statusInfo.className} text-xs cursor-pointer hover:opacity-80 transition-opacity`}>
                          {statusInfo.label}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-zinc-900 border-white/10">
                      {availableTransitions.map((status) => {
                        const info = getStatusInfo(status);
                        return (
                          <DropdownMenuItem
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            className="text-white hover:bg-white/10"
                            disabled={updatingStatus}
                          >
                            <span className={`${info.className} px-2 py-0.5 rounded text-xs`}>{info.label}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Badge className={`${statusInfo.className} text-xs`}>
                    {statusInfo.label}
                  </Badge>
                )}
              </div>

              {/* Tabs - Estilo Holded */}
              <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-3 mt-2 bg-white/5 border border-white/10 rounded-lg p-0.5 h-8">
                  <TabsTrigger
                    value="general"
                    className="flex-1 text-[11px] data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 px-2 py-1"
                  >
                    General
                  </TabsTrigger>
                  <TabsTrigger
                    value="messages"
                    className="flex-1 text-[11px] data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 px-2 py-1"
                  >
                    Mensajes
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="flex-1 text-[11px] data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 px-2 py-1"
                  >
                    Historial
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto p-3">
                  <TabsContent value="general" className="space-y-4 mt-0">

                    {/* Locked message */}
                    {isLocked && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 flex items-center gap-2 mb-3">
                        <Lock className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        <p className="text-yellow-300/80 text-[11px]">
                          {quote.status === "REJECTED"
                            ? "Este presupuesto ha sido rechazado"
                            : quote.status === "EXPIRED"
                              ? "Este presupuesto ha expirado"
                              : "Este presupuesto está bloqueado para edición"}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="space-y-1.5 mb-3">
                      {/* Invoice button for approved quotes */}
                      {showInvoiceButton && (
                        <Button
                          onClick={handleInvoice}
                          className="w-full bg-purple-500 hover:bg-purple-600 text-white gap-1.5 h-8 text-xs"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          Facturar
                        </Button>
                      )}

                      {/* New version button */}
                      <Button
                        variant="outline"
                        onClick={handleCreateNewVersion}
                        disabled={creatingVersion}
                        className="w-full border-white/20 text-white hover:bg-white/10 gap-1.5 h-8 text-xs"
                      >
                        {creatingVersion ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Nueva versión
                      </Button>
                    </div>

                    {/* Client */}
                    <div className="bg-white/5 rounded-lg p-2 mb-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building2 className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-white/50 text-[10px] uppercase tracking-wide">Cliente</span>
                      </div>
                      <p className="text-white font-medium text-sm">{quote.client_name}</p>
                      {client?.tax_id && (
                        <p className="text-white/60 text-xs">{client.tax_id}</p>
                      )}
                    </div>

                    {/* Project */}
                    <div className="bg-white/5 rounded-lg p-2 mb-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-white/50 text-[10px] uppercase tracking-wide">Proyecto</span>
                      </div>
                      <p className="text-white font-medium text-sm">
                        {project?.project_name || quote.project_name || "Sin proyecto asignado"}
                      </p>
                    </div>

                    {/* Created by */}
                    <div className="bg-white/5 rounded-lg p-2 mb-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <User className="h-3.5 w-3.5 text-purple-500" />
                        <span className="text-white/50 text-[10px] uppercase tracking-wide">Creado por</span>
                      </div>
                      <p className="text-white font-medium text-sm">
                        {quote.created_by_name || "Usuario"}
                      </p>
                    </div>

                    {/* Dates */}
                    <div className="bg-white/5 rounded-lg p-2 mb-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-white/50 text-[10px] uppercase tracking-wide">Fechas</span>
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-white/60">Creado</span>
                          <span className="text-white">{formatDate(quote.created_at)}</span>
                        </div>
                        {quote.valid_until && (
                          <div className="flex justify-between">
                            <span className="text-white/60">Válido hasta</span>
                            <span className="text-white">{formatDate(quote.valid_until)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <FileText className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-orange-400 text-[10px] uppercase tracking-wide">Total</span>
                      </div>
                      <p className="text-white text-xl font-bold">
                        {formatCurrency(quote.total)}
                      </p>
                      <div className="flex justify-between text-xs mt-1.5 text-white/60">
                        <span>Base</span>
                        <span>{formatCurrency(quote.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Impuestos</span>
                        <span>{formatCurrency(quote.tax_amount)}</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {quote.notes && (
                      <div className="bg-white/5 rounded-lg p-2">
                        <span className="text-white/50 text-[10px] uppercase tracking-wide">Notas</span>
                        <p className="text-white/80 text-xs mt-1.5">{quote.notes}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="notes" className="mt-0 h-full flex flex-col">
                    <div className="flex-1 bg-white/5 rounded-lg border border-white/10 p-3 flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-medium text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Notas del presupuesto
                        </h3>
                        {saving && <span className="text-xs text-white/40 animate-pulse">Guardando...</span>}
                      </div>
                      <Textarea
                        value={quote.notes || ""}
                        onChange={(e) => {
                          const newNotes = e.target.value;
                          setQuote(prev => prev ? { ...prev, notes: newNotes } : null);

                          // Debounced save
                          const timeoutId = setTimeout(async () => {
                            setSaving(true);
                            try {
                              const { error } = await supabase.rpc("update_quote", {
                                p_quote_id: quoteId!,
                                p_notes: newNotes
                              });
                              if (error) throw error;
                            } catch (err) {
                              console.error("Error saving notes:", err);
                              toast({
                                title: "Error al guardar notas",
                                variant: "destructive"
                              });
                            } finally {
                              setSaving(false);
                            }
                          }, 1000);

                          // Clear previous timeout
                          return () => clearTimeout(timeoutId);
                        }}
                        className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 p-0 text-sm text-white/80 placeholder:text-white/20"
                        placeholder="Escribe aquí las notas, condiciones especiales o comentarios internos..."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-0">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                        <Clock className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">Presupuesto creado</p>
                          <p className="text-white/60 text-xs mt-1">
                            {formatDate(quote.created_at)} por {quote.created_by_name || "Usuario"}
                          </p>
                        </div>
                      </div>
                      {quote.updated_at !== quote.created_at && (
                        <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                          <Clock className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">Última actualización</p>
                            <p className="text-white/60 text-xs mt-1">
                              {formatDate(quote.updated_at)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Mobile Layout: Stacked */}
          <div className="md:hidden space-y-3">
            {/* Compact summary cards - 2x2 grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 rounded-lg border border-white/10 p-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Building2 className="h-3 w-3 text-orange-500" />
                  <span className="text-white/40 text-[9px]">Cliente</span>
                </div>
                <p className="text-white text-[11px] font-medium truncate">
                  {quote.client_name}
                </p>
              </div>

              <div className="bg-white/5 rounded-lg border border-white/10 p-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <FolderOpen className="h-3 w-3 text-blue-500" />
                  <span className="text-white/40 text-[9px]">Proyecto</span>
                </div>
                <p className="text-white text-[11px] font-medium truncate">
                  {quote.project_name || "Sin proyecto"}
                </p>
              </div>

              <div className="bg-white/5 rounded-lg border border-white/10 p-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <User className="h-3 w-3 text-purple-500" />
                  <span className="text-white/40 text-[9px]">Creado por</span>
                </div>
                <p className="text-white text-[11px] font-medium truncate">
                  {quote.created_by_name || "Usuario"}
                </p>
              </div>

              <div className="bg-orange-500/10 rounded-lg border border-orange-500/30 p-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <FileText className="h-3 w-3 text-orange-500" />
                  <span className="text-orange-400/70 text-[9px]">Total</span>
                </div>
                <p className="text-white text-sm font-bold">
                  {formatCurrency(quote.total)}
                </p>
              </div>
            </div>

            {/* Status selector for mobile - compact */}
            <div className="flex items-center justify-between bg-white/5 rounded-lg border border-white/10 p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-[10px] uppercase tracking-wide">Estado:</span>
                {canChangeStatus ? (
                  <Select
                    value={quote.status}
                    onValueChange={handleStatusChange}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className={`${statusInfo.className} border h-6 px-2 w-auto min-w-[80px] text-[10px] font-medium rounded`}>
                      <SelectValue>
                        <span>{statusInfo.label}</span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 z-50">
                      {availableTransitions.map((status) => {
                        const info = getStatusInfo(status);
                        return (
                          <SelectItem key={status} value={status} className="text-white text-xs">
                            <span className={`${info.className} px-2 py-0.5 rounded text-[10px]`}>{info.label}</span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`${statusInfo.className} text-[10px]`}>
                    {statusInfo.label}
                  </Badge>
                )}
              </div>
              {isLocked && <Lock className="h-3 w-3 text-white/40" />}
            </div>




            {/* Actions bar for mobile */}
            <div className="flex gap-2">
              {showInvoiceButton && (
                <Button
                  size="sm"
                  onClick={handleInvoice}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white h-8 text-xs"
                >
                  <Receipt className="h-3 w-3 mr-1.5" />
                  Facturar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNewVersion}
                disabled={creatingVersion}
                className="flex-1 border-white/20 text-white hover:bg-white/10 h-8 text-xs"
              >
                {creatingVersion ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Copy className="h-3 w-3 mr-1.5" />
                )}
                Nueva versión
              </Button>
              {!isLocked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/nexo-av/${userId}/quotes/${quoteId}/edit`)}
                  className="flex-1 border-white/20 text-white hover:bg-white/10 h-8 text-xs"
                >
                  <Edit className="h-3 w-3 mr-1.5" />
                  Editar
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  Eliminar
                </Button>
              )}
            </div>

            {/* PDF Preview */}
            <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <span className="text-white/60 text-xs font-medium">Vista previa</span>
                <span className="text-white/40 text-[10px] truncate max-w-[140px]">{pdfFileName}</span>
              </div>

              <QuotePDFViewer
                quote={quote}
                lines={lines}
                client={client}
                company={company}
                project={project}
                fileName={pdfFileName}
              />
            </div>

            {/* Dates footer */}
            <div className="flex items-center justify-between text-white/40 text-[10px]">
              <span>Creado: {formatDate(quote.created_at)}</span>
              {quote.valid_until && (
                <span>Válido: {formatDate(quote.valid_until)}</span>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Export version with mobile routing
const QuoteDetailPage = createMobilePage({
  DesktopComponent: QuoteDetailPageDesktop,
  MobileComponent: QuoteDetailPageMobile,
});

export default QuoteDetailPage;
