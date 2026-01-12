import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, FileText, Download, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface ClientQuotesTabProps {
  clientId: string;
}

interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  project_name: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  created_at: string;
}

const QUOTE_STATUSES = [
  { value: 'DRAFT', label: 'Borrador', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { value: 'SENT', label: 'Enviado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'VIEWED', label: 'Visto', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'ACCEPTED', label: 'Aceptado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'REJECTED', label: 'Rechazado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'EXPIRED', label: 'Expirado', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
];

const getStatusInfo = (status: string) => {
  return QUOTE_STATUSES.find(s => s.value === status) || QUOTE_STATUSES[0];
};

const ClientQuotesTab = ({ clientId }: ClientQuotesTabProps) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('list_quotes', {
          p_search: null,
          p_status: null
        });

        if (error) throw error;
        // Filter quotes by client_id
        const clientQuotes = (data || []).filter((q: any) => q.client_id === clientId);
        setQuotes(clientQuotes);
      } catch (error) {
        console.error('Error fetching quotes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [clientId]);

  const handleCreateQuote = () => {
    // Navigate to create quote page with client context
    navigate(`/nexo-av/${userId}/quotes/new?clientId=${clientId}`);
  };

  const handleQuoteClick = (quoteId: string) => {
    navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-end">
        <Button 
          className="bg-white text-black hover:bg-white/90"
          onClick={handleCreateQuote}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Quotes Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/10 overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Nº Presupuesto</TableHead>
              <TableHead className="text-white/60">Proyecto</TableHead>
              <TableHead className="text-white/60">Estado</TableHead>
              <TableHead className="text-white/60 text-right">Subtotal</TableHead>
              <TableHead className="text-white/60 text-right">Total</TableHead>
              <TableHead className="text-white/60">Validez</TableHead>
              <TableHead className="text-white/60">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={7} className="text-center py-12">
                  <FileText className="h-12 w-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">No hay presupuestos para este cliente</p>
                  <Button
                    variant="link"
                    className="text-white/60 hover:text-white mt-2"
                    onClick={handleCreateQuote}
                  >
                    Crear el primer presupuesto
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => {
                const statusInfo = getStatusInfo(quote.status);
                return (
                  <TableRow 
                    key={quote.id} 
                    className="border-white/10 hover:bg-white/5 cursor-pointer"
                    onClick={() => handleQuoteClick(quote.id)}
                  >
                    <TableCell className="text-white font-medium">
                      {quote.quote_number}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {quote.project_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${statusInfo.color} border`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-white/60">
                      {formatCurrency(quote.subtotal)}
                    </TableCell>
                    <TableCell className="text-right text-white font-medium">
                      {formatCurrency(quote.total)}
                    </TableCell>
                    <TableCell className="text-white/60 text-sm">
                      {quote.valid_until 
                        ? new Date(quote.valid_until).toLocaleDateString('es-ES')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
};

export default ClientQuotesTab;
