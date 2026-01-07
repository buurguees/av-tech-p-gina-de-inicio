import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Receipt, Download, Eye, Send } from "lucide-react";
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

interface ClientInvoicesTabProps {
  clientId: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  project_name: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

const INVOICE_STATUSES = [
  { value: 'DRAFT', label: 'Borrador', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { value: 'SENT', label: 'Enviada', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'VIEWED', label: 'Vista', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'PARTIAL', label: 'Pago Parcial', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'PAID', label: 'Pagada', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'OVERDUE', label: 'Vencida', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'CANCELLED', label: 'Cancelada', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const getStatusInfo = (status: string) => {
  return INVOICE_STATUSES.find(s => s.value === status) || INVOICE_STATUSES[0];
};

const ClientInvoicesTab = ({ clientId }: ClientInvoicesTabProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch invoices from database when invoices table exists
    setLoading(false);
  }, [clientId]);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex justify-end">
        <Button className="bg-white text-black hover:bg-white/90">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Factura
        </Button>
      </div>

      {/* Invoices Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/10 overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Nº Factura</TableHead>
              <TableHead className="text-white/60">Proyecto</TableHead>
              <TableHead className="text-white/60">Estado</TableHead>
              <TableHead className="text-white/60 text-right">Subtotal</TableHead>
              <TableHead className="text-white/60 text-right">Total</TableHead>
              <TableHead className="text-white/60">Vencimiento</TableHead>
              <TableHead className="text-white/60">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={7} className="text-center py-12">
                  <Receipt className="h-12 w-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">No hay facturas para este cliente</p>
                  <Button
                    variant="link"
                    className="text-white/60 hover:text-white mt-2"
                  >
                    Crear la primera factura
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => {
                const statusInfo = getStatusInfo(invoice.status);
                const isOverdue = invoice.due_date && 
                  new Date(invoice.due_date) < new Date() && 
                  invoice.status !== 'PAID';
                
                return (
                  <TableRow 
                    key={invoice.id} 
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell className="text-white font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {invoice.project_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`${isOverdue && invoice.status !== 'PAID' 
                          ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                          : statusInfo.color} border`}
                      >
                        {isOverdue && invoice.status !== 'PAID' ? 'Vencida' : statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-white/60">
                      {formatCurrency(invoice.subtotal)}
                    </TableCell>
                    <TableCell className="text-right text-white font-medium">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell className={`text-sm ${isOverdue ? 'text-red-400' : 'text-white/60'}`}>
                      {invoice.due_date 
                        ? new Date(invoice.due_date).toLocaleDateString('es-ES')
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
                        {invoice.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
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
