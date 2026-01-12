/**
 * QuoteDetailPageMobile
 * 
 * Versión optimizada para móviles de la página de detalle de presupuesto.
 * Diseñada para comerciales con visualización rápida del PDF y cambios de estado.
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Mail
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import NexoHeaderMobile from "../components/mobile/NexoHeaderMobile";
import QuotePDFViewer from "../components/QuotePDFViewer";
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
  const [client, setClient] = useState<Client | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showPDF, setShowPDF] = useState(false);

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

      // Fetch client details
      if (quoteInfo.client_id) {
        const { data: clientData, error: clientError } = await supabase.rpc("get_client", {
          p_client_id: quoteInfo.client_id,
        });
        if (!clientError && clientData && clientData.length > 0) {
          setClient(clientData[0]);
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse">
          <NexoLogo />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <FileText className="h-16 w-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Presupuesto no encontrado</h2>
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
    <div className="min-h-screen bg-black pb-mobile-nav">
      <NexoHeaderMobile 
        title={`Presupuesto ${quote.quote_number}`}
        subtitle={quote.client_name}
        userId={userId || ""} 
        backTo={`/nexo-av/${userId}/quotes`}
      />

      <main className="px-3 py-3 space-y-3">
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

        {/* PDF Viewer - Temporarily disabled, requires full data fetch */}
        {showPDF && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl overflow-hidden border border-white/10 p-4 bg-white/5"
          >
            <p className="text-white/60 text-sm text-center">
              Vista previa no disponible en móvil. Usa la versión de escritorio para ver el PDF completo.
            </p>
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

              {/* Notas */}
              {quote.notes && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-white/60 text-xs mb-1">Notas</p>
                  <p className="text-white/80 text-sm">{quote.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default QuoteDetailPageMobile;
