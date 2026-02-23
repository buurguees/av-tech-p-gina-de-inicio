import { useState, useEffect } from "react";
import { FileText, ArrowRight, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardWidget from "../DashboardWidget";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Quote {
    id: string;
    quote_number: string;
    client_name: string;
    total: number;
    valid_until: string;
    status: string;
}

const QuotesWidget = ({ userId }: { userId: string | undefined }) => {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQuotes();
    }, [userId]);

    const fetchQuotes = async () => {
        try {
            const { data, error } = await supabase.rpc('list_quotes', {
                p_status: 'SENT',
                p_search: null
            });

            if (error) throw error;

            if (data) {
                // Sort by valid_until ASC (soonest first) and take top 5
                const expiring = (data as any[])
                    .slice(0, 5)
                    .sort((a, b) => {
                        const dateA = a.valid_until ? new Date(a.valid_until).getTime() : Infinity;
                        const dateB = b.valid_until ? new Date(b.valid_until).getTime() : Infinity;
                        return dateA - dateB;
                    });

                setQuotes(expiring.map(q => ({
                    id: q.id,
                    quote_number: q.quote_number,
                    client_name: q.client_name,
                    total: q.total,
                    valid_until: q.valid_until,
                    status: q.status
                })));
            }
        } catch (err) {
            console.error('Error fetching quotes:', err);
        } finally {
            setLoading(false);
        }
    };

    const getDaysRemaining = (dateStr: string | null) => {
        if (!dateStr) return null;
        const today = new Date();
        const validUntil = new Date(dateStr);
        const diffTime = validUntil.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getUrgencyColor = (days: number | null) => {
        if (days === null) return "text-muted-foreground";
        if (days < 0) return "text-destructive font-bold";
        if (days <= 7) return "text-orange-500 font-medium";
        return "text-green-600";
    };

    return (
        <DashboardWidget
            title="Presupuestos por Vencer"
            subtitle="Requieren atención inminente"
            icon={FileText}
            action={
                <Button variant="ghost" size="sm" onClick={() => navigate(`/nexo-av/${userId}/quotes`)} className="gap-1">
                    Ver todos <ArrowRight className="w-4 h-4" />
                </Button>
            }
            variant="clean"
            className="h-full"
        >
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
                </div>
            ) : quotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
                    <FileText className="w-10 h-10 mb-2 opacity-20" />
                    <p>No hay presupuestos pendientes</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {quotes.map((quote) => {
                        const daysLeft = getDaysRemaining(quote.valid_until);
                        return (
                            <div key={quote.id} className="flex items-center justify-between group p-2 hover:bg-secondary/50 rounded-lg transition-colors cursor-pointer" onClick={() => navigate(`/nexo-av/${userId}/quotes/${quote.id}`)}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                            {quote.quote_number}
                                        </h4>
                                        {daysLeft !== null && daysLeft < 0 && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">Vencido</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {quote.client_name}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-foreground">
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(quote.total || 0)}
                                    </p>
                                    <p className={`text-xs flex items-center justify-end gap-1 ${getUrgencyColor(daysLeft)}`}>
                                        {daysLeft === null ? 'Sin fecha' : daysLeft < 0 ? `Hace ${Math.abs(daysLeft)} días` : `${daysLeft} días restantes`}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </DashboardWidget>
    );
};

export default QuotesWidget;
