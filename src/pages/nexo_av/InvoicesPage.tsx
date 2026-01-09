import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Loader2, FileText, Building2, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import NexoHeader from "./components/NexoHeader";

interface Invoice {
  id: string;
  invoice_number: string;
  source_quote_id: string | null;
  source_quote_number: string | null;
  client_id: string;
  client_name: string;
  project_id: string | null;
  project_name: string | null;
  status: string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

const INVOICE_STATUSES = [
  { value: "all", label: "Todos los estados" },
  { value: "DRAFT", label: "Borrador", className: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
  { value: "SENT", label: "Enviada", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "PAID", label: "Pagada", className: "bg-green-500/20 text-green-300 border-green-500/30" },
  { value: "OVERDUE", label: "Vencida", className: "bg-red-500/20 text-red-300 border-red-500/30" },
  { value: "CANCELLED", label: "Cancelada", className: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
];

const getStatusInfo = (status: string) => {
  return INVOICE_STATUSES.find(s => s.value === status) || INVOICE_STATUSES[1];
};

const InvoicesPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchInvoices();
  }, [searchTerm, statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_invoices", {
        p_search: searchTerm || null,
        p_status: statusFilter === "all" ? null : statusFilter,
      });
      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las facturas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black pb-mobile-nav">
      <NexoHeader title="Facturas" userId={userId || ""} />

      <main className="container mx-auto px-3 md:px-4 pt-20 md:pt-24 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Facturas</h1>
              <p className="text-white/60 text-sm">Gestiona todas las facturas</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Buscar facturas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                {INVOICE_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value} className="text-white">
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-white/20 mb-4" />
              <p className="text-white/60">No hay facturas</p>
              <p className="text-white/40 text-sm mt-1">
                Las facturas se generan desde presupuestos aprobados
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60">Número</TableHead>
                      <TableHead className="text-white/60">Cliente</TableHead>
                      <TableHead className="text-white/60">Proyecto</TableHead>
                      <TableHead className="text-white/60">Emisión</TableHead>
                      <TableHead className="text-white/60">Vencimiento</TableHead>
                      <TableHead className="text-white/60">Estado</TableHead>
                      <TableHead className="text-white/60 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const statusInfo = getStatusInfo(invoice.status);
                      return (
                        <TableRow
                          key={invoice.id}
                          className="border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
                          onClick={() => navigate(`/nexo-av/${userId}/invoices/${invoice.id}`)}
                        >
                          <TableCell className="font-mono text-white font-medium">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell className="text-white">
                            {invoice.client_name}
                          </TableCell>
                          <TableCell className="text-white/60">
                            {invoice.project_name || "-"}
                          </TableCell>
                          <TableCell className="text-white/60">
                            {formatDate(invoice.issue_date)}
                          </TableCell>
                          <TableCell className="text-white/60">
                            {invoice.due_date ? formatDate(invoice.due_date) : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusInfo.className}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-white font-medium">
                            {formatCurrency(invoice.total)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {invoices.map((invoice) => {
                  const statusInfo = getStatusInfo(invoice.status);
                  return (
                    <div
                      key={invoice.id}
                      onClick={() => navigate(`/nexo-av/${userId}/invoices/${invoice.id}`)}
                      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-white font-mono font-bold">{invoice.invoice_number}</p>
                          <p className="text-white/60 text-sm">{invoice.client_name}</p>
                        </div>
                        <Badge className={`${statusInfo.className} text-xs`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-white/50">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(invoice.issue_date)}</span>
                        </div>
                        <span className="text-white font-bold">{formatCurrency(invoice.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default InvoicesPage;
