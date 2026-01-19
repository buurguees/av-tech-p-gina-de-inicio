import { useState, useEffect, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Building2,
    Calendar,
    FileText,
    Trash2,
    TrendingDown,
    Download,
    ExternalLink,
    Eye,
    Euro,
    Plus,
    Info,
    ChevronRight,
    UserRound
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { createMobilePage } from "./MobilePageWrapper";
import CreatePurchaseInvoiceDialog from "./components/CreatePurchaseInvoiceDialog";

const PurchaseInvoiceDetailPageMobile = lazy(() => import("./mobile/PurchaseInvoiceDetailPageMobile"));

const PurchaseInvoiceDetailPageDesktop = () => {
    const { userId, invoiceId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState<any>(null);
    const [lines, setLines] = useState<any[]>([]);
    const [provider, setProvider] = useState<any>(null);
    const [project, setProject] = useState<any>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const fetchInvoiceData = async () => {
        if (!invoiceId) return;
        try {
            setLoading(true);
            // Intentar obtener factura usando get_purchase_invoice si existe, sino usar list_purchase_invoices
            let record: any = null;
            
            // Primero intentar con get_purchase_invoice
            const { data: invoiceData, error: invoiceError } = await supabase.rpc("get_purchase_invoice", {
                p_invoice_id: invoiceId
            });

            if (!invoiceError && invoiceData && invoiceData.length > 0) {
                record = invoiceData[0];
            } else {
                // Fallback: usar list_purchase_invoices y buscar por ID
                const { data: listData, error: listError } = await supabase.rpc("list_purchase_invoices", {
                    p_search: null,
                    p_status: null,
                    p_document_type: null,
                    p_page_size: 1000
                });

                if (listError) throw listError;
                record = listData?.find((inv: any) => inv.id === invoiceId);
            }

            if (!record) {
                toast.error("Documento no encontrado");
                navigate(`/nexo-av/${userId}/purchase-invoices`);
                return;
            }
            setInvoice(record);

            // Obtener URL del PDF si existe
            if (record.file_path) {
                try {
                    const { data: urlData } = await supabase.storage
                        .from('purchase-documents')
                        .createSignedUrl(record.file_path, 3600);
                    if (urlData) {
                        setPdfUrl(urlData.signedUrl);
                    }
                } catch (err) {
                    console.error("Error getting PDF URL:", err);
                }
            }

            // Líneas usando RPC
            const { data: linesData, error: linesError } = await supabase
                .rpc('get_purchase_invoice_lines', {
                    p_invoice_id: invoiceId
                });

            if (linesError) throw linesError;
            setLines(linesData || []);

        } catch (error: any) {
            console.error("Error fetching purchase invoice:", error);
            toast.error("Error al cargar los detalles");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoiceData();
    }, [invoiceId]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "EUR",
        }).format(amount);
    };

    const formatDate = (date: string | null) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 border-4 border-white/5 border-t-red-500 rounded-full animate-spin" />
                <p className="text-white/20 font-bold uppercase tracking-widest text-[10px]">Cargando registro de gasto</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full px-6 py-6">
            <div className="w-full max-w-none mx-auto">
                {/* Navigation */}
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/40 hover:text-white hover:bg-white/5 rounded-2xl h-11 w-11 transition-all"
                        onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-white tracking-tight">
                                {invoice.document_type === 'INVOICE' ? 'Factura de Compra' : 'Gasto / Ticket'}
                            </h1>
                            <Badge variant="outline" className="bg-white/5 border-white/10 text-white/40 font-bold">
                                {invoice.invoice_number}
                            </Badge>
                        </div>
                        <p className="text-white/30 text-xs font-medium mt-1">ID: {invoice.id}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Document Viewer / Editor Lines */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Split View placeholder: Document Preview */}
                        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-red-400" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-white/60">Documento Adjunto</span>
                                </div>
                                {pdfUrl && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 text-[10px] font-bold uppercase tracking-widest gap-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = pdfUrl;
                                            link.download = invoice.file_name || 'documento.pdf';
                                            link.click();
                                        }}
                                    >
                                        <Download className="h-3.5 w-3.5" /> Descargar PDF
                                    </Button>
                                )}
                            </div>
                            <div className="aspect-[1.4/1] bg-black/20 flex flex-col items-center justify-center p-4 text-center group">
                                {pdfUrl ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                        {invoice.file_name?.toLowerCase().endsWith('.pdf') ? (
                                            <iframe
                                                src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&zoom=page-fit`}
                                                className="w-full h-full border-0 rounded-lg"
                                                title="PDF Preview"
                                            />
                                        ) : (
                                            <img
                                                src={pdfUrl}
                                                alt="Document Preview"
                                                className="max-w-full max-h-full object-contain rounded-lg"
                                            />
                                        )}
                                    </div>
                                ) : invoice.file_path ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <div className="bg-white/5 border border-white/10 p-12 rounded-[2rem] flex flex-col items-center gap-4">
                                            <Loader2 className="h-12 w-12 text-white/20 animate-spin" />
                                            <p className="text-white/40 text-sm font-medium">Cargando documento...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <FileText className="h-16 w-16 text-white/5 mb-6" />
                                        <p className="text-white/40 font-bold uppercase tracking-tighter text-sm mb-2">No hay archivo adjunto</p>
                                        <Button variant="outline" className="rounded-xl border-white/5 bg-white/5 text-white/40 text-xs hover:text-white">
                                            Subir Documento
                                        </Button>
                                    </>
                                )}
                            </div>
                        </Card>

                        {/* Lines Table */}
                        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h3 className="font-black text-white uppercase tracking-widest text-xs">Conceptos del Gasto</h3>
                                <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl gap-2 text-white/40 hover:text-white hover:bg-white/5 font-bold uppercase tracking-tighter text-[10px]">
                                    <Plus className="h-4 w-4" /> Añadir Línea
                                </Button>
                            </div>
                            <div className="p-0">
                                <Table>
                                    <TableHeader className="bg-white/[0.01]">
                                        <TableRow className="border-white/5 hover:bg-transparent">
                                            <TableHead className="text-white/20 font-black uppercase text-[9px] pl-8">Descripción</TableHead>
                                            <TableHead className="text-white/20 font-black uppercase text-[9px] text-center w-24">Cant.</TableHead>
                                            <TableHead className="text-white/20 font-black uppercase text-[9px] text-right w-32">Precio</TableHead>
                                            <TableHead className="text-white/20 font-black uppercase text-[9px] text-center w-24">IVA</TableHead>
                                            <TableHead className="text-white/20 font-black uppercase text-[9px] text-right pr-8 w-32">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lines.map((line) => (
                                            <TableRow key={line.id} className="border-white/[0.02] hover:bg-white/[0.02] transition-colors h-16">
                                                <TableCell className="pl-8 font-medium text-white/80">{line.description}</TableCell>
                                                <TableCell className="text-center text-white/40 font-mono text-xs">{line.quantity}</TableCell>
                                                <TableCell className="text-right font-mono text-xs text-white/60">{formatCurrency(line.unit_price)}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="bg-blue-500/5 border-blue-500/10 text-blue-400 text-[9px] px-1.5 py-0">
                                                        {line.tax_rate}%
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-8 font-black text-white">{formatCurrency(line.total)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {lines.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-32 text-center">
                                                    <p className="text-white/10 font-bold uppercase tracking-widest text-[10px]">Sin conceptos detallados</p>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </div>

                    {/* Right: Sidebar Info */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Status & Actions */}
                        <Card className="bg-zinc-900/60 border-white/5 backdrop-blur-md rounded-[2.5rem] p-6">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Estado Actual</span>
                                    <Badge className={cn(
                                        "rounded-xl px-4 py-1.5 text-[10px] font-black border-2",
                                        invoice.status === 'PAID' ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10" :
                                            invoice.status === 'PARTIAL' ? "bg-amber-500/5 text-amber-500 border-amber-500/10" :
                                                "bg-white/5 text-white/60 border-white/5"
                                    )}>
                                        {invoice.status}
                                    </Badge>
                                </div>
                                <Separator className="bg-white/5" />
                                <div className="grid grid-cols-2 gap-3">
                                    {invoice?.status !== 'PENDING' && (
                                        <Button className="bg-white text-zinc-950 font-bold rounded-2xl h-11 hover:bg-white/90">Registrar Pago</Button>
                                    )}
                                    <Button 
                                        variant="outline" 
                                        className="border-white/5 bg-white/5 text-white/60 font-bold rounded-2xl h-11 hover:bg-white/10 hover:text-white"
                                        onClick={() => setIsEditDialogOpen(true)}
                                    >
                                        {invoice?.status === 'PENDING' ? 'Completar Datos' : 'Editar Datos'}
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* Provider Info */}
                        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-md rounded-[2.5rem] p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Building2 className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-white text-sm leading-none">{invoice.provider_name}</h4>
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1.5">{invoice.provider_tax_id}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="ml-auto rounded-xl text-white/20 hover:text-white hover:bg-white/5">
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-[1.5rem]">
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-2">Vinculación Proyecto</span>
                                    <div className="flex items-center gap-2">
                                        {invoice.project_name ? (
                                            <>
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                                <span className="text-xs text-white font-medium uppercase tracking-tight">{invoice.project_name}</span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-white/20 italic font-medium">Sin proyecto asignado</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Totals Summary */}
                        <Card className="bg-zinc-950 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-black">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-white/40 font-medium">
                                    <span className="text-xs uppercase tracking-widest">Base Imponible</span>
                                    <span className="font-mono text-sm">{formatCurrency(invoice.tax_base || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-white/40 font-medium">
                                    <span className="text-xs uppercase tracking-widest">Impuestos (IVA)</span>
                                    <span className="font-mono text-sm">{formatCurrency(invoice.tax_amount || 0)}</span>
                                </div>
                                <Separator className="bg-white/5 my-2" />
                                <div className="flex justify-between items-end pt-2">
                                    <div>
                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block mb-1">Total Documento</span>
                                        <span className="text-3xl font-black text-white tracking-tighter leading-none">
                                            {formatCurrency(invoice.total || 0)}
                                        </span>
                                    </div>
                                </div>

                                {(invoice.pending_amount || 0) > 0 && (
                                    <div className="mt-6 bg-red-500/5 border border-red-500/10 p-4 rounded-3xl flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Info className="h-3.5 w-3.5 text-red-400" />
                                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Pendiente de Pago</span>
                                        </div>
                                        <span className="text-sm font-black text-red-400">{formatCurrency(invoice.pending_amount || 0)}</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
        {invoice && (
            <CreatePurchaseInvoiceDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onSuccess={() => {
                    fetchInvoiceData();
                    setIsEditDialogOpen(false);
                }}
                preselectedDocumentId={invoiceId}
                preselectedSupplierId={invoice?.supplier_id || (invoice?.provider_id && invoice?.provider_type === 'SUPPLIER' ? invoice.provider_id : undefined)}
                preselectedTechnicianId={invoice?.technician_id || (invoice?.provider_id && invoice?.provider_type === 'TECHNICIAN' ? invoice.provider_id : undefined)}
                preselectedClientId={invoice?.client_id}
                preselectedProjectId={invoice?.project_id}
                documentType={invoice?.document_type || "INVOICE"}
            />
        )}
    );
};

const PurchaseInvoiceDetailPage = createMobilePage({
  DesktopComponent: PurchaseInvoiceDetailPageDesktop,
  MobileComponent: PurchaseInvoiceDetailPageMobile,
});

export default PurchaseInvoiceDetailPage;
