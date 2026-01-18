import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Loader2,
  Plus,
  ChevronDown,
  Filter,
  FileText,
  FileSearch,
  Calendar,
  Building2,
  ExternalLink,
  Lock,
  Eye,
  MoreVertical,
  ChevronRight,
  TrendingDown,
  Camera,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/use-mobile";
import DocumentScanner from "./components/DocumentScanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  document_type: string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  retention_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  provider_id: string;
  provider_name: string;
  provider_type: string;
  provider_tax_id: string;
  file_path: string | null;
  project_id: string | null;
  project_name: string | null;
  is_locked: boolean;
  created_at: string;
}

const PurchaseInvoicesPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const isMobile = useIsMobile();
  const [showScanner, setShowScanner] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchInvoices();
  }, [debouncedSearchQuery, statusFilter, typeFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_purchase_invoices", {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter === "all" ? null : statusFilter,
        p_document_type: typeFilter === "all" ? null : typeFilter,
      });
      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error("Error fetching purchase invoices:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las facturas de compra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (fileOrBlob: File | Blob) => {
    if (!userId) return;
    try {
      setUploading(true);
      const isFile = fileOrBlob instanceof File;
      const extension = isFile ? (fileOrBlob as File).name.split('.').pop() : 'jpg';
      const fileName = `invoice_${Date.now()}.${extension}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('purchase-documents')
        .upload(filePath, fileOrBlob);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.rpc('create_purchase_invoice', {
        p_invoice_number: `PENDIENTE-${Date.now().toString().slice(-6)}`,
        p_document_type: typeFilter === 'EXPENSE' ? 'EXPENSE' : 'INVOICE',
        p_status: 'PENDING',
        p_file_path: filePath,
        p_file_name: fileName
      } as any);

      if (dbError) throw dbError;

      toast({
        title: "Éxito",
        description: "Documento subido correctamente. Pendiente de entrada de datos.",
      });
      setShowScanner(false);
      fetchInvoices();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Error al subir el documento: " + error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  return (
    <div className="w-full">
      <div className="w-[95%] max-w-[1800px] mx-auto px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-[1.2rem] border border-red-500/20 shadow-lg shadow-red-500/5">
                  <TrendingDown className="h-7 w-7 text-red-400" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Compras y Gastos</h1>
                  <p className="text-white/40 text-sm mt-0.5 font-medium flex items-center gap-2">
                    <Building2 className="h-3 w-3" />
                    Facturación de proveedores y tickets de gasto
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="desktop-upload"
                  className="hidden"
                  accept="application/pdf"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                <Button
                  onClick={() => isMobile ? setShowScanner(true) : document.getElementById('desktop-upload')?.click()}
                  disabled={uploading}
                  className="bg-zinc-100 hover:bg-white text-zinc-950 h-11 px-6 rounded-2xl shadow-xl shadow-white/5 gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] font-bold"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isMobile ? (
                    <Camera className="h-5 w-5" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  {isMobile ? "Escanear Factura" : "Subir Documento PDF"}
                </Button>
              </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-md p-5 rounded-[2rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <TrendingDown className="h-16 w-16 text-white" />
                </div>
                <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-1.5">Gasto Totalv</p>
                <p className="text-2xl font-black text-white">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.total || 0), 0))}
                </p>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-white/40 bg-white/5 w-fit px-2 py-1 rounded-full border border-white/5">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  {invoices.length} Documentos en total
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-md p-5 rounded-[2rem] relative overflow-hidden group">
                <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-1.5">Pendiente de Pago</p>
                <p className="text-2xl font-black text-red-400/90">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.pending_amount || 0), 0))}
                </p>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-red-400/60 bg-red-400/5 w-fit px-2 py-1 rounded-full border border-red-400/10">
                  {invoices.filter(i => i.pending_amount > 0).length} Facturas pendientes
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 bg-zinc-900/50 border border-white/5 p-4 rounded-[2.5rem] backdrop-blur-xl">
              <div className="relative flex-1 w-full group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                <Input
                  placeholder="Buscar por factura, proveedor o proyecto..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-14 h-12 bg-white/5 border-white/5 text-white rounded-2xl focus:ring-blue-500/10 focus:border-blue-500/20 transition-all text-sm placeholder:text-white/20"
                />
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-12 px-5 bg-white/5 border-white/5 text-white rounded-2xl hover:bg-white/10 gap-2 font-semibold min-w-[160px]"
                    >
                      <Filter className="h-4 w-4 text-white/30" />
                      {statusFilter === "all" ? "Cualquier Estado" : statusFilter}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-950 border-white/10 rounded-2xl p-2 w-56 shadow-2xl">
                    <DropdownMenuItem onClick={() => setStatusFilter("all")} className="text-white rounded-xl focus:bg-white/10 py-2.5">Todos los estados</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("REGISTERED")} className="text-white rounded-xl focus:bg-white/10 py-2.5">Registrado</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("PARTIAL")} className="text-amber-400 rounded-xl focus:bg-amber-400/10 py-2.5">Pago Parcial</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("PAID")} className="text-emerald-400 rounded-xl focus:bg-emerald-400/10 py-2.5">Pagado</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-12 px-5 bg-white/5 border-white/5 text-white rounded-2xl hover:bg-white/10 gap-2 font-semibold min-w-[160px]"
                    >
                      {typeFilter === "all" ? "Documento" : typeFilter}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-950 border-white/10 rounded-2xl p-2 w-56 shadow-2xl">
                    <DropdownMenuItem onClick={() => setTypeFilter("all")} className="text-white rounded-xl focus:bg-white/10 py-2.5 text-xs font-bold uppercase tracking-tighter">Cualquier tipo</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("INVOICE")} className="text-white rounded-xl focus:bg-white/10 py-2.5 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-400" /> Factura
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("EXPENSE")} className="text-white rounded-xl focus:bg-white/10 py-2.5 flex items-center gap-2">
                      <FileSearch className="h-4 w-4 text-amber-400" /> Ticket / Gasto
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/20">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-6 bg-white/[0.01]">
                <div className="relative">
                  <div className="h-14 w-14 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin" />
                  <div className="absolute inset-0 blur-2xl bg-blue-500/10" />
                </div>
                <p className="text-white/20 font-bold uppercase tracking-[0.2em] text-[10px]">Sincronizando registros financieros</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 px-10 text-center">
                <div className="p-8 bg-white/[0.02] rounded-[3rem] border border-white/5 mb-8 shadow-inner">
                  <FileText className="h-16 w-16 text-white/5" />
                </div>
                <h3 className="text-2xl font-black text-white mb-3">Historial Vacío</h3>
                <p className="text-white/30 max-w-sm mb-10 font-medium">
                  No se han encontrado registros que coincidan con el filtro actual. Prueba con otros criterios o registra un nuevo gasto.
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setSearchInput(""); setStatusFilter("all"); setTypeFilter("all"); }}
                  className="rounded-2xl border-white/5 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 h-11 px-8"
                >
                  Reiniciar filtros
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/[0.01]">
                    <TableRow className="border-white/5 hover:bg-transparent h-16">
                      <TableHead className="text-white/20 font-black uppercase tracking-widest text-[9px] pl-10">Documento</TableHead>
                      <TableHead className="text-white/20 font-black uppercase tracking-widest text-[9px]">Proveedor / Proyecto</TableHead>
                      <TableHead className="text-white/20 font-black uppercase tracking-widest text-[9px]">Fechas</TableHead>
                      <TableHead className="text-white/20 font-black uppercase tracking-widest text-[9px] text-right">Importe</TableHead>
                      <TableHead className="text-white/20 font-black uppercase tracking-widest text-[9px] text-center">Estado</TableHead>
                      <TableHead className="text-white/20 font-black uppercase tracking-widest text-[9px] text-right pr-10">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow
                        key={inv.id}
                        className="group border-white/[0.02] hover:bg-white/[0.03] cursor-pointer transition-all h-24"
                        onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${inv.id}`)}
                      >
                        <TableCell className="pl-10">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-12 w-12 rounded-[1rem] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                              inv.document_type === 'INVOICE' ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
                            )}>
                              {inv.document_type === 'INVOICE' ? <FileText className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-white text-base tracking-tight">{inv.invoice_number}</span>
                              <Badge variant="outline" className="w-fit text-[8px] mt-1.5 py-0 px-1.5 rounded-md bg-white/5 border-white/5 text-white/40 font-black uppercase tracking-tighter">
                                {inv.document_type === 'INVOICE' ? 'Factura' : 'Gasto/Ticket'}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <span className="font-bold text-sm text-white/90 group-hover:text-white transition-colors flex items-center gap-2">
                              {inv.provider_name}
                              {inv.provider_type === 'TECHNICIAN' && <Badge className="bg-violet-500/10 text-violet-400 text-[8px] border-none py-0">TÉCNICO</Badge>}
                            </span>
                            <div className="flex items-center gap-2.5">
                              <Building2 className="h-3 w-3 text-white/10" />
                              <span className="text-[11px] text-white/30 font-medium truncate max-w-[200px]">
                                {inv.project_name || "Gasto General"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-white/50">
                              <Calendar className="h-3 w-3" />
                              <span className="text-xs font-medium">{formatDate(inv.issue_date)}</span>
                            </div>
                            {inv.due_date && (
                              <div className={cn(
                                "flex items-center gap-2 text-[10px] font-bold",
                                new Date(inv.due_date) < new Date() && inv.pending_amount > 0 ? "text-red-500/80" : "text-white/20"
                              )}>
                                <div className="h-1 w-1 rounded-full bg-current" />
                                Vence {formatDate(inv.due_date)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-lg text-white tracking-tighter">{formatCurrency(inv.total)}</span>
                            {inv.pending_amount > 0 && (
                              <span className="text-[10px] font-black text-red-500/50 -mt-1 uppercase tracking-tighter">
                                Pend. {formatCurrency(inv.pending_amount)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-2",
                                inv.status === 'PAID' ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10 shadow-lg shadow-emerald-500/5" :
                                  inv.status === 'PARTIAL' ? "bg-amber-500/5 text-amber-500 border-amber-500/10 shadow-lg shadow-amber-500/5" :
                                    "bg-white/5 text-white/40 border-white/5"
                              )}
                            >
                              {inv.status === 'REGISTERED' ? 'REGISTRADO' : inv.status === 'PAID' ? 'PAGADO' : 'PARCIAL'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-10">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                            {inv.file_path && (
                              <Button size="icon" variant="ghost" className="h-10 w-10 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-xl">
                                <Eye className="h-5 w-5" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-10 w-10 text-white/30 hover:text-white hover:bg-white/10 rounded-xl">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showScanner && (
          <DocumentScanner
            onCapture={handleUpload}
            onCancel={() => setShowScanner(false)}
            title="Escanear Factura"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PurchaseInvoicesPage;
