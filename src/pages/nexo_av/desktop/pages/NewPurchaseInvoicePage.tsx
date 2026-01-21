import { useState, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  FileText,
  Upload,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import CreatePurchaseInvoiceDialog from "../components/purchases/CreatePurchaseInvoiceDialog";


const NewPurchaseInvoicePageDesktop = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<"INVOICE" | "EXPENSE">(
    searchParams.get("type") === "EXPENSE" ? "EXPENSE" : "INVOICE"
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !userId) return;

    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    try {
      setLoading(true);

      // Upload file to storage
      const extension = selectedFile.name.split('.').pop();
      const fileName = `invoice_${Date.now()}.${extension}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('purchase-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      setUploadedFilePath(filePath);

      // Create pending document
      const { data: invoiceData, error: dbError } = await supabase.rpc('create_purchase_invoice', {
        p_invoice_number: `PENDIENTE-${Date.now().toString().slice(-6)}`,
        p_document_type: documentType,
        p_status: 'PENDING',
        p_file_path: filePath,
        p_file_name: fileName,
      } as any);

      if (dbError) throw dbError;

      if (invoiceData) {
        // La RPC devuelve un UUID directamente o un array con un objeto
        const invoiceId = Array.isArray(invoiceData) 
          ? (invoiceData[0]?.purchase_invoice_id || invoiceData[0] || invoiceData)
          : (typeof invoiceData === 'string' ? invoiceData : invoiceData);
        setPendingDocumentId(invoiceId);
        // Open dialog to complete the invoice
        setShowDialog(true);
        toast.success("Documento subido correctamente. Completa los datos de la factura.");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Error al subir el documento: " + error.message);
      setFile(null);
      setUploadedFilePath(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWithoutFile = () => {
    setShowDialog(true);
  };

  const handleDialogSuccess = () => {
    navigate(`/nexo-av/${userId}/purchase-invoices`);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadedFilePath(null);
    setPendingDocumentId(null);
  };

  return (
    <>
      <div className="w-full h-full px-6 py-6">
        <div className="w-full max-w-none mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/40 hover:text-white hover:bg-white/5 rounded-2xl h-11 w-11"
              onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Nueva {documentType === "EXPENSE" ? "Gasto" : "Factura de Compra"}
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: File Upload */}
            <div className="space-y-6">
              <div className="bg-zinc-900/40 border-2 border-dashed border-white/5 rounded-[2.5rem] p-12 text-center hover:border-blue-500/20 transition-all cursor-pointer group">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleUpload}
                  accept="application/pdf,image/jpeg,image/png"
                  disabled={loading}
                />
                <label
                  htmlFor="file-upload"
                  className={`cursor-pointer flex flex-col items-center ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="p-6 bg-blue-500/10 rounded-[2rem] mb-6 group-hover:scale-110 transition-transform">
                    {loading ? (
                      <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
                    ) : (
                      <Upload className="h-10 w-10 text-blue-400" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {loading ? "Subiendo..." : "Haz clic para subir documento"}
                  </h3>
                  <p className="text-white/20 text-xs font-medium uppercase tracking-widest">
                    Formatos PDF, JPG, PNG (Max. 50MB)
                  </p>
                </label>
              </div>

              <AnimatePresence>
                {file && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-zinc-900 border border-white/5 p-4 rounded-3xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <FileText className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white truncate max-w-[200px]">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-white/20 font-mono">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl"
                      onClick={handleRemoveFile}
                      disabled={loading}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Quick Create */}
            <div className="space-y-6">
              <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md rounded-[2.5rem] p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Crear sin documento
                    </h3>
                    <p className="text-white/40 text-sm">
                      Crea una factura de compra o gasto directamente sin subir un documento PDF.
                      Puedes añadir el documento más tarde.
                    </p>
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={handleCreateWithoutFile}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-2xl shadow-xl shadow-blue-500/10 gap-3"
                    >
                      <Plus className="h-5 w-5" />
                      Crear {documentType === "EXPENSE" ? "Gasto" : "Factura"}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <CreatePurchaseInvoiceDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={handleDialogSuccess}
        preselectedDocumentId={pendingDocumentId || undefined}
        documentType={documentType}
      />
    </>
  );
};

export default NewPurchaseInvoicePageDesktop;
