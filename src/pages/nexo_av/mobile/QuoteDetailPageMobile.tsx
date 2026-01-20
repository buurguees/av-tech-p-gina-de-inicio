/**
 * QuoteDetailPageMobile
 * 
 * Versión optimizada para móviles de la página de detalle de presupuesto.
 * Diseñada para comerciales con visualización rápida del PDF y cambios de estado.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Building2,
  User,
  FolderOpen,
  Calendar,
  FileText,
  Lock,
  ExternalLink,
  Phone,
  Mail,
  Save,
  Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { QuotePDFDocument } from "../components/QuotePDFViewer";
import { PDFViewer, PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import MobileBottomNav from "../components/MobileBottomNav";
import { QUOTE_STATUSES, getStatusInfo } from "@/constants/quoteStatuses";
import { NexoLogo } from "../components/NexoHeader";

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

interface Client {
  id: string;
  company_name: string;
  legal_name: string | null;
  tax_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_province: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
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

interface Project {
  id: string;
  name: string;
  description: string | null;
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
      return ["APPROVED"];
    case "REJECTED":
      return ["REJECTED"];
    case "EXPIRED":
      return ["EXPIRED"];
    case "INVOICED":
      return ["INVOICED"];
    default:
      return [currentStatus];
  }
};

const QuoteDetailPageMobile = () => {
  const navigate = useNavigate();
  const { userId, quoteId } = useParams<{ userId: string; quoteId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [savedNotes, setSavedNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

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
      const { data: linesData } = await supabase.rpc("get_quote_lines", {
        p_quote_id: quoteId,
      });
      if (linesData) {
        const sortedLines = (linesData || []).sort((a: any, b: any) => 
          (a.line_order || 0) - (b.line_order || 0)
        );
        setLines(sortedLines);
      }

      // Fetch client details
      if (quoteInfo.client_id) {
        const { data: clientData, error: clientError } = await supabase.rpc("get_client", {
          p_client_id: quoteInfo.client_id,
        });
        if (!clientError && clientData && clientData.length > 0) {
          setClient(clientData[0]);
        }
      }

      // Fetch company info
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .limit(1)
        .single();
      if (companyData) {
        setCompany(companyData);
      }

      // Fetch project if exists
      if (quoteInfo.project_id) {
        const { data: projectData } = await supabase
          .from("projects")
          .select("id, name, description")
          .eq("id", quoteInfo.project_id)
          .single();
        if (projectData) {
          setProject(projectData);
        }
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
    try {
      setUpdatingStatus(true);

      const { error } = await supabase.rpc("update_quote", {
        p_quote_id: quoteId!,
        p_status: newStatus,
      });

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: "El estado del presupuesto se ha actualizado correctamente",
      });

      await fetchQuoteData();
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

  const handleEdit = () => {
    navigate(`/nexo-av/${userId}/quotes/${quoteId}/edit`);
  };

  const fetchSavedNotes = async () => {
    if (!quoteId) return;
    try {
      setLoadingNotes(true);
      const { data, error } = await supabase.rpc("get_quote_notes", {
        p_quote_id: quoteId,
      });
      if (error) throw error;
      setSavedNotes(data || []);
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
      const { error } = await supabase.rpc("create_quote_note", {
        p_quote_id: quoteId,
        p_content: currentNote.trim(),
      });

      if (error) throw error;

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

  const generatePDFBlob = async () => {
    if (!quote || !client || !company || lines.length === 0) return;

    try {
      const doc = (
        <QuotePDFDocument
          quote={quote}
          lines={lines}
          client={client}
          company={company}
          project={project}
        />
      );
      const asBlob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(asBlob);
      setPdfBlobUrl(url);
    } catch (error) {
      console.error("Error generating PDF blob:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (showPDF && quote && client && company && lines.length > 0 && project !== undefined) {
      generatePDFBlob();
    }
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    };
  }, [showPDF]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <NexoLogo />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Presupuesto no encontrado</h2>
          <Button
            onClick={() => navigate(`/nexo-av/${userId}/quotes`)}
            className="bg-white text-black hover:bg-white/90 mt-4"
          >
            Volver a Presupuestos
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(quote.status);
  const isLocked = LOCKED_STATES.includes(quote.status);
  const availableTransitions = getAvailableStatusTransitions(quote.status);

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <main className="px-3 py-3 space-y-3">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4 bg-white/5">
            <TabsTrigger value="general">Información</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-3 mt-0">
            {/* Estado y Acciones Rápidas */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {/* Estado Actual */}
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/60 text-sm">Estado actual</span>
                    <Badge className={statusInfo.className}>
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {/* Cambiar Estado */}
                  {availableTransitions.length > 1 && (
                    <Select
                      value={quote.status}
                      onValueChange={handleStatusChange}
                      disabled={updatingStatus}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        {QUOTE_STATUSES
                          .filter(s => availableTransitions.includes(s.value))
                          .map((status) => (
                            <SelectItem
                              key={status.value}
                              value={status.value}
                              className="text-white"
                            >
                              {status.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  {isLocked && (
                    <div className="flex items-center gap-2 text-white/40 text-xs mt-2">
                      <Lock className="h-3 w-3" />
                      <span>Este presupuesto está bloqueado</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Botones de Acción */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setShowPDF(!showPDF)}
                  className="bg-white/10 text-white hover:bg-white/20 border border-white/20 h-11"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {showPDF ? "Ocultar PDF" : "Ver PDF"}
                </Button>

                {!isLocked && (
                  <Button
                    onClick={handleEdit}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 h-11"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </motion.div>

            {/* PDF Viewer - Mejorado para móvil */}
            {showPDF && quote && client && company && lines.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl overflow-hidden border border-white/10 bg-white/5"
              >
                <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
                  <span className="text-white/60 text-xs">Vista Previa PDF</span>
                  <div className="flex items-center gap-2">
                    {pdfBlobUrl ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-white/60 hover:text-white gap-1.5"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = pdfBlobUrl;
                          link.download = `Presupuesto-${quote.quote_number}.pdf`;
                          link.click();
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="text-xs">Descargar</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-white/60 gap-1.5"
                        disabled
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-xs">Generando...</span>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="h-[500px] bg-zinc-900">
                  {pdfBlobUrl ? (
                    <iframe
                      src={pdfBlobUrl}
                      className="w-full h-full border-0"
                      title="PDF Preview"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Información del Presupuesto */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base">Información</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {/* Total */}
                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <span className="text-white/60">Total</span>
                    <span className="text-white font-bold text-lg">{formatCurrency(quote.total)}</span>
                  </div>

                  {/* Cliente */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Building2 className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white/60 text-xs mb-0.5">Cliente</p>
                        <p className="text-white font-medium truncate">{quote.client_name}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/nexo-av/${userId}/clients/${quote.client_id}`)}
                      className="shrink-0 h-8 px-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Contacto del Cliente */}
                  {client && (
                    <div className="space-y-2 pl-6">
                      {client.contact_phone && (
                        <a
                          href={`tel:${client.contact_phone}`}
                          className="flex items-center gap-2 text-white/60 active:text-white text-xs"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{client.contact_phone}</span>
                        </a>
                      )}
                      {client.contact_email && (
                        <a
                          href={`mailto:${client.contact_email}`}
                          className="flex items-center gap-2 text-white/60 active:text-white text-xs"
                        >
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{client.contact_email}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Proyecto */}
                  {quote.project_name && (
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-white/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white/60 text-xs mb-0.5">Proyecto</p>
                        <p className="text-white truncate">{quote.project_name}</p>
                      </div>
                    </div>
                  )}

                  {/* Creado por */}
                  {quote.created_by_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-white/40 shrink-0" />
                      <div>
                        <p className="text-white/60 text-xs mb-0.5">Creado por</p>
                        <p className="text-white">{quote.created_by_name}</p>
                      </div>
                    </div>
                  )}

                  {/* Fechas */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-white/60 text-xs mb-0.5">Creado</p>
                        <p className="text-white text-xs">{formatDate(quote.created_at)}</p>
                      </div>
                    </div>
                    {quote.valid_until && (
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-white/60 text-xs mb-0.5">Válido hasta</p>
                          <p className="text-white text-xs">{formatDate(quote.valid_until)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subtotal e Impuestos */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex justify-between text-white/60">
                      <span>Subtotal</span>
                      <span>{formatCurrency(quote.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-white/60">
                      <span>IVA ({quote.tax_rate}%)</span>
                      <span>{formatCurrency(quote.tax_amount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="notes" className="mt-0 space-y-3">
            {/* Editor de Notas - Reducido a la mitad */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-medium text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Nueva Nota
                  </h3>
                </div>
                <Textarea
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  className="h-32 bg-transparent border border-white/10 resize-none focus-visible:ring-1 focus-visible:ring-white/20 p-2 text-sm text-white/80 placeholder:text-white/20"
                  placeholder="Escribe aquí la nota..."
                />
                <Button
                  onClick={handleSaveNote}
                  disabled={!currentNote.trim() || saving}
                  className="w-full mt-2 bg-primary hover:bg-primary/90 text-white h-9"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Nota
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Historial de Notas Guardadas */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Notas Guardadas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {loadingNotes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-white/40" />
                  </div>
                ) : savedNotes.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-4">
                    No hay notas guardadas
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {savedNotes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-white/5 rounded-lg p-3 border border-white/10"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-white/40" />
                            <span className="text-white/60 text-xs">
                              {note.created_by_name || "Usuario"}
                            </span>
                          </div>
                          <span className="text-white/40 text-xs">
                            {new Date(note.created_at).toLocaleString("es-ES", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-white/80 text-sm whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default QuoteDetailPageMobile;
