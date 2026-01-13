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
import { getStatusInfo } from "@/constants/quoteStatuses";

interface ClientQuotesTabProps {
  clientId: string;
}

interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  project_id?: string | null;
  project_name: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  created_at: string;
}

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
          p_search: null
        });

        if (error) throw error;
        const clientQuotes = (data || []).filter((q: any) => q.client_id === clientId);
        setQuotes(clientQuotes as Quote[]);
      } catch (error) {
        console.error('Error fetching quotes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [clientId]);

  const handleCreateQuote = () => {
    navigate(`/nexo-av/${userId}/quotes/new?clientId=${clientId}`);
  };

  const handleQuoteClick = (quoteId: string) => {
    navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={handleCreateQuote}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Quotes Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border overflow-hidden bg-card"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Nº Presupuesto</TableHead>
              <TableHead className="text-muted-foreground">Proyecto</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-muted-foreground text-right">Subtotal</TableHead>
              <TableHead className="text-muted-foreground text-right">Total</TableHead>
              <TableHead className="text-muted-foreground">Validez</TableHead>
              <TableHead className="text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No hay presupuestos para este cliente</p>
                  <Button
                    variant="link"
                    className="text-primary mt-2"
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
                    className="border-border hover:bg-accent cursor-pointer"
                    onClick={() => handleQuoteClick(quote.id)}
                  >
                    <TableCell className="text-foreground font-medium font-mono">
                      {quote.quote_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {quote.project_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusInfo.className}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(quote.subtotal)}
                    </TableCell>
                    <TableCell className="text-right text-foreground font-medium">
                      {formatCurrency(quote.total)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {quote.valid_until 
                        ? new Date(quote.valid_until).toLocaleDateString('es-ES')
                        : '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuoteClick(quote.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
