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
        <h3 className="text-lg font-semibold text-white">Facturas del Proyecto</h3>
        <Button
          onClick={handleCreateInvoice}
          className="bg-white text-black hover:bg-white/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Factura
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <FileText className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 mb-4">No hay facturas para este proyecto</p>
          <Button
            variant="link"
            className="text-white/60 hover:text-white"
            onClick={handleCreateInvoice}
          >
            Crear la primera factura
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Nº Factura</TableHead>
                <TableHead className="text-white/60">Proyecto</TableHead>
                <TableHead className="text-white/60">Estado</TableHead>
                <TableHead className="text-white/60 text-right">Total</TableHead>
                <TableHead className="text-white/60">Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const statusInfo = getFinanceStatusInfo(invoice.status);
                const displayNumber = invoice.invoice_number || invoice.preliminary_number;
                return (
                  <TableRow
                    key={invoice.id}
                    className="border-white/10 hover:bg-white/5 cursor-pointer"
                    onClick={() => handleInvoiceClick(invoice.id)}
                  >
                    <TableCell className="font-mono text-white">
                      {displayNumber}
                    </TableCell>
                    <TableCell className="text-white">
                      {invoice.project_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${statusInfo.className} border`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell className="text-white/60">
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
