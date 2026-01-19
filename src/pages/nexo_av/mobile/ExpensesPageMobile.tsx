import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Loader2,
  Camera,
  TrendingDown,
  Calendar,
  Building2,
  FileText,
} from "lucide-react";
import { motion } from "motion/react";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DocumentScanner = lazy(() => import("../components/DocumentScanner"));

interface Expense {
  id: string;
  invoice_number: string;
  document_type: string;
  issue_date: string;
  due_date: string | null;
  tax_base: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  provider_id: string;
  provider_name: string;
  provider_type: string;
  provider_tax_id: string;
  file_path: string | null;
  file_name: string | null;
  project_id: string | null;
  project_name: string | null;
  expense_category: string | null;
  is_locked: boolean;
  created_at: string;
}

const ExpensesPageMobile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [showScanner, setShowScanner] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchExpenses();
  }, [debouncedSearchQuery, statusFilter]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_purchase_invoices", {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter,
        p_document_type: 'EXPENSE',
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
    if (!userId) {
      toast({
        title: "Error",
        description: "No se ha identificado al usuario",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Obtener el auth.uid() del usuario actual para las políticas RLS
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error("Usuario no autenticado");
      }
      const authUserId = authUser.id;

      // Validar tipo de archivo
      const isFile = fileOrBlob instanceof File;
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 50 * 1024 * 1024; // 50MB

      if (isFile) {
        const file = fileOrBlob as File;
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Tipo de archivo no permitido. Solo se permiten: PDF, JPEG, PNG, WEBP`);
        }
        if (file.size > maxSize) {
          throw new Error(`El archivo es demasiado grande. Tamaño máximo: 50MB`);
        }
      }

      // Generar nombre de archivo único
      // Usar authUserId para la carpeta (requerido por políticas RLS)
      const extension = isFile 
        ? (fileOrBlob as File).name.split('.').pop()?.toLowerCase() || 'pdf'
        : 'jpg';
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `expense_${timestamp}_${randomSuffix}.${extension}`;
      const filePath = `${authUserId}/${fileName}`;

      // Subir archivo a Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('purchase-documents')
        .upload(filePath, fileOrBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        // Si el archivo ya existe, intentar con otro nombre
        if (uploadError.message.includes('already exists')) {
          const newFileName = `expense_${timestamp}_${Math.random().toString(36).substring(2, 10)}.${extension}`;
          const newFilePath = `${authUserId}/${newFileName}`;
          const { error: retryError } = await supabase.storage
            .from('purchase-documents')
            .upload(newFilePath, fileOrBlob);
          
          if (retryError) throw retryError;
          
          // Usar el nuevo path
          const { error: dbError } = await supabase.rpc('create_purchase_invoice', {
            p_invoice_number: `TICKET-${timestamp.toString().slice(-6)}`,
            p_document_type: 'EXPENSE',
            p_status: 'PENDING',
            p_file_path: newFilePath,
            p_file_name: newFileName
          });

          if (dbError) throw dbError;
        } else {
          throw uploadError;
        }
      } else {
        // Crear registro en la base de datos
        const { error: dbError } = await supabase.rpc('create_purchase_invoice', {
          p_invoice_number: `TICKET-${timestamp.toString().slice(-6)}`,
          p_document_type: 'EXPENSE',
          p_status: 'PENDING',
          p_file_path: filePath,
          p_file_name: fileName
        });

        if (dbError) {
          // Si falla la creación en BD, eliminar el archivo subido
          await supabase.storage
            .from('purchase-documents')
            .remove([filePath]);
          throw dbError;
        }
      }

      toast({
        title: "Éxito",
        description: "Ticket subido correctamente. Pendiente de entrada de datos.",
      });
      setShowScanner(false);
      fetchExpenses();
    } catch (error: any) {
      console.error("Upload error:", error);
      let errorMessage = "Error al subir el ticket";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      }

      toast({
        title: "Error",
        description: errorMessage,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-500/10 text-emerald-400';
      case 'PARTIAL':
        return 'bg-amber-500/10 text-amber-500';
      case 'PENDING':
        return 'bg-blue-500/10 text-blue-400';
      default:
        return 'bg-zinc-500/10 text-zinc-400';
    }
  };

  const handleCardClick = (expenseId: string) => {
    navigate(`/nexo-av/${userId}/purchase-invoices/${expenseId}`);
  };

  const pendingCount = expenses.filter(e => e.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-3 py-3 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Header con botón de escaneo destacado */}
          <div className="space-y-3">
            <div>
              <h1 className="text-lg font-bold">Gastos y Tickets</h1>
              <p className="text-xs text-muted-foreground">
                {expenses.length} tickets registrados
                {pendingCount > 0 && (
                  <span className="ml-2 text-blue-400 font-medium">
                    • {pendingCount} pendientes
                  </span>
                )}
              </p>
            </div>
            
            {/* Botón principal de escaneo - grande y destacado */}
            <Button
              onClick={() => setShowScanner(true)}
              disabled={uploading}
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold gap-3"
              size="lg"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
              Escanear Ticket
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar ticket o proveedor..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-11 bg-card border-border text-foreground placeholder:text-muted-foreground h-10 text-xs"
            />
          </div>

          {/* Filters - Scrollable horizontal */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
            <Button
              variant={statusFilter === null ? "secondary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(null)}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                statusFilter === null
                  ? "bg-primary text-primary-foreground font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === 'PENDING' ? "secondary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter('PENDING')}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                statusFilter === 'PENDING'
                  ? "bg-blue-500 text-white font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              Pendientes {pendingCount > 0 && `(${pendingCount})`}
            </Button>
            <Button
              variant={statusFilter === 'REGISTERED' ? "secondary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter('REGISTERED')}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                statusFilter === 'REGISTERED'
                  ? "bg-primary text-primary-foreground font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              Registrado
            </Button>
            <Button
              variant={statusFilter === 'PAID' ? "secondary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter('PAID')}
              className={cn(
                "h-8 px-3 text-[10px] shrink-0",
                statusFilter === 'PAID'
                  ? "bg-emerald-500 text-white font-medium"
                  : "border-border text-muted-foreground"
              )}
            >
              Pagado
            </Button>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Camera className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm mb-2">Sin tickets escaneados</p>
              <p className="text-xs text-muted-foreground mb-4">
                Escanea tus tickets con la cámara para procesar los gastos rápidamente.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScanner(true)}
              >
                <Camera className="h-4 w-4 mr-2" />
                Escanear primer ticket
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <Card
                  key={expense.id}
                  className="cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => handleCardClick(expense.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingDown className="h-4 w-4 text-amber-400 shrink-0" />
                          <span className="font-semibold text-sm truncate">{expense.invoice_number}</span>
                          {expense.status === 'PENDING' && (
                            <Badge className="bg-blue-500/10 text-blue-400 text-[9px] px-1.5 py-0 border-none">
                              Pendiente
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{expense.provider_name || 'Sin proveedor'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{formatCurrency(expense.total)}</p>
                        <Badge className={cn("text-[9px] px-1.5 py-0 border-none mt-1", getStatusColor(expense.status))}>
                          {expense.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(expense.issue_date)}
                      </div>
                      {expense.project_name && (
                        <div className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{expense.project_name}</span>
                        </div>
                      )}
                      {expense.pending_amount > 0 && (
                        <span className="text-red-400 font-medium ml-auto">
                          Pend. {formatCurrency(expense.pending_amount)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {showScanner && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        }>
          <DocumentScanner
            onCapture={handleUpload}
            onCancel={() => setShowScanner(false)}
            title="Escanear Ticket de Gasto"
          />
        </Suspense>
      )}
    </div>
  );
};

export default ExpensesPageMobile;
