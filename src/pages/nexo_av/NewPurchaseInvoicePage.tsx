import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    ArrowLeft,
    FileUp,
    Trash2,
    X,
    FileText,
    Upload,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

const NewPurchaseInvoicePage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSave = async () => {
        toast.info("Función de guardado en desarrollo. Los datos se validarán próximamente.");
    };

    return (
        <div className="w-full min-h-screen">
            <div className="w-[95%] max-w-[1200px] mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/40 hover:text-white hover:bg-white/5 rounded-2xl h-11 w-11"
                        onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-3xl font-black text-white tracking-tight">Nuevo Gasto / Factura</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: File Upload */}
                    <div className="space-y-6">
                        <div className="bg-zinc-900/40 border-2 border-dashed border-white/5 rounded-[2.5rem] p-12 text-center hover:border-blue-500/20 transition-all cursor-pointer group">
                            <input type="file" id="file-upload" className="hidden" onChange={handleUpload} />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                                <div className="p-6 bg-blue-500/10 rounded-[2rem] mb-6 group-hover:scale-110 transition-transform">
                                    <Upload className="h-10 w-10 text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Haz clic para subir documento</h3>
                                <p className="text-white/20 text-xs font-medium uppercase tracking-widest">Formatos PDF, JPG, PNG (Max. 50MB)</p>
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
                                            <span className="text-sm font-bold text-white truncate max-w-[200px]">{file.name}</span>
                                            <span className="text-[10px] text-white/20 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl" onClick={() => setFile(null)}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right: Quick Detail */}
                    <div className="space-y-6">
                        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md rounded-[2.5rem] p-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-3 pl-1">Número de Factura</label>
                                    <Input className="bg-white/5 border-white/5 text-white h-12 rounded-2xl" placeholder="Ej: INV-2024-001" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-3 pl-1">Fecha Emisión</label>
                                        <Input type="date" className="bg-white/5 border-white/5 text-white h-12 rounded-2xl [color-scheme:dark]" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-3 pl-1">Vencimiento</label>
                                        <Input type="date" className="bg-white/5 border-white/5 text-white h-12 rounded-2xl [color-scheme:dark]" />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-2xl shadow-xl shadow-blue-500/10 gap-3"
                                    >
                                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                                        Crear y Continuar
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewPurchaseInvoicePage;
