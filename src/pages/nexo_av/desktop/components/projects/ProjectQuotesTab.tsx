import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, FileText, Loader2 } from "lucide-react";
import { getStatusInfo } from "@/constants/quoteStatuses";

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

interface ProjectQuotesTabProps {
  projectId: string;
  clientId?: string;
}

const ProjectQuotesTab = ({ projectId, clientId }: ProjectQuotesTabProps) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        setLoading(true);
        // Usar RPC específica para listar quotes del proyecto
        const { data, error } = await supabase.rpc('list_project_quotes', {
          p_project_id: projectId
        } as any);

        if (error) throw error;
        setQuotes((data || []) as Quote[]);
      } catch (error) {
        console.error('Error fetching quotes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [projectId]);

  const handleCreateQuote = () => {
    // Navigate to create quote page with project and client context
    const params = new URLSearchParams();
    params.set('projectId', projectId);
    if (clientId) params.set('clientId', clientId);
    navigate(`/nexo-av/${userId}/quotes/new?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Presupuestos del Proyecto</h1>
        <Button
          onClick={handleCreateQuote}
          className="h-9 px-2 text-[10px]"
        >
          <Plus className="h-3 w-3 mr-1.5" />
          Nuevo Presupuesto
          <span className="ml-2 text-[9px] px-1.5 py-0.5 opacity-70">N</span>
        </Button>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border overflow-hidden shadow-md">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground/70 text-[10px]">No hay presupuestos para este proyecto</p>
          <Button
            variant="link"
            className="text-muted-foreground hover:text-foreground mt-4"
            onClick={handleCreateQuote}
          >
            Crear el primer presupuesto
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/30">
                <TableHead className="text-white/70 text-[10px] px-2">Nº Presupuesto</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2">Nombre</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-center">Estado</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-right">Total</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => {
                const statusInfo = getStatusInfo(quote.status);
                return (
                  <TableRow
                    key={quote.id}
                    className="border-white/10 cursor-pointer hover:bg-white/"
                    onClick={() => navigate(`/nexo-av/${userId}/quotes/${quote.id}`)}
                  >
                    <TableCell className="font-mono text-white font-medium text-[10px] px-2">
                      {quote.quote_number}
                    </TableCell>
                    <TableCell className="text-white font-medium text-[10px] px-2">
                      {quote.project_name || '-'}
                    </TableCell>
                    <TableCell className="px-2 text-center">
                      <Badge variant="outline" className="border text-[9px] px-1.5 py-0.5">
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-medium text-[10px] px-2 text-right">
                      {formatCurrency(quote.total || 0)}
                    </TableCell>
                    <TableCell className="text-white/60 text-[9px] px-2">
                      {new Date(quote.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ProjectQuotesTab;