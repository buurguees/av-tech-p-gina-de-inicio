import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Receipt, Download, Eye, Loader2 } from "lucide-react";
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
import { getFinanceStatusInfo } from "@/constants/financeStatuses";

interface ClientInvoicesTabProps {
  clientId: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  preliminary_number: string;
  client_id: string;
  project_id?: string | null;
  project_number: string | null;
  project_name: string | null;
  client_order_number: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  due_date: string | null;
  issue_date: string | null;
  created_at: string;
}

const ClientInvoicesTab = ({ clientId }: ClientInvoicesTabProps) => {
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
        const clientInvoices = (data || []).filter((inv: any) => inv.client_id === clientId);
        setInvoices(clientInvoices as Invoice[]);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [clientId]);

  const handleCreateInvoice = () => {
    navigate(`/nexo-av/${userId}/invoices/new?clientId=${clientId}`);
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={handleCreateInvoice}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Factura
        </Button>
      </div>

      {/* Invoices Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border overflow-hidden bg-card"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Nº Factura</TableHead>
              <TableHead className="text-muted-foreground">Nº Proyecto</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-muted-foreground text-right">Subtotal</TableHead>
              <TableHead className="text-muted-foreground text-right">Total</TableHead>
              <TableHead className="text-muted-foreground">Vencimiento</TableHead>
              <TableHead className="text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="text-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No hay facturas para este cliente</p>
                  <Button
                    variant="link"
                    className="text-primary mt-2"
                    onClick={handleCreateInvoice}
                  >
                    Crear la primera factura
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => {
                const statusInfo = getFinanceStatusInfo(invoice.status);
                const displayNumber = invoice.invoice_number || invoice.preliminary_number;
                const isOverdue = invoice.due_date && 
                  new Date(invoice.due_date) < new Date() && 
                  invoice.status !== 'PAID' &&
                  invoice.status !== 'CANCELLED';
                const isDraft = invoice.status === 'DRAFT';
                
                return (
                  <TableRow 
                    key={invoice.id} 
                    className="border-border hover:bg-accent cursor-pointer"
                    onClick={() => handleInvoiceClick(invoice.id)}
                  >
                    <TableCell className="text-foreground font-medium font-mono">
                      <span className={isDraft ? 'text-muted-foreground' : ''}>
                        {displayNumber}
                      </span>
                      {isDraft && <span className="ml-1 text-[10px] text-amber-600">(Borr.)</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono">
                      {invoice.project_number || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={isOverdue ? 'status-error' : statusInfo.className}
                      >
                        {isOverdue ? 'Vencida' : statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(invoice.subtotal)}
                    </TableCell>
                    <TableCell className="text-right text-foreground font-medium">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell className={`text-sm ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {invoice.due_date 
                        ? new Date(invoice.due_date).toLocaleDateString('es-ES')
                        : '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleInvoiceClick(invoice.id)}
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

export default ClientInvoicesTab;
