import { useState, useEffect } from "react";
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

interface Invoice {
  id: string;
  invoice_number: string;
  description: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
}

interface ProjectInvoicesTabProps {
  projectId: string;
}

const INVOICE_STATUSES = [
  { value: 'DRAFT', label: 'Borrador', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { value: 'SENT', label: 'Enviada', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'PAID', label: 'Pagada', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'OVERDUE', label: 'Vencida', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'CANCELLED', label: 'Cancelada', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
];

const getStatusInfo = (status: string) => {
  return INVOICE_STATUSES.find(s => s.value === status) || INVOICE_STATUSES[0];
};

const ProjectInvoicesTab = ({ projectId }: ProjectInvoicesTabProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch invoices from database when table is created
    setLoading(false);
    setInvoices([]);
  }, [projectId]);

  const handleCreateInvoice = () => {
    // TODO: Open create invoice dialog
    console.log('Create invoice for project:', projectId);
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
                <TableHead className="text-white/60">Descripción</TableHead>
                <TableHead className="text-white/60">Estado</TableHead>
                <TableHead className="text-white/60 text-right">Importe</TableHead>
                <TableHead className="text-white/60">Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const statusInfo = getStatusInfo(invoice.status);
                return (
                  <TableRow
                    key={invoice.id}
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell className="font-mono text-white">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="text-white">
                      {invoice.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${statusInfo.color} border`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {invoice.amount?.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {new Date(invoice.due_date).toLocaleDateString('es-ES')}
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