import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import NexoHeader from "./components/NexoHeader";
import QuickQuoteDialog from "./components/QuickQuoteDialog";

interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  client_name: string | null;
  project_name: string | null;
  order_number: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

const QUOTE_STATUSES = [
  { value: "DRAFT", label: "Borrador", className: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
  { value: "SENT", label: "Enviado", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "APPROVED", label: "Aprobado", className: "bg-green-500/20 text-green-300 border-green-500/30" },
  { value: "REJECTED", label: "Rechazado", className: "bg-red-500/20 text-red-300 border-red-500/30" },
  { value: "EXPIRED", label: "Expirado", className: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  { value: "INVOICED", label: "Facturado", className: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
];

const getStatusInfo = (status: string) => {
  return QUOTE_STATUSES.find(s => s.value === status) || QUOTE_STATUSES[0];
};

const QuotesPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter, searchQuery]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_quotes", {
        p_status: statusFilter,
        p_search: searchQuery || null,
      });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error("Error fetching quotes:", error);
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

  const handleNewQuote = () => {
    navigate(`/nexo-av/${userId}/quotes/new`);
  };

  const handleQuoteClick = (quoteId: string) => {
    navigate(`/nexo-av/${userId}/quotes/${quoteId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
      <NexoHeader title="Presupuestos" userId={userId || ""} />
      
      <main className="container mx-auto px-4 pt-24 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Presupuestos</h1>
              <p className="text-white/60">Gestiona todos los presupuestos</p>
            </div>
            
            <Button
              onClick={handleNewQuote}
              className="bg-avtech-orange hover:bg-avtech-orange/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Presupuesto
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Buscar por número, cliente o proyecto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === null ? "secondary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(null)}
                className={statusFilter === null ? "bg-white/20 text-white" : "border-white/20 text-white/70 hover:bg-white/10"}
              >
                Todos
              </Button>
              {QUOTE_STATUSES.map((status) => (
                <Button
                  key={status.value}
                  variant={statusFilter === status.value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status.value)}
                  className={statusFilter === status.value ? "bg-white/20 text-white" : "border-white/20 text-white/70 hover:bg-white/10"}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-avtech-orange" />
              </div>
            ) : quotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-16 w-16 text-white/20 mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No hay presupuestos</h3>
                <p className="text-white/60 mb-6">
                  {searchQuery || statusFilter
                    ? "No se encontraron presupuestos con los filtros aplicados"
                    : "Crea tu primer presupuesto para comenzar"}
                </p>
                {!searchQuery && !statusFilter && (
                  <Button
                    onClick={handleNewQuote}
                    className="bg-avtech-orange hover:bg-avtech-orange/90 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Presupuesto
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/70">Num.</TableHead>
                    <TableHead className="text-white/70">Cliente</TableHead>
                    <TableHead className="text-white/70">Proyecto</TableHead>
                    <TableHead className="text-white/70">Pedido</TableHead>
                    <TableHead className="text-white/70">Estado</TableHead>
                    <TableHead className="text-white/70 text-right">Subtotal</TableHead>
                    <TableHead className="text-white/70 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => {
                    const statusInfo = getStatusInfo(quote.status);
                    return (
                      <TableRow
                        key={quote.id}
                        className="border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => handleQuoteClick(quote.id)}
                      >
                        <TableCell className="font-mono text-avtech-orange font-medium">
                          {quote.quote_number}
                        </TableCell>
                        <TableCell className="text-white uppercase">
                          {quote.client_name || "-"}
                        </TableCell>
                        <TableCell className="text-white/80">
                          {quote.project_name || "-"}
                        </TableCell>
                        <TableCell className="text-white/80">
                          {quote.order_number || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/80 text-right">
                          {formatCurrency(quote.subtotal)}
                        </TableCell>
                        <TableCell className="text-white font-medium text-right">
                          {formatCurrency(quote.total)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default QuotesPage;
