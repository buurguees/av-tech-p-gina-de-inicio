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
  project_name: string;
  status: string;
  total: number;
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
        const { data, error } = await supabase.rpc('list_quotes', {
          p_search: null
        });

        if (error) throw error;
        // Filter quotes by project_id
        const projectQuotes = (data || []).filter((q: any) => q.project_id === projectId);
        setQuotes(projectQuotes);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Presupuestos del Proyecto</h3>
        <Button
          onClick={handleCreateQuote}
          className="bg-white text-black hover:bg-white/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Presupuesto
        </Button>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <FileText className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 mb-4">No hay presupuestos para este proyecto</p>
          <Button
            variant="link"
            className="text-white/60 hover:text-white"
            onClick={handleCreateQuote}
          >
            Crear el primer presupuesto
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Nº Presupuesto</TableHead>
                <TableHead className="text-white/60">Nombre</TableHead>
                <TableHead className="text-white/60">Estado</TableHead>
                <TableHead className="text-white/60 text-right">Total</TableHead>
                <TableHead className="text-white/60">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => {
                const statusInfo = getStatusInfo(quote.status);
                return (
                  <TableRow
                    key={quote.id}
                    className="border-white/10 hover:bg-white/5 cursor-pointer"
                    onClick={() => navigate(`/nexo-av/${userId}/quotes/${quote.id}`)}
                  >
                    <TableCell className="font-mono text-white">
                      {quote.quote_number}
                    </TableCell>
                    <TableCell className="text-white">
                      {quote.project_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${statusInfo.className} border`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {quote.total?.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      }) || '-'}
                    </TableCell>
                    <TableCell className="text-white/60">
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