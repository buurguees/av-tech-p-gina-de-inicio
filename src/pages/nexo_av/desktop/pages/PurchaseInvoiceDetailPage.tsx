import { useState, useEffect, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Building2,
    Calendar,
    FileText,
    Trash2,
    Download,
    Plus,
    Info,
    ChevronRight,
    UserRound,
    Save,
    X,
    Edit,
    Loader2,
    GripVertical
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import SupplierSearchInput from "../components/suppliers/SupplierSearchInput";
import ProjectSearchInput from "../components/projects/ProjectSearchInput";
import ProductSearchInput from "../components/common/ProductSearchInput";
import PurchaseInvoicePaymentsSection from "../components/purchases/PurchaseInvoicePaymentsSection";


interface PurchaseInvoiceLine {
    id?: string;
    tempId?: string;
    concept: string;
    description?: string | null;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    withholding_tax_rate: number; // IRPF
    subtotal: number;
    tax_amount: number;
    withholding_amount: number; // IRPF amount
    total: number;
    isNew?: boolean;
    isModified?: boolean;
    isDeleted?: boolean;
}

interface TaxOption {
    value: number;
    label: string;
}

const PurchaseInvoiceDetailPageDesktop = () => {
    const { userId, invoiceId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [invoice, setInvoice] = useState<any>(null);
    const [lines, setLines] = useState<PurchaseInvoiceLine[]>([]);
    const [originalLines, setOriginalLines] = useState<PurchaseInvoiceLine[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    
    // Edit mode state
    const [supplierSearchValue, setSupplierSearchValue] = useState("");
    const [projectSearchValue, setProjectSearchValue] = useState("");
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
    const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
    const [entityType, setEntityType] = useState<"SUPPLIER" | "TECHNICIAN">("SUPPLIER");
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [issueDate, setIssueDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [notes, setNotes] = useState("");
    const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
    
    // Tax options
    const [taxOptions, setTaxOptions] = useState<TaxOption[]>([]);
    const [defaultTaxRate, setDefaultTaxRate] = useState(21);
    const [numericInputValues, setNumericInputValues] = useState<Record<string, string>>({});

    useEffect(() => {
        if (invoiceId) {
            fetchInvoiceData();
            fetchTaxes();
        }
    }, [invoiceId]);

    const fetchTaxes = async () => {
        try {
            const { data, error } = await supabase.rpc("list_taxes", { p_tax_type: "purchase" });
            if (error) throw error;

            const options: TaxOption[] = (data || [])
                .filter((t: any) => t.is_active)
                .map((t: any) => ({
                    value: t.rate,
                    label: t.name,
                }));

            setTaxOptions(options.length > 0 ? options : [{ value: 21, label: "IVA 21%" }]);

            const defaultTax = (data || []).find((t: any) => t.is_default && t.is_active);
            if (defaultTax) {
                setDefaultTaxRate(defaultTax.rate);
            } else if (options.length > 0) {
                setDefaultTaxRate(options[0].value);
            }
        } catch (error) {
            console.error("Error fetching taxes:", error);
            setTaxOptions([{ value: 21, label: "IVA 21%" }]);
        }
    };

    const fetchInvoiceData = async () => {
        if (!invoiceId) return;
        try {
            setLoading(true);
            const { data: invoiceData, error: invoiceError } = await supabase.rpc("get_purchase_invoice", {
                p_invoice_id: invoiceId
            });

            if (invoiceError) throw invoiceError;
            if (!invoiceData || invoiceData.length === 0) {
                toast.error("Documento no encontrado");
                navigate(`/nexo-av/${userId}/purchase-invoices`);
                return;
            }

            const record = invoiceData[0];
            
            // Normalizar datos del proveedor/técnico para el frontend
            const normalizedRecord = {
                ...record,
                provider_name: record.supplier_name || record.technician_name || null,
                provider_tax_id: record.supplier_tax_id || record.technician_tax_id || null,
                provider_number: record.supplier_number || record.technician_number || null,
                provider_type: record.supplier_id ? 'SUPPLIER' : (record.technician_id ? 'TECHNICIAN' : null),
            };
            
            setInvoice(normalizedRecord);

            // Set edit mode values
            if (record.supplier_id) {
                setEntityType("SUPPLIER");
                setSelectedSupplierId(record.supplier_id);
                setSupplierSearchValue(record.supplier_name || "");
            } else if (record.technician_id) {
                setEntityType("TECHNICIAN");
                setSelectedTechnicianId(record.technician_id);
                setSupplierSearchValue(record.technician_name || "");
            }
            setSelectedProjectId(record.project_id || "");
            setProjectSearchValue(record.project_name || "");
            setIssueDate(record.issue_date ? record.issue_date.split("T")[0] : "");
            setDueDate(record.due_date ? record.due_date.split("T")[0] : "");
            setNotes(record.notes || "");
            setSupplierInvoiceNumber(record.supplier_invoice_number || "");

            // Obtener URL del PDF si existe
            if (record.file_path) {
                try {
                    // Limpiar el path por si tiene espacios o caracteres especiales
                    const cleanPath = record.file_path.trim();
                    
                    // Intentar crear URL firmada directamente
                    const { data: urlData, error: urlError } = await supabase.storage
                        .from('purchase-documents')
                        .createSignedUrl(cleanPath, 3600);
                    
                    if (urlError) {
                        console.error("Error creating signed URL:", urlError);
                        console.error("File path:", cleanPath);
                        console.error("Error details:", JSON.stringify(urlError, null, 2));
                        
                        // Si el error es 400/404, el archivo no existe o no hay permisos
                        const errorMessage = urlError.message || '';
                        const statusCode = (urlError as any).statusCode || (urlError as any).status || '';
                        
                        if (statusCode === 404 || statusCode === '404' || 
                            errorMessage.includes('not found') || 
                            errorMessage.includes('No such file') ||
                            errorMessage.includes('Object not found')) {
                            console.warn("File does not exist in storage or no access:", cleanPath);
                            // No establecer pdfUrl para que muestre "Sin archivo"
                            setPdfUrl(null);
                            // No mostrar toast aquí para evitar spam, solo en consola
                        } else {
                            console.error(`Error al cargar la imagen: ${errorMessage || 'Error desconocido'}`);
                            setPdfUrl(null);
                        }
                    } else if (urlData) {
                        setPdfUrl(urlData.signedUrl);
                    }
                } catch (err: any) {
                    console.error("Error getting PDF URL:", err);
                    setPdfUrl(null);
                }
            } else {
                setPdfUrl(null);
            }

            // Líneas usando RPC
            const { data: linesData, error: linesError } = await supabase.rpc('get_purchase_invoice_lines', {
                p_invoice_id: invoiceId
            });

            if (linesError) throw linesError;
            const mappedLines: PurchaseInvoiceLine[] = (linesData || []).map((l: any) => ({
                id: l.id,
                concept: l.concept,
                description: l.description,
                quantity: l.quantity,
                unit_price: l.unit_price,
                tax_rate: l.tax_rate,
                withholding_tax_rate: l.withholding_tax_rate || 0,
                subtotal: l.subtotal,
                tax_amount: l.tax_amount,
                withholding_amount: l.withholding_amount || 0,
                total: l.total,
            }));
            setLines(mappedLines);
            setOriginalLines(JSON.parse(JSON.stringify(mappedLines)));

        } catch (error: any) {
            console.error("Error fetching purchase invoice:", error);
            toast.error("Error al cargar los detalles");
        } finally {
            setLoading(false);
        }
    };

    const calculateLineValues = (line: Partial<PurchaseInvoiceLine>): PurchaseInvoiceLine => {
        const quantity = line.quantity || 0;
        const unitPrice = line.unit_price || 0;
        const taxRate = line.tax_rate || defaultTaxRate;
        const withholdingTaxRate = line.withholding_tax_rate || 0; // IRPF - Retención a cuenta de Hacienda

        // Base imponible: Es el gasto real de la empresa
        const subtotal = quantity * unitPrice;
        
        // IVA soportado: Se suma al total (deducible)
        const taxAmount = (subtotal * taxRate) / 100;
        
        // IRPF retenido: Retención que se paga a Hacienda (NO reduce el gasto, solo reduce el pago)
        // Es un pasivo (deuda con Hacienda), no un descuento comercial
        const withholdingAmount = (subtotal * withholdingTaxRate) / 100;
        
        // Total a pagar al autónomo: Base + IVA - IRPF retenido
        // El IRPF se retiene y se ingresa a Hacienda trimestralmente (modelo 111)
        const total = subtotal + taxAmount - withholdingAmount;

        return {
            ...line,
            concept: line.concept || "",
            description: line.description || null,
            quantity,
            unit_price: unitPrice,
            tax_rate: taxRate,
            withholding_tax_rate: withholdingTaxRate,
            subtotal: Math.round(subtotal * 100) / 100,
            tax_amount: Math.round(taxAmount * 100) / 100,
            withholding_amount: Math.round(withholdingAmount * 100) / 100,
            total: Math.round(total * 100) / 100,
        } as PurchaseInvoiceLine;
    };

    const addLine = () => {
        // Obtener el IRPF del técnico seleccionado si existe
        let defaultWithholdingRate = 0;
        if (selectedTechnicianId && entityType === "TECHNICIAN") {
            // Buscar el técnico en los resultados de búsqueda o hacer una consulta
            // Por ahora, usaremos 0 y se actualizará cuando se guarde
            // El IRPF se aplicará desde el backend cuando se guarde la línea
        }
        
        const newLine = calculateLineValues({
            tempId: crypto.randomUUID(),
            concept: "",
            quantity: 1,
            unit_price: 0,
            tax_rate: defaultTaxRate,
            withholding_tax_rate: defaultWithholdingRate,
            isNew: true,
        });
        setLines([...lines, newLine]);
    };

    const updateLine = (index: number, field: keyof PurchaseInvoiceLine, value: any) => {
        const updatedLines = [...lines];
        const line = updatedLines[index];
        updatedLines[index] = calculateLineValues({
            ...line,
            [field]: value,
            isModified: line.id ? true : line.isModified,
        });
        setLines(updatedLines);
    };

    const handleProductSelect = (index: number, item: { id: string; type: string; name: string; code: string; price: number; tax_rate: number; description?: string }) => {
        const updatedLines = [...lines];
        const currentLine = updatedLines[index];
        const currentQuantity = currentLine.quantity;

        const lineData = {
            ...currentLine,
            concept: item.name,
            description: item.description || null,
            unit_price: item.price,
            tax_rate: item.tax_rate || defaultTaxRate,
            quantity: currentQuantity,
            isModified: currentLine.id ? true : currentLine.isModified,
        };

        updatedLines[index] = calculateLineValues(lineData);
        setLines(updatedLines);
    };

    const removeLine = (index: number) => {
        const line = lines[index];
        if (line.id) {
            const updatedLines = [...lines];
            updatedLines[index] = { ...line, isDeleted: true };
            setLines(updatedLines);
        } else {
            setLines(lines.filter((_, i) => i !== index));
        }
    };

    const getVisibleLines = () => lines.filter(l => !l.isDeleted);

    const parseNumericInput = (value: string): number => {
        if (!value || value === '') return 0;
        let cleaned = value.trim();
        const dotCount = (cleaned.match(/\./g) || []).length;
        const commaCount = (cleaned.match(/,/g) || []).length;

        if (commaCount > 0) {
            cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
        } else if (dotCount === 1) {
            const dotIndex = cleaned.indexOf('.');
            const afterDot = cleaned.substring(dotIndex + 1);
            if (afterDot.length <= 2 && /^\d+$/.test(afterDot)) {
                cleaned = cleaned;
            } else {
                cleaned = cleaned.replace(/\./g, '');
            }
        } else if (dotCount > 1) {
            cleaned = cleaned.replace(/\./g, '');
        }

        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    const formatNumericDisplay = (value: number | string): string => {
        if (value === '' || value === null || value === undefined) return '';
        const num = typeof value === 'string' ? parseNumericInput(value) : value;
        if (isNaN(num) || num === 0) return '';
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(num);
    };

    const handleNumericInputChange = (value: string, field: 'quantity' | 'unit_price' | 'withholding_tax_rate', realIndex: number) => {
        const inputKey = `${realIndex}-${field}`;
        setNumericInputValues(prev => ({ ...prev, [inputKey]: value }));

        if (value === '' || value === null || value === undefined) {
            updateLine(realIndex, field, 0);
            return;
        }

        const numericValue = parseNumericInput(value);
        updateLine(realIndex, field, numericValue);
    };

    const getNumericDisplayValue = (value: number, field: 'quantity' | 'unit_price' | 'withholding_tax_rate', realIndex: number): string => {
        const inputKey = `${realIndex}-${field}`;
        const storedValue = numericInputValues[inputKey];
        if (storedValue !== undefined) return storedValue;
        if (value === 0) return '';
        return formatNumericDisplay(value);
    };

    const handleSave = async () => {
        // Si está bloqueada, solo permitir guardar notas
        if (isLocked) {
            setSaving(true);
            try {
                const { error: updateError } = await supabase.rpc("update_purchase_invoice", {
                    p_invoice_id: invoiceId!,
                    p_notes: notes.trim() || null,
                } as any);
                if (updateError) throw updateError;
                toast.success("Notas actualizadas correctamente");
                setIsEditing(false);
                fetchInvoiceData();
            } catch (error: any) {
                console.error("Error saving notes:", error);
                toast.error(error.message || "Error al guardar las notas");
            } finally {
                setSaving(false);
            }
            return;
        }

        if (!selectedSupplierId && !selectedTechnicianId) {
            toast.error("Selecciona un proveedor o técnico");
            return;
        }

        setSaving(true);
        try {
            // Update invoice header
            const { error: updateError } = await supabase.rpc("update_purchase_invoice", {
                p_invoice_id: invoiceId!,
                p_supplier_id: entityType === "SUPPLIER" ? selectedSupplierId : null,
                p_technician_id: entityType === "TECHNICIAN" ? selectedTechnicianId : null,
                p_project_id: selectedProjectId || null,
                p_issue_date: issueDate || null,
                p_due_date: dueDate || null,
                p_notes: notes.trim() || null,
                p_supplier_invoice_number: supplierInvoiceNumber.trim() || null,
                p_status: invoice?.status === 'PENDING' ? 'REGISTERED' : invoice?.status,
            } as any);

            if (updateError) throw updateError;

            // Process line changes
            for (const line of lines) {
                if (line.isDeleted && line.id) {
                    const { error } = await supabase.rpc("delete_purchase_invoice_line", {
                        p_line_id: line.id,
                    } as any);
                    if (error) throw error;
                } else if (line.isNew && !line.isDeleted && line.concept.trim()) {
                    const { error } = await supabase.rpc("add_purchase_invoice_line", {
                        p_invoice_id: invoiceId!,
                        p_concept: line.concept.trim(),
                        p_description: line.description?.trim() || null,
                        p_quantity: line.quantity,
                        p_unit_price: line.unit_price,
                        p_tax_rate: line.tax_rate,
                        p_withholding_tax_rate: line.withholding_tax_rate || 0,
                    } as any);
                    if (error) throw error;
                } else if (line.isModified && line.id && !line.isDeleted) {
                    const { error } = await supabase.rpc("update_purchase_invoice_line", {
                        p_line_id: line.id,
                        p_concept: line.concept.trim(),
                        p_description: line.description?.trim() || null,
                        p_quantity: line.quantity,
                        p_unit_price: line.unit_price,
                        p_tax_rate: line.tax_rate,
                        p_withholding_tax_rate: line.withholding_tax_rate || 0,
                    } as any);
                    if (error) throw error;
                }
            }

            // Recalculate totals (las funciones de líneas ya lo hacen, pero lo hacemos por si acaso)
            try {
                await supabase.rpc("recalculate_purchase_invoice", {
                    p_invoice_id: invoiceId!,
                } as any);
            } catch (recalcError) {
                // Si falla el recálculo, no es crítico, las líneas ya calcularon sus totales
                console.warn("Warning: Could not recalculate invoice totals:", recalcError);
            }

            toast.success("Factura actualizada correctamente");
            setIsEditing(false);
            fetchInvoiceData();
        } catch (error: any) {
            console.error("Error saving invoice:", error);
            toast.error(error.message || "Error al guardar la factura");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setLines(JSON.parse(JSON.stringify(originalLines)));
        setIsEditing(false);
        // Reset edit values
        if (invoice) {
            if (invoice.supplier_id) {
                setEntityType("SUPPLIER");
                setSelectedSupplierId(invoice.supplier_id);
                setSupplierSearchValue(invoice.supplier_name || "");
            } else if (invoice.technician_id) {
                setEntityType("TECHNICIAN");
                setSelectedTechnicianId(invoice.technician_id);
                setSupplierSearchValue(invoice.technician_name || "");
            }
            setSelectedProjectId(invoice.project_id || "");
            setProjectSearchValue(invoice.project_name || "");
            setIssueDate(invoice.issue_date ? invoice.issue_date.split("T")[0] : "");
            setDueDate(invoice.due_date ? invoice.due_date.split("T")[0] : "");
            setNotes(invoice.notes || "");
            setSupplierInvoiceNumber(invoice.supplier_invoice_number || "");
        }
    };

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

    const getTotals = () => {
        const visibleLines = getVisibleLines();
        const subtotal = visibleLines.reduce((acc, line) => acc + line.subtotal, 0);
        const total = visibleLines.reduce((acc, line) => acc + line.total, 0);

        // Agrupar IVA por tasa
        const taxesByRate: Record<number, { rate: number; amount: number; label: string }> = {};
        visibleLines.forEach((line) => {
            if (line.tax_amount !== 0) {
                if (!taxesByRate[line.tax_rate]) {
                    const taxOption = taxOptions.find(t => t.value === line.tax_rate);
                    taxesByRate[line.tax_rate] = {
                        rate: line.tax_rate,
                        amount: 0,
                        label: taxOption?.label || `IVA ${line.tax_rate}%`,
                    };
                }
                taxesByRate[line.tax_rate].amount += line.tax_amount;
            }
        });

        // Calcular IRPF total retenido (pasivo con Hacienda)
        // Este importe se retiene del pago al autónomo y se ingresa a Hacienda trimestralmente
        const totalWithholding = visibleLines.reduce((acc, line) => acc + (line.withholding_amount || 0), 0);

        return {
            subtotal,
            taxes: Object.values(taxesByRate).sort((a, b) => b.rate - a.rate),
            withholding: totalWithholding,
            total,
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 border-4 border-white/5 border-t-red-500 rounded-full animate-spin" />
                <p className="text-white/20 font-bold uppercase tracking-widest text-[10px]">Cargando registro de gasto</p>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4">
                <p className="text-white/60">Documento no encontrado</p>
                <Button onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)}>
                    Volver a Facturas de Compra
                </Button>
            </div>
        );
    }

    const visibleLines = getVisibleLines();
    const totals = getTotals();
    
    // Verificar si está bloqueada o confirmada
    const isLocked = invoice?.is_locked || invoice?.status === 'CONFIRMED';
    const isConfirmed = invoice?.status === 'CONFIRMED';
    const canEdit = !isLocked || (isLocked && isEditing); // Permitir editar solo notas si está bloqueada

    const handleConfirm = async () => {
        if (!selectedSupplierId && !selectedTechnicianId) {
            toast.error("Selecciona un proveedor o técnico antes de confirmar");
            return;
        }

        setSaving(true);
        try {
            // Primero guardar los datos actuales
            const { error: updateError } = await supabase.rpc("update_purchase_invoice", {
                p_invoice_id: invoiceId!,
                p_supplier_id: entityType === "SUPPLIER" ? selectedSupplierId : null,
                p_technician_id: entityType === "TECHNICIAN" ? selectedTechnicianId : null,
                p_project_id: selectedProjectId || null,
                p_issue_date: issueDate || null,
                p_due_date: dueDate || null,
                p_notes: notes.trim() || null,
                p_supplier_invoice_number: supplierInvoiceNumber.trim() || null,
                p_status: 'CONFIRMED',
            } as any);

            if (updateError) throw updateError;

            // Guardar líneas si hay cambios
            for (const line of lines) {
                if (line.isDeleted && line.id) {
                    const { error } = await supabase.rpc("delete_purchase_invoice_line", {
                        p_line_id: line.id,
                    } as any);
                    if (error) throw error;
                } else if (line.isNew && !line.isDeleted && line.concept.trim()) {
                    const { error } = await supabase.rpc("add_purchase_invoice_line", {
                        p_invoice_id: invoiceId!,
                        p_concept: line.concept.trim(),
                        p_description: line.description?.trim() || null,
                        p_quantity: line.quantity,
                        p_unit_price: line.unit_price,
                        p_tax_rate: line.tax_rate,
                        p_withholding_tax_rate: line.withholding_tax_rate || 0,
                    } as any);
                    if (error) throw error;
                } else if (line.isModified && line.id && !line.isDeleted) {
                    const { error } = await supabase.rpc("update_purchase_invoice_line", {
                        p_line_id: line.id,
                        p_concept: line.concept.trim(),
                        p_description: line.description?.trim() || null,
                        p_quantity: line.quantity,
                        p_unit_price: line.unit_price,
                        p_tax_rate: line.tax_rate,
                        p_withholding_tax_rate: line.withholding_tax_rate || 0,
                    } as any);
                    if (error) throw error;
                }
            }

            toast.success("Factura confirmada correctamente. Número interno generado.");
            setIsEditing(false);
            fetchInvoiceData();
        } catch (error: any) {
            console.error("Error confirming invoice:", error);
            toast.error(error.message || "Error al confirmar la factura");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full h-full px-6 py-6">
            <div className="w-full mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 flex-shrink-0"
                            onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices`)}
                            title="Volver a Facturas de Compra"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold text-white tracking-tight">
                                {invoice.document_type === 'INVOICE' ? 'Factura de Compra' : 'Gasto / Ticket'}
                            </h1>
                            <p className="text-white/40 text-xs font-mono">
                              {invoice.internal_purchase_number || 
                               invoice.supplier_invoice_number || 
                               invoice.invoice_number || 
                               'Sin número'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge className={cn(
                            invoice.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                invoice.status === 'PARTIAL' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                    invoice.status === 'PENDING' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                        invoice.status === 'CONFIRMED' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                            invoice.status === 'REGISTERED' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                                "bg-white/5 text-white/40 border-white/10"
                        )}>
                            {invoice.status === 'PENDING' ? 'Pendiente' : 
                             invoice.status === 'REGISTERED' ? 'Registrado' : 
                             invoice.status === 'CONFIRMED' ? 'Confirmado' :
                             invoice.status === 'PAID' ? 'Pagado' : 
                             invoice.status === 'PARTIAL' ? 'Parcial' : invoice.status}
                        </Badge>
                        {!isEditing && !isLocked && (
                            <Button
                                variant="outline"
                                onClick={() => setIsEditing(true)}
                                className="border-white/5 bg-white/5 text-white/60 font-bold hover:bg-white/10 hover:text-white"
                            >
                                {invoice.status === 'PENDING' ? (
                                    <>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Completar Datos
                                    </>
                                ) : (
                                    <>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Editar Datos
                                    </>
                                )}
                            </Button>
                        )}
                        {isEditing && !isConfirmed && (
                            <Button
                                onClick={handleConfirm}
                                disabled={saving}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Confirmar Factura
                            </Button>
                        )}
                        {isEditing && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="border-white/5 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    Guardar
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left Column - Editing Area (Information + Lines) */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Invoice Info */}
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-white text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Información del Documento
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isEditing ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label className="text-white/70 text-sm">Proveedor o Técnico *</Label>
                                            <SupplierSearchInput
                                                value={supplierSearchValue}
                                                onChange={setSupplierSearchValue}
                                                onSelectSupplier={(supplier) => {
                                                    setSelectedSupplierId(supplier.id);
                                                    setSupplierSearchValue(supplier.company_name);
                                                    setEntityType("SUPPLIER");
                                                    setSelectedTechnicianId("");
                                                }}
                                                onSelectTechnician={async (technician) => {
                                                    setSelectedTechnicianId(technician.id);
                                                    setSupplierSearchValue(technician.company_name);
                                                    setEntityType("TECHNICIAN");
                                                    setSelectedSupplierId("");
                                                    
                                                    // Aplicar el IRPF del técnico a todas las líneas existentes
                                                    const withholdingRate = technician.withholding_tax_rate || 0;
                                                    if (withholdingRate > 0 && lines.length > 0) {
                                                        const updatedLines = lines.map(line => 
                                                            calculateLineValues({
                                                                ...line,
                                                                withholding_tax_rate: withholdingRate
                                                            })
                                                        );
                                                        setLines(updatedLines);
                                                    }
                                                }}
                                                placeholder="Buscar proveedor o técnico... o @buscar"
                                                entityType="BOTH"
                                                className="bg-white/10 border-white/20 text-white"
                                                disabled={isLocked}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-white/70 text-sm">Nº Factura Proveedor/Técnico</Label>
                                            <Input
                                                value={supplierInvoiceNumber}
                                                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                                                placeholder="Número de factura del proveedor o técnico"
                                                className="bg-white/10 border-white/20 text-white"
                                                disabled={isLocked}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-white/70 text-sm">Proyecto (Opcional)</Label>
                                            <ProjectSearchInput
                                                value={projectSearchValue}
                                                onChange={setProjectSearchValue}
                                                onSelectProject={(project) => {
                                                    setSelectedProjectId(project.id);
                                                    setProjectSearchValue(project.project_name);
                                                }}
                                                placeholder="Buscar proyecto... o @buscar"
                                                className="bg-white/10 border-white/20 text-white"
                                                showDropdown={true}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-white/40 text-xs mb-1 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Emisión
                                                </Label>
                                                <Input
                                                    type="date"
                                                    value={issueDate}
                                                    onChange={(e) => setIssueDate(e.target.value)}
                                                    className="bg-white/10 border-white/20 text-white"
                                                    disabled={isLocked}
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-white/40 text-xs mb-1 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Vencimiento
                                                </Label>
                                                <Input
                                                    type="date"
                                                    value={dueDate}
                                                    onChange={(e) => setDueDate(e.target.value)}
                                                    className="bg-white/10 border-white/20 text-white"
                                                    disabled={isLocked}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-white/70 text-sm">Notas {isLocked && <span className="text-white/40 text-xs">(Siempre editable)</span>}</Label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="w-full min-h-[80px] bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm resize-none"
                                                placeholder="Notas adicionales..."
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                            {invoice.supplier_invoice_number && (
                                                <div>
                                                    <p className="text-white/40 text-xs mb-1">Nº Factura Proveedor/Técnico</p>
                                                    <p className="text-white font-mono font-medium">{invoice.supplier_invoice_number}</p>
                                                </div>
                                            )}
                                            {invoice.internal_purchase_number && (
                                                <div>
                                                    <p className="text-white/40 text-xs mb-1">Nº Compra Interno</p>
                                                    <p className="text-white font-mono font-bold">{invoice.internal_purchase_number}</p>
                                                </div>
                                            )}
                                            {!invoice.supplier_invoice_number && !invoice.internal_purchase_number && invoice.invoice_number && (
                                                <div>
                                                    <p className="text-white/40 text-xs mb-1">Número</p>
                                                    <p className="text-white font-mono">{invoice.invoice_number}</p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-white/40 text-xs mb-1">Estado</p>
                                                <Badge className={cn(
                                                    invoice.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                        invoice.status === 'PARTIAL' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                            invoice.status === 'PENDING' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                                invoice.status === 'CONFIRMED' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                                    invoice.status === 'REGISTERED' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                                                        "bg-white/5 text-white/40 border-white/10"
                                                )}>
                                                    {invoice.status === 'PENDING' ? 'Pendiente' : 
                                                     invoice.status === 'REGISTERED' ? 'Registrado' : 
                                                     invoice.status === 'CONFIRMED' ? 'Confirmado' :
                                                     invoice.status === 'PAID' ? 'Pagado' : 
                                                     invoice.status === 'PARTIAL' ? 'Parcial' : invoice.status}
                                                </Badge>
                                            </div>
                                        </div>

                                        <Separator className="bg-white/10" />

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-white/40 text-xs mb-1 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Emisión
                                                </p>
                                                <p className="text-white">{formatDate(invoice.issue_date)}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/40 text-xs mb-1 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Vencimiento
                                                </p>
                                                <p className="text-white">{formatDate(invoice.due_date)}</p>
                                            </div>
                                        </div>

                                        <Separator className="bg-white/10" />

                                        {/* Provider Info */}
                                        {invoice.provider_name && (
                                            <div>
                                                <p className="text-white/40 text-xs mb-1 flex items-center gap-1">
                                                    <Building2 className="w-3 h-3" />
                                                    {invoice.provider_type === 'TECHNICIAN' ? 'Técnico' : 'Proveedor'}
                                                </p>
                                                <p className="text-white font-medium">{invoice.provider_name}</p>
                                                {invoice.provider_tax_id && (
                                                    <p className="text-white/60 text-sm">{invoice.provider_tax_id}</p>
                                                )}
                                                {(invoice.supplier_number || invoice.technician_number) && (
                                                    <p className="text-white/50 text-xs font-mono mt-1">
                                                        Nº: {invoice.supplier_number || invoice.technician_number}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Project Info */}
                                        {invoice.project_name && (
                                            <div>
                                                <p className="text-white/40 text-xs mb-1">Proyecto</p>
                                                <p className="text-white font-medium">{invoice.project_name}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Preview & Summary (Sticky) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* PDF Preview - Compact */}
                        <Card className="bg-white/5 border-white/10 overflow-hidden">
                            <CardContent className="p-0 h-full">
                                <div className="p-3 border-b border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-3.5 w-3.5 text-red-400" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Documento</span>
                                    </div>
                                    {pdfUrl && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-[9px] font-bold uppercase tracking-widest gap-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 px-2"
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = pdfUrl;
                                                link.download = invoice.file_name || 'documento.pdf';
                                                link.click();
                                            }}
                                        >
                                            <Download className="h-3 w-3" /> PDF
                                        </Button>
                                    )}
                                </div>
                                <div className="h-[300px] bg-black/20 flex flex-col items-center justify-center p-3">
                                    {pdfUrl ? (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {invoice.file_name?.toLowerCase().endsWith('.pdf') ? (
                                                <iframe
                                                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&zoom=page-fit`}
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
                                    ) : (
                                        <>
                                            <FileText className="h-12 w-12 text-white/5 mb-3" />
                                            <p className="text-white/40 font-bold uppercase tracking-tighter text-xs">Sin archivo</p>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Totals Summary - Sticky */}
                        <div className="sticky top-6">
                            <Card className="bg-white/5 border-white/10">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-lg">Resumen</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between text-white/70 text-sm">
                                        <span>Base imponible</span>
                                        <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                                    </div>
                                    {totals.taxes.map((tax) => (
                                        <div key={tax.rate} className="flex justify-between text-white/70 text-sm">
                                            <span>{tax.label}</span>
                                            <span className="font-medium">{formatCurrency(tax.amount)}</span>
                                        </div>
                                    ))}
                                    {totals.withholding > 0 && (
                                        <div className="flex justify-between text-white/70 text-sm">
                                            <span>IRPF retenido</span>
                                            <span className="text-red-400 font-medium">-{formatCurrency(totals.withholding)}</span>
                                        </div>
                                    )}
                                    <Separator className="bg-white/10 my-2" />
                                    <div className="flex justify-between text-white font-bold text-lg pt-1">
                                        <span>Total</span>
                                        <span>{formatCurrency(totals.total)}</span>
                                    </div>
                                    {invoice.status !== "PENDING" && (
                                        <>
                                            <Separator className="bg-white/10 my-2" />
                                            <div className="flex justify-between text-emerald-400 font-medium text-sm">
                                                <span>Pagado</span>
                                                <span>{formatCurrency(invoice.paid_amount || 0)}</span>
                                            </div>
                                            <div className="flex justify-between text-amber-500 font-bold text-sm">
                                                <span>Pendiente</span>
                                                <span>{formatCurrency(invoice.pending_amount || 0)}</span>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Payments Section */}
                            {invoice.status !== "PENDING" && (
                                <div className="mt-6">
                                    <PurchaseInvoicePaymentsSection
                                        invoiceId={invoice.id}
                                        total={totals.total}
                                        paidAmount={invoice.paid_amount || 0}
                                        pendingAmount={invoice.pending_amount || 0}
                                        status={invoice.status}
                                        isLocked={isLocked}
                                        onPaymentChange={fetchInvoiceData}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Lines Table - Full Width */}
                <Card className="w-full bg-white/5 border-white/10 overflow-hidden mt-6">
                    <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-white text-lg flex items-center gap-2">
                                        <FileText className="w-5 w-5" />
                                        Conceptos del Gasto
                                    </CardTitle>
                                    {isEditing && !isLocked && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={addLine}
                                            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Añadir Línea
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-white/[0.01]">
                                            <TableRow className="border-white/5 hover:bg-transparent bg-white/[0.03]">
                                                {isEditing && !isLocked && <TableHead className="text-white/60 w-8 px-2 py-3 text-xs font-semibold uppercase tracking-wider"></TableHead>}
                                                <TableHead className="text-white/80 px-3 py-3 text-xs font-semibold uppercase tracking-wider" style={{ width: isEditing && !isLocked ? '25%' : '30%' }}>Concepto</TableHead>
                                                {isEditing && !isLocked && <TableHead className="text-white/80 px-3 py-3 text-xs font-semibold uppercase tracking-wider" style={{ width: '20%' }}>Descripción</TableHead>}
                                                <TableHead className="text-white/80 text-center px-2 py-3 text-xs font-semibold uppercase tracking-wider" style={{ width: '8%' }}>Cant.</TableHead>
                                                <TableHead className="text-white/80 text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider" style={{ width: '12%' }}>Precio</TableHead>
                                                <TableHead className="text-white/80 text-center px-2 py-3 text-xs font-semibold uppercase tracking-wider" style={{ width: '8%' }}>IVA</TableHead>
                                                {isEditing && !isLocked && (
                                                    <TableHead className="text-white/80 text-center px-2 py-3 text-xs font-semibold uppercase tracking-wider" style={{ width: '8%' }} title="IRPF: Retención a cuenta de Hacienda (se ingresa trimestralmente en modelo 111)">
                                                        IRPF %
                                                    </TableHead>
                                                )}
                                                <TableHead className="text-white/80 text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider" style={{ width: '12%' }}>Total</TableHead>
                                                {isEditing && !isLocked && <TableHead className="text-white/60 w-10 px-2 py-3"></TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {visibleLines.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={isEditing && !isLocked ? 8 : (isEditing ? 6 : 5)} className="text-center py-12">
                                                        <p className="text-white/40 text-sm mb-2">No hay líneas en esta factura</p>
                                                        {isEditing && !isLocked && (
                                                            <Button
                                                                variant="link"
                                                                onClick={addLine}
                                                                className="text-orange-500 text-sm"
                                                            >
                                                                Añadir primera línea
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                visibleLines.map((line, index) => {
                                                    const realIndex = lines.findIndex(l => (l.id || l.tempId) === (line.id || line.tempId));
                                                    return (
                                                        <TableRow
                                                            key={line.tempId || line.id}
                                                            className="border-white/5 hover:bg-white/[0.04] transition-colors duration-150 group"
                                                        >
                                                            {isEditing && !isLocked && (
                                                                <TableCell className="text-white/20 group-hover:text-white/40 px-2 py-3.5 transition-colors">
                                                                    <GripVertical className="h-4 w-4" />
                                                                </TableCell>
                                                            )}
                                                            <TableCell className="px-3 py-3.5">
                                                                {isEditing && !isLocked ? (
                                                                    <ProductSearchInput
                                                                        value={line.concept}
                                                                        onChange={(value) => updateLine(realIndex, "concept", value)}
                                                                        onSelectItem={(item) => handleProductSelect(realIndex, item)}
                                                                        placeholder="Concepto o @buscar"
                                                                        className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm font-medium pl-1 pr-0 py-2 w-full hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                                                                    />
                                                                ) : (
                                                                    <span className="text-white text-sm">{line.concept}</span>
                                                                )}
                                                            </TableCell>
                                                            {isEditing && !isLocked && (
                                                                <TableCell className="px-3 py-3.5">
                                                                    <Input
                                                                        value={line.description || ""}
                                                                        onChange={(e) => updateLine(realIndex, "description", e.target.value)}
                                                                        placeholder="Descripción opcional"
                                                                        className="bg-transparent border-0 border-b border-white/10 text-white/85 placeholder:text-white/25 h-auto text-sm pl-1 pr-0 py-2 hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors w-full"
                                                                    />
                                                                </TableCell>
                                                            )}
                                                            <TableCell className="px-2 py-3.5">
                                                                {isEditing && !isLocked ? (
                                                                    <div className="flex justify-center">
                                                                        <Input
                                                                            type="text"
                                                                            inputMode="numeric"
                                                                            value={getNumericDisplayValue(line.quantity, 'quantity', realIndex)}
                                                                            onChange={(e) => handleNumericInputChange(e.target.value, 'quantity', realIndex)}
                                                                            onBlur={() => {
                                                                                const inputKey = `${realIndex}-quantity`;
                                                                                setNumericInputValues(prev => {
                                                                                    const newValues = { ...prev };
                                                                                    delete newValues[inputKey];
                                                                                    return newValues;
                                                                                });
                                                                            }}
                                                                            className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm text-center font-medium px-0 py-2 w-full hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                                                                            placeholder="0"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center text-white/40 font-mono text-xs">{line.quantity}</div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="px-3 py-3.5">
                                                                {isEditing && !isLocked ? (
                                                                    <Input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        value={getNumericDisplayValue(line.unit_price, 'unit_price', realIndex)}
                                                                        onChange={(e) => handleNumericInputChange(e.target.value, 'unit_price', realIndex)}
                                                                        onBlur={() => {
                                                                            const inputKey = `${realIndex}-unit_price`;
                                                                            setNumericInputValues(prev => {
                                                                                const newValues = { ...prev };
                                                                                delete newValues[inputKey];
                                                                                return newValues;
                                                                            });
                                                                        }}
                                                                        className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm text-right font-medium px-0 py-2 w-full hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                                                                        placeholder="0,00"
                                                                    />
                                                                ) : (
                                                                    <div className="text-right font-mono text-xs text-white/60">{formatCurrency(line.unit_price)}</div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="px-2 py-3.5">
                                                                {isEditing && !isLocked ? (
                                                                    <div className="flex justify-center">
                                                                        <Select
                                                                            value={line.tax_rate.toString()}
                                                                            onValueChange={(v) => updateLine(realIndex, "tax_rate", parseFloat(v))}
                                                                        >
                                                                            <SelectTrigger className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm font-medium px-1 py-2 w-full hover:border-white/30 focus:border-orange-500/60 rounded-none shadow-none transition-colors">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent className="bg-zinc-900/95 backdrop-blur-xl border-white/20 shadow-2xl">
                                                                                {taxOptions.map((opt) => (
                                                                                    <SelectItem key={opt.value} value={opt.value.toString()} className="text-white hover:bg-white/10">
                                                                                        {opt.label}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-center">
                                                                        <Badge variant="outline" className="bg-blue-500/5 border-blue-500/10 text-blue-400 text-[9px] px-1.5 py-0">
                                                                            {line.tax_rate}%
                                                                        </Badge>
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            {isEditing && !isLocked && (
                                                                <TableCell className="px-2 py-3.5">
                                                                    <Input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        value={getNumericDisplayValue(line.withholding_tax_rate || 0, 'withholding_tax_rate', realIndex)}
                                                                        onChange={(e) => handleNumericInputChange(e.target.value, 'withholding_tax_rate', realIndex)}
                                                                        onBlur={() => {
                                                                            const inputKey = `${realIndex}-withholding_tax_rate`;
                                                                            setNumericInputValues(prev => {
                                                                                const newValues = { ...prev };
                                                                                delete newValues[inputKey];
                                                                                return newValues;
                                                                            });
                                                                        }}
                                                                        className="bg-transparent border-0 border-b border-white/10 text-white h-auto text-sm text-center font-medium px-0 py-2 w-full hover:border-white/30 focus:border-orange-500/60 focus-visible:ring-0 focus-visible:shadow-none rounded-none transition-colors"
                                                                        placeholder="0"
                                                                    />
                                                                </TableCell>
                                                            )}
                                                            <TableCell className="text-right text-white font-semibold px-3 py-3.5">
                                                                {formatCurrency(line.total)}
                                                            </TableCell>
                                                            {isEditing && !isLocked && (
                                                                <TableCell className="px-2 py-3.5">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => removeLine(realIndex)}
                                                                        className="text-white/30 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 transition-colors"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {isEditing && !isLocked && visibleLines.length > 0 && (
                                    <div className="p-5 border-t border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                                        <Button
                                            variant="outline"
                                            onClick={addLine}
                                            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 backdrop-blur-sm rounded-lg transition-all duration-200 h-10 px-4 font-medium"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Añadir línea
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
            </div>
        </div>
    );
};

export default PurchaseInvoiceDetailPageDesktop;
