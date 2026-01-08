import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Loader2, Edit, Send, Check, X, FileText, Building2, User, FolderOpen } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import NexoHeader from "./components/NexoHeader";
import QuotePDFViewer from "./components/QuotePDFViewer";

interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string;
  project_name: string | null;
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

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  project_address: string | null;
  project_city: string | null;
  local_name: string | null;
}

const QUOTE_STATUSES = [
  { value: "DRAFT", label: "Borrador", className: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
  { value: "SENT", label: "Enviado", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "APPROVED", label: "Aprobado", className: "bg-green-500/20 text-green-300 border-green-500/30" },
  { value: "REJECTED", label: "Rechazado", className: "bg-red-500/20 text-red-300 border-red-500/30" },
  { value: "EXPIRED", label: "Expirado", className: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  { value: "INVOICED", label: "Facturado", className: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
];

const getStatusInfo = (status: string) => {
  return QUOTE_STATUSES.find(s => s.value === status) || QUOTE_STATUSES[0];
};

const QuoteDetailPage = () => {
  const navigate = useNavigate();
  const { userId, quoteId } = useParams<{ userId: string; quoteId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [project, setProject] = useState<Project | null>(null);

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

      // Fetch company settings
      const { data: companyData, error: companyError } = await supabase.rpc("get_company_settings");
      if (!companyError && companyData && companyData.length > 0) {
        setCompany(companyData[0]);
      }

      // Fetch project if linked
      // For now we'll use the project_name from quote, but could add project lookup later
      
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <NexoHeader title="Presupuesto" userId={userId || ""} />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-black">
        <NexoHeader title="Presupuesto" userId={userId || ""} />
        <div className="flex flex-col items-center justify-center pt-32">
          <FileText className="h-16 w-16 text-white/20 mb-4" />
          <p className="text-white/60">Presupuesto no encontrado</p>
          <Button
            variant="link"
            onClick={() => navigate(`/nexo-av/${userId}/quotes`)}
            className="text-orange-500 mt-2"
          >
            Volver a presupuestos
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(quote.status);
  const pdfFileName = `${quote.quote_number}${quote.project_name ? ` - ${quote.project_name}` : ''}.pdf`;

  return (
    <div className="min-h-screen bg-black pb-mobile-nav">
      <NexoHeader title={quote.quote_number} userId={userId || ""} />

      <main className="container mx-auto px-3 md:px-4 pt-20 md:pt-24 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/nexo-av/${userId}/quotes`)}
                className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 md:h-10 md:w-10"
              >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base md:text-2xl font-bold text-white font-mono">
                    {quote.quote_number}
                  </h1>
                  <Badge className={`${statusInfo.className} text-[10px] md:text-xs`}>
                    {statusInfo.label}
                  </Badge>
                </div>
                <p className="text-white/60 text-[10px] md:text-sm">
                  {quote.client_name}
                  {quote.project_name && ` · ${quote.project_name}`}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(`/nexo-av/${userId}/quotes/${quoteId}/edit`)}
                className="border-white/20 text-white hover:bg-white/10 h-8 w-8 md:h-10 md:w-10"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
            <div className="bg-white/5 rounded-lg border border-white/10 p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
                <span className="text-white/50 text-[10px] md:text-xs">Cliente</span>
              </div>
              <p className="text-white text-xs md:text-sm font-medium truncate">
                {quote.client_name}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg border border-white/10 p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                <span className="text-white/50 text-[10px] md:text-xs">Proyecto</span>
              </div>
              <p className="text-white text-xs md:text-sm font-medium truncate">
                {quote.project_name || "Sin proyecto"}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg border border-white/10 p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-3 w-3 md:h-4 md:w-4 text-purple-500" />
                <span className="text-white/50 text-[10px] md:text-xs">Creado por</span>
              </div>
              <p className="text-white text-xs md:text-sm font-medium truncate">
                {quote.created_by_name || "Usuario"}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg border border-white/10 p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                <span className="text-white/50 text-[10px] md:text-xs">Total</span>
              </div>
              <p className="text-white text-sm md:text-lg font-bold">
                {formatCurrency(quote.total)}
              </p>
            </div>
          </div>

          {/* PDF Preview */}
          <div className="bg-white/5 rounded-lg md:rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-white/10">
              <span className="text-white/60 text-xs md:text-sm font-medium">Vista previa del documento</span>
              <span className="text-white/40 text-[10px] md:text-xs">{pdfFileName}</span>
            </div>
            
            <QuotePDFViewer
              quote={quote}
              lines={lines}
              client={client}
              company={company}
              fileName={pdfFileName}
            />
          </div>

          {/* Dates info */}
          <div className="flex items-center justify-between mt-4 text-white/40 text-[10px] md:text-xs">
            <span>Creado: {formatDate(quote.created_at)}</span>
            {quote.valid_until && (
              <span>Válido hasta: {formatDate(quote.valid_until)}</span>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default QuoteDetailPage;
