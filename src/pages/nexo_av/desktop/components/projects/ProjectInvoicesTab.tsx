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
import { Plus, FileText, Loader2, Info } from "lucide-react";
import { getFinanceStatusInfo } from "@/constants/financeStatuses";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  invoice_number: string;
  preliminary_number: string;
  client_id: string;
  project_id?: string | null;
  project_name: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  due_date: string | null;
  issue_date: string | null;
  created_at: string;
}

interface ProjectInvoicesTabProps {
  projectId: string;
  clientId?: string;
}

const ProjectInvoicesTab = ({ projectId, clientId }: ProjectInvoicesTabProps) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        // Usar RPC para listar facturas, filtrando por project_id
        const { data, error } = await supabase.rpc('finance_list_invoices', {
          p_search: null,
          p_status: null
        });

        if (error) throw error;
        const allInvoices = data || [];

        // Filtrar facturas por project_id (vinculación directa)
        const projectInvoices = allInvoices.filter((inv: any) => inv.project_id === projectId);

        setInvoices(projectInvoices as Invoice[]);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [projectId]);

  const handleCreateInvoice = () => {
    // Navigate to create invoice page with project and client context
    const params = new URLSearchParams();
    params.set('projectId', projectId);
    if (clientId) params.set('clientId', clientId);
    navigate(`/nexo-av/${userId}/invoices/new?${params.toString()}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header - Estilo Holded */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Facturas</h1>
            <Info className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCreateInvoice}
              className="h-9 px-2 text-[10px] font-medium"
            >
              <Plus className="h-3 w-3 mr-1.5" />
              Nueva Factura
              <span className="ml-2 text-[9px] px-1.5 py-0.5 opacity-70">N</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Table - Siempre muestra cabeceras */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/30">
                <TableHead className="text-white/70 text-[10px] px-2 text-left">Nº Factura</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-left">Nombre</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-center">Estado</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-right">Total</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-left">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground text-sm">No hay facturas</p>
                      <p className="text-muted-foreground/70 text-[10px] mt-1">
                        Crea la primera factura para este proyecto
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => {
                  const statusInfo = getFinanceStatusInfo(invoice.status);
                  const displayNumber = invoice.invoice_number || invoice.preliminary_number;
                  return (
                    <TableRow
                      key={invoice.id}
                      className="border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors duration-200"
                      onClick={() => navigate(`/nexo-av/${userId}/invoices/${invoice.id}`)}
                    >
                      <TableCell className="font-mono text-white/70 text-[13px] font-semibold px-2">
                        {displayNumber}
                      </TableCell>
                      <TableCell className="text-white font-medium text-[10px] px-2">
                        {invoice.project_name || '-'}
                      </TableCell>
                      <TableCell className="px-2 text-center">
                        <div className="flex justify-center">
                          <Badge variant="outline" className={cn(statusInfo.color || "bg-gray-500/20 text-gray-400 border-gray-500/30", "border text-[9px] px-1.5 py-0.5 w-20 justify-center")}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-white font-medium text-[10px] px-2 text-right">
                        {formatCurrency(invoice.total || 0)}
                      </TableCell>
                      <TableCell className="text-white/60 text-[9px] px-2">
                        {invoice.issue_date 
                          ? new Date(invoice.issue_date).toLocaleDateString('es-ES')
                          : new Date(invoice.created_at).toLocaleDateString('es-ES')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ProjectInvoicesTab;
