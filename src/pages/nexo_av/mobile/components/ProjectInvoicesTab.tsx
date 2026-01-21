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
import { getFinanceStatusInfo } from "@/constants/financeStatuses";

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
    const params = new URLSearchParams();
    params.set('projectId', projectId);
    if (clientId) params.set('clientId', clientId);
    navigate(`/nexo-av/${userId}/invoices/new?${params.toString()}`);
  };

  const handleInvoiceClick = (invoiceId: string) => {
    navigate(`/nexo-av/${userId}/invoices/${invoiceId}`);
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
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Facturas del Proyecto</h1>
        <Button
          onClick={handleCreateInvoice}
          className="h-9 px-2 text-[10px]"
        >
          <Plus className="h-3 w-3 mr-1.5" />
          Nueva Factura
          <span className="ml-2 text-[9px] px-1.5 py-0.5 opacity-70">N</span>
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border overflow-hidden shadow-md">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground/70 text-[10px]">No hay facturas para este proyecto</p>
          <Button
            variant="link"
            className="text-muted-foreground hover:text-foreground mt-4"
            onClick={handleCreateInvoice}
          >
            Crear la primera factura
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/30">
                <TableHead className="text-white/70 text-[10px] px-2">Nº Factura</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2">Proyecto</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-center">Estado</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2 text-right">Total</TableHead>
                <TableHead className="text-white/70 text-[10px] px-2">Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const statusInfo = getFinanceStatusInfo(invoice.status);
                const displayNumber = invoice.invoice_number || invoice.preliminary_number;
                return (
                  <TableRow
                    key={invoice.id}
                    className="border-white/10 cursor-pointer hover:bg-white/"
                    onClick={() => handleInvoiceClick(invoice.id)}
                  >
                    <TableCell className="font-mono text-white font-medium text-[10px] px-2">
                      {displayNumber}
                    </TableCell>
                    <TableCell className="text-white font-medium text-[10px] px-2">
                      {invoice.project_name || '-'}
                    </TableCell>
                    <TableCell className="px-2 text-center">
                      <Badge variant="outline" className="border text-[9px] px-1.5 py-0.5">
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-medium text-[10px] px-2 text-right">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell className="text-white/60 text-[9px] px-2">
                      {invoice.due_date 
                        ? new Date(invoice.due_date).toLocaleDateString('es-ES')
                        : '-'}
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

export default ProjectInvoicesTab;
