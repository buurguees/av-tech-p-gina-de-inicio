import { useState, useEffect, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  Plus,
  Filter,
  FileText,
  Camera,
  Upload,
  TrendingDown,
  Building2,
  ChevronRight,
  MoreVertical,
  Eye,
  Calendar,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import DocumentScanner from "./components/DocumentScanner";
import { cn } from "@/lib/utils";
import { createMobilePage } from "./MobilePageWrapper";

const ExpensesPageMobile = lazy(() => import("./mobile/ExpensesPageMobile"));

const ExpensesPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_purchase_invoices", {
        p_document_type: 'EXPENSE',
        p_page_size: 50
      });
      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error("Error fetching expenses:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los gastos",
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
      const fileName = `expense_${Date.now()}.${extension}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('purchase-documents')
        .upload(filePath, fileOrBlob);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.rpc('create_purchase_invoice', {
        p_invoice_number: `TICKET-${Date.now().toString().slice(-6)}`,
        p_document_type: 'EXPENSE',
        p_status: 'PENDING',
        p_file_path: filePath,
        p_file_name: fileName
      } as any);

      if (dbError) throw dbError;

      toast({
        title: "Éxito",
        description: "Ticket subido correctamente. Pendiente de entrada de datos.",
      });
      setShowScanner(false);
      fetchExpenses();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Error al subir el ticket: " + error.message,
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

  return (
    <div className="w-full h-full px-6 py-6">
      <div className="w-full max-w-none mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-[1.2rem] border border-amber-500/20 shadow-lg shadow-amber-500/5">
                  <TrendingDown className="h-7 w-7 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Gastos y Tickets</h1>
                  <p className="text-white/40 text-sm mt-0.5 font-medium flex items-center gap-2">
                    <Camera className="h-3 w-3" />
                    Captura rápida y gestión de gastos operativos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="desktop-upload-expense"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                <Button
                  onClick={() => isMobile ? setShowScanner(true) : document.getElementById('desktop-upload-expense')?.click()}
                  disabled={uploading}
                  className="bg-amber-500 hover:bg-amber-600 text-white h-11 px-6 rounded-2xl shadow-xl shadow-amber-500/10 gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] font-bold"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isMobile ? (
                    <Camera className="h-5 w-5" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  {isMobile ? "Escanear Ticket" : "Subir Ticket PDF/Imagen"}
                </Button>
              </div>
            </div>

            {/* List of pending/recent expenses */}
            <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/20">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6 bg-white/[0.01]">
                  <div className="h-10 w-10 border-2 border-white/5 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-white/20 font-bold uppercase tracking-[0.2em] text-[10px]">Cargando tickets registrados</p>
                </div>
              ) : expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 px-10 text-center">
                  <div className="p-8 bg-white/[0.02] rounded-[3rem] border border-white/5 mb-8 shadow-inner">
                    <Camera className="h-16 w-16 text-white/5" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Sin tickets escaneados</h3>
                  <p className="text-white/30 max-w-sm font-medium text-sm">
                    Escanea tus tickets con el móvil o sube el documento para procesar los gastos rápidamente.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Aquí iría una tabla simplificada similar a PurchaseInvoices pero enfocada a gastos */}
                  {/* De momento usamos un mensaje indicando que se pueden ver en Compras */}
                  <div className="p-12 text-center">
                    <p className="text-white/40 text-sm font-medium mb-6">
                      Tienes {expenses.length} tickets registrados. Puedes entrar los datos detallados desde el listado general o haciendo clic en ellos.
                    </p>
                    <Button
                      onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)}
                      variant="outline"
                      className="rounded-xl border-white/5 bg-white/5 text-white/60 hover:text-white"
                    >
                      Ver todos en Compras
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showScanner && (
          <DocumentScanner
            onCapture={handleUpload}
            onCancel={() => setShowScanner(false)}
            title="Escanear Ticket de Gasto"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ExpensesPage = createMobilePage({
  DesktopComponent: ExpensesPageDesktop,
  MobileComponent: ExpensesPageMobile,
});

export default ExpensesPage;
