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
import { Loader2, Edit, Trash2, FileText, Building2, User, FolderOpen, Calendar, Copy, Receipt, MessageSquare, Clock, Send, MoreVertical, Share2, Save, LayoutDashboard, Mail, MapPin, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import TabNav, { TabItem } from "../components/navigation/TabNav";
import { DetailInfoBlock, DetailInfoHeader, DetailInfoSummary, MetricCard } from "../components/detail";
import StatusSelector from "../components/common/StatusSelector";
import DocumentPDFViewer from "../components/common/DocumentPDFViewer";
import LockedIndicator from "../components/common/LockedIndicator";
import DetailActionButton from "../components/navigation/DetailActionButton";
import { QuotePDFDocument } from "../components/quotes/QuotePDFViewer";
import ArchivedPdfViewer from "../../shared/components/ArchivedPdfViewer";
import { archiveSalesDocument, buildQuoteArchiveFileName } from "../../shared/lib/salesDocumentArchive";
import { forceRefreshAccessToken, getFreshAccessToken } from "../../shared/lib/supabaseSession";
import { QUOTE_STATUSES, getStatusInfo } from "@/constants/quoteStatuses";
import ConfirmActionDialog from "../components/common/ConfirmActionDialog";
import { ActivityTimeline } from "../../assets/components/ActivityTimeline";

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
  issue_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  site_id?: string | null;
  site_name?: string | null;
  site_city?: string | null;
  archived_pdf_path?: string | null;
  archived_pdf_file_name?: string | null;
  sharepoint_item_id?: string | null;
}

interface Project {
  project_number: string;
  project_name: string;
  project_address: string | null;
  project_city: string | null;
  local_name: string | null;
  client_order_number: string | null;
  site_name?: string | null;
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
      return ["REJECTED"];
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
  const [currentNote, setCurrentNote] = useState("");
  const [savedNotes, setSavedNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState("resumen");
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  const tabs: TabItem[] = [
    { value: "resumen", label: "Resumen", icon: LayoutDashboard },
    { value: "lineas", label: "Lineas", icon: FileText },
    { value: "auditoria", label: "Auditoria", icon: Clock },
  ];

  useEffect(() => {
    if (quoteId) {
      fetchQuoteData();
      fetchSavedNotes();
    }
  }, [quoteId]);

  useEffect(() => {
    if (quote) {
      setCurrentNote(quote.notes || "");
    }
  }, [quote]);


  const fetchQuoteData = async () => {
    let result: { quote: Quote; lines: QuoteLine[]; client: Client | null; company: CompanySettings | null; project: Project | null } | null = null;
    try {
      setLoading(true);

      // Fetch quote
      const { data: quoteData, error: quoteError } = await supabase.rpc("get_quote", {
        p_quote_id: quoteId,
      });
      if (quoteError) throw quoteError;
      if (!quoteData || quoteData.length === 0) throw new Error("Presupuesto no encontrado");

      const quoteInfo = quoteData[0] as any;
      let enrichedQuote = {
        ...(quoteInfo as Quote),
        archived_pdf_path: quoteInfo.archived_pdf_path ?? null,
        archived_pdf_file_name: quoteInfo.archived_pdf_file_name ?? null,
      } as Quote;

      if (!enrichedQuote.archived_pdf_path || !enrichedQuote.archived_pdf_file_name) {
        try {
          const invokeGetSalesMetadata = async (token: string) =>
            await supabase.functions.invoke("sharepoint-storage", {
              body: {
                action: "get-sales-metadata",
                documentType: "quote",
                documentId: quoteId,
              },
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

          let archiveData: { archived_pdf_path: string | null; archived_pdf_file_name: string | null } | null = null;
          let archiveError: any = null;

          const accessToken = await getFreshAccessToken();
          let { data: fallbackPayload, error: invokeError } = await invokeGetSalesMetadata(accessToken);

          const status = (invokeError as any)?.context?.response?.status;
          if (invokeError && (status === 401 || status === 403)) {
            const refreshedToken = await forceRefreshAccessToken();
            const retried = await invokeGetSalesMetadata(refreshedToken);
            fallbackPayload = retried.data;
            invokeError = retried.error;
          }

          if (!invokeError) {
            const archivedPdfPath =
              (fallbackPayload as any)?.archivedPdfPath ??
              (fallbackPayload as any)?.archived_pdf_path ??
              null;
            const archivedPdfFileName =
              (fallbackPayload as any)?.archivedPdfFileName ??
              (fallbackPayload as any)?.archived_pdf_file_name ??
              null;

            if (archivedPdfPath) {
              archiveData = {
                archived_pdf_path: archivedPdfPath,
                archived_pdf_file_name: archivedPdfFileName,
              };
            }
          } else {
            archiveError = invokeError;
            console.warn("get-sales-metadata failed:", invokeError.message);
          }

          const runGetArchiveMetadata = (fn: "get_quote_archive_metadata" | "sync_get_quote_archive_metadata") =>
            ((supabase.rpc as any)(fn, {
              p_quote_id: quoteId,
            }) as Promise<{ data: Array<{ archived_pdf_path: string | null; archived_pdf_file_name: string | null }> | null; error: any }>);

          if (archiveError || !archiveData?.archived_pdf_path) {
            let { data: archiveRows, error: rpcError } = await runGetArchiveMetadata("get_quote_archive_metadata");
            if (rpcError?.message?.includes("Could not find the function public.get_quote_archive_metadata")) {
              const fallback = await runGetArchiveMetadata("sync_get_quote_archive_metadata");
              archiveRows = fallback.data;
              rpcError = fallback.error;
            }

            if (!rpcError && Array.isArray(archiveRows) && archiveRows.length > 0) {
              archiveData = archiveRows[0];
              archiveError = null;
            } else {
              archiveError = rpcError;
            }
          }

          if (archiveError || !archiveData?.archived_pdf_path) {
            try {
              const syncListResult = await ((supabase.rpc as any)("sync_list_quotes_for_archive", {
                p_limit: 1,
                p_quote_id: quoteId,
              }) as Promise<{ data: Array<{ archived_pdf_path: string | null }> | null; error: any }>);

              if (!syncListResult.error && Array.isArray(syncListResult.data) && syncListResult.data.length > 0) {
                archiveData = {
                  archived_pdf_path: syncListResult.data[0].archived_pdf_path,
                  archived_pdf_file_name: syncListResult.data[0].archived_pdf_path?.split("/").at(-1) ?? null,
                };
              }
            } catch (syncListError) {
              console.warn("sync_list_quotes_for_archive unavailable for current role:", syncListError);
            }
          }

          if (archiveData?.archived_pdf_path) {
            enrichedQuote = {
              ...(quoteInfo as Quote),
              archived_pdf_path: archiveData.archived_pdf_path,
              archived_pdf_file_name: archiveData.archived_pdf_file_name,
            };
          }
        } catch (archiveFetchError) {
          console.error("Error fetching quote archive metadata:", archiveFetchError);
        }
      }

      setQuote(enrichedQuote);

      // Fetch quote lines
      const { data: linesData, error: linesError } = await supabase.rpc("get_quote_lines", {
        p_quote_id: quoteId,
      });
      if (linesError) throw linesError;
      const fetchedLines = linesData || [];
      setLines(fetchedLines);

      let fetchedClient: Client | null = null;
      let fetchedProject: Project | null = null;
      let fetchedCompany: CompanySettings | null = null;

      // Fetch client details
      if (quoteInfo.client_id) {
        const { data: clientData, error: clientError } = await supabase.rpc("get_client", {
          p_client_id: quoteInfo.client_id,
        });
        if (!clientError && clientData && clientData.length > 0) {
          setClient(clientData[0]);
          fetchedClient = clientData[0];
        }
      }

      // Fetch project details if project exists
      if (quoteInfo.project_id) {
        const { data: projectData, error: projectError } = await supabase.rpc("get_project", {
          p_project_id: quoteInfo.project_id,
        });
        if (!projectError && projectData && projectData.length > 0) {
          const proj: Project = {
            project_number: projectData[0].project_number,
            project_name: projectData[0].project_name,
            project_address: projectData[0].project_address,
            project_city: projectData[0].project_city,
            local_name: projectData[0].local_name,
            client_order_number: projectData[0].client_order_number,
            site_name: quoteInfo.site_name || null,
          };
          // For MULTI_SITE: use site-level client_order_number if available
          if (quoteInfo.site_id && quoteInfo.project_id) {
            const { data: sitesData } = await supabase.rpc("list_project_sites", {
              p_project_id: quoteInfo.project_id,
            });
            const matchingSite = ((sitesData || []) as any[]).find(
              (s) => s.id === quoteInfo.site_id
            );
            if (matchingSite?.client_order_number) {
              proj.client_order_number = matchingSite.client_order_number;
            }
          }
          setProject(proj);
          fetchedProject = proj;
        }
      }

      // Fetch company settings
      const { data: companyData, error: companyError } = await supabase.rpc("get_company_settings");
      if (!companyError && companyData && companyData.length > 0) {
        setCompany(companyData[0]);
        fetchedCompany = companyData[0];
      }

      result = { quote: enrichedQuote, lines: fetchedLines, client: fetchedClient, company: fetchedCompany, project: fetchedProject };

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
    return result;
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quote || newStatus === quote.status) return;

    if (quote.status === "DRAFT" && newStatus === "SENT") {
      return handleSend();
    }

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

  const handleSend = async () => {
    if (!quote || quote.status !== "DRAFT") return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase.rpc("update_quote", {
        p_quote_id: quoteId!,
        p_status: "SENT",
      });

      if (error) throw error;

      const freshData = await fetchQuoteData();
      if (!freshData?.quote || !freshData.client || !freshData.company) {
        throw new Error("El presupuesto se envió pero no se pudo recargar la información para archivarlo");
      }

      const issueDate = freshData.quote.issue_date || freshData.quote.created_at.slice(0, 10);
      const archivedFileName = buildQuoteArchiveFileName({
        quoteNumber: freshData.quote.quote_number,
        clientName: freshData.quote.client_name,
        issueDate,
      });

      await archiveSalesDocument({
        documentType: "quote",
        documentId: freshData.quote.id,
        issueDate,
        fileName: archivedFileName,
        pdfDocument: (
          <QuotePDFDocument
            quote={{ ...freshData.quote, issue_date: issueDate }}
            lines={freshData.lines}
            client={freshData.client}
            company={freshData.company}
            project={freshData.project}
          />
        ),
        metadata: {
          DocumentoERPId: freshData.quote.id,
          TipoDocumento: "Presupuesto",
          Cliente: freshData.quote.client_name,
          Proyecto: freshData.quote.project_name || "",
          MesFiscal: issueDate.slice(0, 7),
          EstadoERP: freshData.quote.status,
        },
        persistRpc: "set_quote_archive_metadata",
        persistArgs: {
          p_quote_id: freshData.quote.id,
        },
      });

      await fetchQuoteData();

      toast({
        title: "Presupuesto enviado y archivado",
        description: "El presupuesto ha quedado archivado correctamente en SharePoint.",
      });
    } catch (error: any) {
      console.error("Error sending quote:", error);
      await fetchQuoteData();
      toast({
        title: "Error al completar el envío",
        description: error.message || "No se pudo enviar y archivar el presupuesto",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRetryArchive = async () => {
    if (!quote || quote.status === "DRAFT" || !client || !company) return;

    setUpdatingStatus(true);
    try {
      const issueDate = quote.issue_date || quote.created_at.slice(0, 10);
      const archivedFileName = buildQuoteArchiveFileName({
        quoteNumber: quote.quote_number,
        clientName: quote.client_name,
        issueDate,
      });

      await archiveSalesDocument({
        documentType: "quote",
        documentId: quote.id,
        issueDate,
        fileName: archivedFileName,
        pdfDocument: (
          <QuotePDFDocument
            quote={{ ...quote, issue_date: issueDate }}
            lines={lines}
            client={client}
            company={company}
            project={project}
          />
        ),
        metadata: {
          DocumentoERPId: quote.id,
          TipoDocumento: "Presupuesto",
          Cliente: quote.client_name,
          Proyecto: quote.project_name || "",
          MesFiscal: issueDate.slice(0, 7),
          EstadoERP: quote.status,
        },
        persistRpc: "set_quote_archive_metadata",
        persistArgs: {
          p_quote_id: quote.id,
        },
      });

      await fetchQuoteData();
      toast({
        title: "Archivado completado",
        description: "El presupuesto archivado ya está disponible en SharePoint.",
      });
    } catch (error: any) {
      console.error("Error retrying quote archive:", error);
      toast({
        title: "Error al archivar",
        description: error.message || "No se pudo archivar el presupuesto enviado.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCreateNewVersion = async () => {
    if (!quote) return;

    // Navigate to new quote page with source quote id to copy data from
    navigate(`/nexo-av/${userId}/quotes/new?sourceQuoteId=${quoteId}`);
  };

  const handleInvoice = () => {
    if (!quote) return;
    navigate(`/nexo-av/${userId}/invoices/new?sourceQuoteId=${quoteId}`);
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

  const fetchSavedNotes = async () => {
    if (!quoteId) return;
    try {
      setLoadingNotes(true);
      // TODO: Crear función RPC pública get_quote_notes si es necesaria
      // Temporalmente comentado hasta que la RPC esté disponible
      // const { data, error } = await supabase.rpc("get_quote_notes", {
      //   p_quote_id: quoteId,
      // });
      // if (error) throw error;
      // setSavedNotes(data || []);
      setSavedNotes([]); // Temporalmente vacío
    } catch (error: any) {
      console.error("Error fetching saved notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleSaveNote = async () => {
    if (!currentNote.trim() || !quoteId) {
      toast({
        title: "Error",
        description: "La nota no puede estar vacía",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      // TODO: Crear función RPC pública create_quote_note si es necesaria
      // Temporalmente comentado hasta que la RPC esté disponible
      // const { error } = await supabase.rpc("create_quote_note", {
      //   p_quote_id: quoteId,
      //   p_content: currentNote.trim(),
      // });
      // if (error) throw error;
      
      // Temporalmente solo mostrar mensaje de éxito sin guardar
      toast({
        title: "Nota",
        description: "Funcionalidad de notas temporalmente deshabilitada. Se implementará próximamente.",
      });
      setCurrentNote("");
      return;

      toast({
        title: "Nota guardada",
        description: "La nota se ha registrado correctamente con fecha y hora",
      });

      // Clear current note and refresh saved notes
      setCurrentNote("");
      await fetchSavedNotes();

      // Also update the quote notes field
      await supabase.rpc("update_quote", {
        p_quote_id: quoteId,
        p_notes: "",
      });
      await fetchQuoteData();
    } catch (error: any) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la nota",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
  
  // Generar nombre del archivo PDF: "Nombre Empresa - Nº Presupuesto - Nombre Proyecto"
  // Sanitizar el nombre para evitar caracteres problemáticos en nombres de archivo
  const sanitizeFileName = (name: string) => {
    return name.replace(/[<>:"/\\|?*]/g, '').trim();
  };
  
  const companyName = sanitizeFileName(company?.legal_name || company?.commercial_name || 'Empresa');
  const projectName = project?.project_name || quote.project_name || '';
  const pdfFileNameParts = [
    companyName,
    quote.quote_number,
    ...(projectName ? [sanitizeFileName(projectName)] : [])
  ];
  const pdfFileName = `${pdfFileNameParts.join(' - ')}.pdf`;
  const hasArchivedPdf = quote.status !== "DRAFT" && !!quote.archived_pdf_path;

  return (
    <div className="w-full h-full flex flex-col">
      <DetailNavigationBar
        pageTitle="Detalle de Presupuesto"
        contextInfo={
          <div className="flex items-center gap-2">
            <span>{client?.company_name || quote.client_name} - Presupuesto {displayNumber}</span>
            <LockedIndicator isLocked={isLocked} />
          </div>
        }
        backPath={userId ? `/nexo-av/${userId}/quotes` : undefined}
        tools={
          <div className="flex items-center gap-2">
            {/* Estado DRAFT: mostrar "Editar" y "Enviar" */}
            {quote?.status === "DRAFT" && (
              <>
                <DetailActionButton
                  actionType="edit"
                  onClick={() => navigate(`/nexo-av/${userId}/quotes/${quoteId}/edit`)}
                />
                <DetailActionButton
                  actionType="send"
                  onClick={() => setShowSendConfirm(true)}
                  disabled={updatingStatus}
                />
              </>
            )}

            {/* Diálogo de confirmación para enviar presupuesto */}
            <ConfirmActionDialog
              open={showSendConfirm}
              onOpenChange={setShowSendConfirm}
              onConfirm={() => {
                setShowSendConfirm(false);
                handleSend();
              }}
              actionType="send_quote"
              loading={updatingStatus}
            />

            {/* Estado SENT: solo mostrar "Nueva Versión" */}
            {quote?.status === "SENT" && (
              <DetailActionButton
                actionType="new_version"
                onClick={handleCreateNewVersion}
                disabled={creatingVersion}
              />
            )}

            {/* Estado APPROVED: mostrar "Nueva Versión" y "Facturar" */}
            {quote?.status === "APPROVED" && (
              <>
                <DetailActionButton
                  actionType="new_version"
                  onClick={handleCreateNewVersion}
                  disabled={creatingVersion}
                />
                <DetailActionButton
                  actionType="invoice"
                  onClick={handleInvoice}
                />
              </>
            )}

            {/* Estado REJECTED: solo mostrar "Nueva Versión" */}
            {quote?.status === "REJECTED" && (
              <DetailActionButton
                actionType="new_version"
                onClick={handleCreateNewVersion}
                disabled={creatingVersion}
              />
            )}

            {/* Estado EXPIRED: solo mostrar "Nueva Versión" */}
            {quote?.status === "EXPIRED" && (
              <DetailActionButton
                actionType="new_version"
                onClick={handleCreateNewVersion}
                disabled={creatingVersion}
              />
            )}
          </div>
        }
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Columna izquierda - TabNav y contenido */}
        <div className="flex-1 flex flex-col min-w-0">
          <TabNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          
          <div className="flex-1 overflow-auto">
            {activeTab === "resumen" && (
              <div className="w-full h-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Desktop Layout: PDF Preview */}
                  <div className="hidden md:block bg-white/5 border border-white/10 overflow-hidden flex flex-col h-[calc(100vh-180px)]">
                    {hasArchivedPdf ? (
                      <ArchivedPdfViewer
                        documentType="quote"
                        documentId={quote.id}
                        filePath={quote.archived_pdf_path!}
                        fileName={quote.archived_pdf_file_name || pdfFileName}
                        title={`Presupuesto archivado ${displayNumber}`}
                        className="h-full"
                      />
                    ) : quote.status !== "DRAFT" ? (
                      <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3">
                        <AlertTriangle className="h-10 w-10 text-amber-500" />
                        <p className="text-sm text-muted-foreground">
                          El presupuesto está emitido pero no tiene PDF archivado en SharePoint.
                        </p>
                        <Button
                          variant="outline"
                          onClick={handleRetryArchive}
                          disabled={updatingStatus}
                          className="gap-2"
                        >
                          {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Reintentar archivado
                        </Button>
                      </div>
                    ) : (
                      <DocumentPDFViewer
                        document={
                          <QuotePDFDocument
                            quote={quote}
                            lines={lines}
                            client={client}
                            company={company}
                            project={project}
                          />
                        }
                        fileName={pdfFileName.replace('.pdf', '')}
                        defaultShowPreview={true}
                        showToolbar={false}
                        className="h-full"
                      />
                    )}
                  </div>
                </motion.div>
              </div>
            )}
            {activeTab === "lineas" && (
              <div className="p-6">
                <p className="text-muted-foreground">Lineas - Se trabajará más adelante</p>
              </div>
            )}
            {activeTab === "auditoria" && quoteId && (
              <div className="p-6">
                <ActivityTimeline entityType="quote" entityId={quoteId} />
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha - DetailInfoBlock */}
        <div className="w-[20rem] flex-shrink-0 border-l border-border h-full">
          <div className="h-full">
            <DetailInfoBlock
              header={
                <DetailInfoHeader
                  title={quote ? (client?.company_name || quote.client_name) : "Cargando..."}
                  subtitle={client?.legal_name && client?.company_name !== client?.legal_name ? client.legal_name : undefined}
                >
                  <div className="flex flex-col gap-2 mt-2">
                    {client?.tax_id && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">CIF:</span>
                        <span className="font-medium">{client.tax_id}</span>
                      </div>
                    )}
                    {client?.contact_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{client.contact_email}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Estado del Presupuesto */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground uppercase font-medium">Estado del Presupuesto</span>
                      <StatusSelector
                        currentStatus={quote?.status || "DRAFT"}
                        statusOptions={QUOTE_STATUSES.map(status => ({
                          value: status.value,
                          label: status.label,
                          className: status.className,
                          color: status.color,
                        }))}
                        onStatusChange={(newStatus) => {
                          if (quote && newStatus !== quote.status) {
                            handleStatusChange(newStatus);
                          }
                        }}
                        size="md"
                      />
                    </div>
                  </div>
                </DetailInfoHeader>
              }
              summary={
                <DetailInfoSummary columns={2}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <FolderOpen className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                         <p className="text-xs text-muted-foreground mb-1">Proyecto</p>
                        <p className="text-sm font-medium">
                          {project?.project_name || quote?.project_name || "Sin proyecto asignado"}
                          {quote?.site_name ? ` — ${quote.site_name}` : ""}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Creador del Presupuesto</p>
                        <p className="text-sm font-medium">
                          {quote?.created_by_name || "Usuario"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Fecha de Emisión</p>
                        <p className="text-sm font-medium">
                          {quote ? formatDate(quote.issue_date || quote.created_at) : "N/A"}
                        </p>
                      </div>
                    </div>
                    
                    {quote?.valid_until && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Válido hasta</p>
                          <p className={`text-sm font-medium ${quote.status === 'EXPIRED' ? 'text-amber-500' : ''}`}>
                            {formatDate(quote.valid_until)}
                            {quote.status === 'EXPIRED' && ' (Vencido)'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </DetailInfoSummary>
              }
              content={
                <div className="flex flex-col gap-3">
                  <MetricCard
                    title="Subtotal"
                    value={formatCurrency(quote?.subtotal || 0)}
                    icon={FileText}
                  />
                  <MetricCard
                    title="Impuestos"
                    value={formatCurrency(quote?.tax_amount || 0)}
                    icon={Receipt}
                  />
                  <MetricCard
                    title="Total"
                    value={formatCurrency(quote?.total || 0)}
                    icon={Building2}
                  />
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetailPageDesktop;
