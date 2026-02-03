import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  TrendingDown,
  Loader2,
  Eye,
  Edit,
  Calendar,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PendingInvoice {
  id: string;
  invoice_number: string;
  document_type: string;
  issue_date: string;
  provider_name: string | null;
  provider_id: string | null;
  file_path: string | null;
  file_name: string | null;
  project_name: string | null;
  total: number;
  created_at: string;
}

interface PendingReviewSectionProps {
  onComplete?: (invoiceId: string) => void;
}

const PendingReviewSection = ({ onComplete }: PendingReviewSectionProps) => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPendingInvoices();
  }, []);

  const fetchPendingInvoices = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        p_search: null,
        p_status: 'PENDING',
        p_supplier_id: null,
        p_technician_id: null,
        p_document_type: null,
        p_page: 1,
        p_page_size: 5000,
      };
      const { data, error } = await supabase.rpc("list_purchase_invoices", params);
      if (error) throw error;
      setPendingInvoices((data || []) as unknown as PendingInvoice[]);

      // Obtener thumbnails para documentos con file_path
      const urls: Record<string, string> = {};
      for (const invoice of (data || [])) {
        if (invoice.file_path) {
          try {
            const path = invoice.file_path.trim().replace(/^\//, '');
            if (!path) continue;
            
            // Determinar el bucket correcto basado en la ruta
            // Los documentos del escáner (mobile y desktop) se suben a purchase-documents con ruta .../scanner/...
            const bucketName = 'purchase-documents';
            
            const { data: urlData, error } = await supabase.storage
              .from(bucketName)
              .createSignedUrl(path, 3600);
            if (!error && urlData?.signedUrl) {
              urls[invoice.id] = urlData.signedUrl;
            }
          } catch (err) {
            console.error("Error getting thumbnail for", invoice.id, err);
          }
        }
      }
      setThumbnailUrls(urls);
    } catch (error: any) {
      console.error("Error fetching pending invoices:", error);
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

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const handleComplete = (invoiceId: string) => {
    if (onComplete) {
      onComplete(invoiceId);
    } else {
      navigate(`/nexo-av/${userId}/purchase-invoices/${invoiceId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (pendingInvoices.length === 0) {
    return null;
  }

  // Desktop version - Grid layout
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Pendientes de Revisar</h2>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            {pendingInvoices.length}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingInvoices.map((inv) => (
          <Card
            key={inv.id}
            className="cursor-pointer hover:border-blue-500/40 transition-all border-blue-500/20 bg-blue-500/5"
            onClick={() => handleComplete(inv.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                {thumbnailUrls[inv.id] ? (
                  <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted shrink-0 border border-border relative">
                    {inv.file_name?.toLowerCase().endsWith('.pdf') ? (
                      <div className="absolute inset-0 overflow-hidden">
                        <iframe
                          src={`${thumbnailUrls[inv.id]}#toolbar=0&navpanes=0&scrollbar=0&zoom=50`}
                          className="pointer-events-none"
                          title="PDF Preview"
                          style={{ 
                            width: '200%', 
                            height: '200%', 
                            transform: 'scale(0.5)',
                            transformOrigin: 'top left',
                            border: 'none'
                          }}
                        />
                      </div>
                    ) : (
                      <img
                        src={thumbnailUrls[inv.id]}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {inv.document_type === 'INVOICE' ? (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">{inv.invoice_number}</span>
                    <Badge className="bg-blue-500/20 text-blue-400 text-[9px] px-1.5 py-0 border-none">
                      Pendiente
                    </Badge>
                  </div>
                  {!inv.provider_name && (
                    <p className="text-xs text-muted-foreground mb-1">⚠️ Sin proveedor asignado</p>
                  )}
                  {inv.provider_name && (
                    <p className="text-xs text-muted-foreground truncate">{inv.provider_name}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(inv.issue_date)}
                  </div>
                  {inv.total > 0 && (
                    <span className="font-semibold">{formatCurrency(inv.total)}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="w-full h-8 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleComplete(inv.id);
                  }}
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Completar Datos
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PendingReviewSection;
