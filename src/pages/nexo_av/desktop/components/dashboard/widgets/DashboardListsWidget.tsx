import { useState, useEffect } from "react";
import { FolderKanban, FileText, Receipt, ShoppingCart, ArrowRight, Clock, AlertTriangle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DashboardListsWidgetProps {
    userId: string | undefined;
}

// Reusing types from individual widgets
interface Project {
    id: string;
    project_name: string;
    client_name: string;
    status: string;
    created_at: string;
}

interface Quote {
    id: string;
    quote_number: string;
    client_name: string;
    total: number;
    valid_until: string;
    status: string;
}

interface Invoice {
    id: string;
    invoice_number: string;
    client_name: string;
    total: number;
    due_date: string;
    status: string;
}

interface PayableInvoice {
    id: string;
    vendor_name: string;
    amount: number;
    due_date: string;
}

type TabType = 'projects' | 'receivables' | 'payables' | 'quotes';

const DashboardListsWidget = ({ userId }: DashboardListsWidgetProps) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('projects');

    // Data States
    const [projects, setProjects] = useState<Project[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payables, setPayables] = useState<PayableInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, [userId]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                fetchProjects(),
                fetchQuotes(),
                fetchInvoices(),
                fetchPurchaseInvoices(),
            ]);
        } catch (err) {
            console.error('Error fetching dashboard lists:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        const { data } = await supabase.rpc('list_projects', { p_search: null });
        if (data) {
            const active = (data as any[])
                .filter(p => p.status === 'IN_PROGRESS' || p.status === 'PLANNED')
                .slice(0, 5);
            setProjects(active.map(p => ({
                id: p.id,
                project_name: p.project_name,
                client_name: p.client_name,
                status: p.status,
                created_at: p.created_at
            })));
        }
    };

    const fetchQuotes = async () => {
        const { data } = await supabase.rpc('list_quotes', { p_status: null, p_search: null });
        if (data) {
            // Presupuestos pendientes: DRAFT o SENT (no aprobados, rechazados, expirados ni facturados)
            const pending = (data as any[])
                .filter(q => ['DRAFT', 'SENT'].includes(q.status))
                .sort((a, b) => {
                    const dateA = a.valid_until ? new Date(a.valid_until).getTime() : Infinity;
                    const dateB = b.valid_until ? new Date(b.valid_until).getTime() : Infinity;
                    return dateA - dateB;
                })
                .slice(0, 5);
            setQuotes(pending.map(q => ({
                id: q.id,
                quote_number: q.quote_number,
                client_name: q.client_name,
                total: q.total,
                valid_until: q.valid_until,
                status: q.status
            })));
        }
    };

    const fetchInvoices = async () => {
        const { data } = await supabase.rpc("finance_list_invoices", { p_search: null, p_status: null });
        if (data) {
            const pending = (data as any[])
                .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT')
                .sort((a, b) => {
                    const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                    const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                    return dateA - dateB;
                })
                .slice(0, 5);
            setInvoices(pending.map(inv => ({
                id: inv.id,
                invoice_number: inv.invoice_number,
                client_name: inv.client_name,
                total: inv.total,
                due_date: inv.due_date,
                status: inv.status
            })));
        }
    };

    const fetchPurchaseInvoices = async () => {
        const { data, error } = await supabase.rpc('list_purchase_invoices', {
            p_search: null,
            p_status: null,
            p_supplier_id: null,
            p_technician_id: null,
            p_document_type: null,
            p_project_id: null,
            p_page: 1,
            p_page_size: 50
        });

        if (error) {
            console.error('Error fetching purchase invoices:', error);
            return;
        }

        if (data) {
            // Filtrar: pendientes de pago (pending_amount > 0), excluir DRAFT y CANCELLED
            const pending = (data as any[])
                .filter(inv => (inv.pending_amount ?? inv.total) > 0 && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED')
                .sort((a, b) => {
                    const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                    const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                    return dateA - dateB;
                })
                .slice(0, 5)
                .map(inv => ({
                    id: inv.id,
                    vendor_name: inv.provider_name || 'Proveedor desconocido',
                    amount: inv.pending_amount ?? inv.total,
                    due_date: inv.due_date
                }));
            setPayables(pending);
        }
    };

    // Helper functions for display
    const getDaysRemaining = (dateStr: string | null) => {
        if (!dateStr) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        const diffTime = target.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

    const tabs = [
        { id: 'projects', label: 'Proyectos', icon: FolderKanban },
        { id: 'receivables', label: 'Cobros', icon: Receipt },
        { id: 'payables', label: 'Pagos', icon: ShoppingCart },
        { id: 'quotes', label: 'Presupuestos', icon: FileText },
    ];

    return (
        <DashboardWidget
            title="Gestión Rápida"
            subtitle="Acceso directo a operaciones pendientes"
            variant="clean"
            className="h-full bg-card/50 border-border"
            headerClassName="pb-2"
            contentClassName="p-0"
        >
            {/* Tabs Header */}
            <div className="flex items-center border-b border-border/50 px-6">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200",
                                isActive
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                            )}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="p-4 min-h-[300px]">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {/* PROJECTS CONTENT */}
                        {activeTab === 'projects' && (
                            projects.length > 0 ? (
                                projects.map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg cursor-pointer group" onClick={() => navigate(`/nexo-av/${userId}/projects/${p.id}`)}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-violet-500/10 text-violet-600 rounded-lg">
                                                <FolderKanban size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{p.project_name}</h4>
                                                <p className="text-xs text-muted-foreground">{p.client_name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn(
                                                "text-xs px-2 py-1 rounded-full font-medium",
                                                p.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-600' : 'bg-orange-500/10 text-orange-600'
                                            )}>
                                                {p.status === 'IN_PROGRESS' ? 'En Curso' : 'Planificado'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : <EmptyState message="No hay proyectos activos" />
                        )}

                        {/* RECEIVABLES CONTENT */}
                        {activeTab === 'receivables' && (
                            invoices.length > 0 ? (
                                invoices.map(inv => {
                                    const days = getDaysRemaining(inv.due_date);
                                    const isOverdue = days !== null && days < 0;
                                    return (
                                        <div key={inv.id} className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg cursor-pointer group" onClick={() => navigate(`/nexo-av/${userId}/invoices/${inv.id}`)}>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-red-500/10 text-red-600 rounded-lg">
                                                    <Receipt size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{inv.invoice_number}</h4>
                                                    <p className="text-xs text-muted-foreground">{inv.client_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold">{formatCurrency(inv.total)}</p>
                                                <p className={cn("text-xs font-medium", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                                                    {isOverdue ? `Vencida ${Math.abs(days!)} días` : `Vence en ${days} días`}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : <EmptyState message="No hay cobros pendientes" />
                        )}

                        {/* PAYABLES CONTENT */}
                        {activeTab === 'payables' && (
                            payables.length > 0 ? (
                                payables.map(pay => {
                                    const days = getDaysRemaining(pay.due_date);
                                    const isOverdue = days !== null && days < 0;
                                    return (
                                        <div key={pay.id} className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg cursor-pointer group" onClick={() => navigate(`/nexo-av/${userId}/purchase-invoices/${pay.id}`)}>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-orange-500/10 text-orange-600 rounded-lg">
                                                    <ShoppingCart size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{pay.vendor_name}</h4>
                                                    <p className="text-xs text-muted-foreground">Factura Compra</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold">{formatCurrency(pay.amount)}</p>
                                                <p className={cn("text-xs font-medium", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                                                    {days !== null ? (isOverdue ? `Vencida ${Math.abs(days)} días` : `Vence en ${days} días`) : 'Sin fecha'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : <EmptyState message="No hay pagos pendientes" />
                        )}

                        {/* QUOTES CONTENT */}
                        {activeTab === 'quotes' && (
                            quotes.length > 0 ? (
                                quotes.map(q => {
                                    const days = getDaysRemaining(q.valid_until);
                                    return (
                                        <div key={q.id} className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg cursor-pointer group" onClick={() => navigate(`/nexo-av/${userId}/quotes/${q.id}`)}>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-cyan-500/10 text-cyan-600 rounded-lg">
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{q.quote_number}</h4>
                                                    <p className="text-xs text-muted-foreground">{q.client_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold">{formatCurrency(q.total)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {days !== null ? `${days} días validez` : 'Sin fecha'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : <EmptyState message="No hay presupuestos pendientes" />
                        )}

                    </div>
                )}
            </div>

            <div className="px-6 py-4 border-t border-border/50 bg-secondary/20 flex justify-end">
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => {
                    if (activeTab === 'projects') navigate(`/nexo-av/${userId}/projects`);
                    if (activeTab === 'receivables') navigate(`/nexo-av/${userId}/invoices`);
                    if (activeTab === 'payables') navigate(`/nexo-av/${userId}/purchase-invoices`);
                    if (activeTab === 'quotes') navigate(`/nexo-av/${userId}/quotes`);
                }}>
                    Ver Todo en {tabs.find(t => t.id === activeTab)?.label} <ArrowRight className="ml-2 w-3 h-3" />
                </Button>
            </div>
        </DashboardWidget>
    );
};

const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
        <p className="text-sm">{message}</p>
    </div>
);

export default DashboardListsWidget;
