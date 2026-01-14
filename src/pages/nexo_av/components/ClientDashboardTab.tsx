import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  FolderKanban, 
  FileText, 
  Receipt,
  Clock,
  CheckCircle,
  AlertCircle,
  Euro,
  MessageSquare,
  RefreshCw,
  Send
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LEAD_STAGE_COLORS, LEAD_STAGE_LABELS } from "../LeadMapPage";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ClientDetail {
  id: string;
  company_name: string;
  contact_phone: string;
  contact_email: string;
  tax_id: string | null;
  legal_name: string | null;
  industry_sector: string | null;
  approximate_budget: number | null;
  lead_stage: string;
  notes: string | null;
  created_at: string;
  assigned_to?: string | null;
}

interface ClientDashboardTabProps {
  client: ClientDetail;
  isAdmin?: boolean;
  currentUserId?: string | null;
  onRefresh?: () => void;
}

interface ClientNote {
  id: string;
  content: string;
  note_type: string;
  user_name: string;
  created_at: string;
  previous_status?: string;
  new_status?: string;
}

const ClientDashboardTab = ({ client, isAdmin = false, currentUserId = null, onRefresh }: ClientDashboardTabProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState(client.lead_stage);

  const canEdit = isAdmin || client.assigned_to === currentUserId;

  useEffect(() => {
    fetchNotes();
  }, [client.id]);

  const fetchNotes = async () => {
    try {
      setLoadingNotes(true);
      const { data, error } = await supabase.rpc('list_client_notes', {
        p_client_id: client.id
      });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setAddingNote(true);
      const { error } = await supabase.rpc('add_client_note', {
        p_client_id: client.id,
        p_content: newNote.trim(),
        p_note_type: 'manual'
      });

      if (error) throw error;

      toast({
        title: "Nota añadida",
        description: "La nota se ha guardado correctamente",
      });

      setNewNote("");
      fetchNotes();
      onRefresh?.();
    } catch (err) {
      console.error('Error adding note:', err);
      toast({
        title: "Error",
        description: "No se pudo añadir la nota",
        variant: "destructive",
      });
    } finally {
      setAddingNote(false);
    }
  };

  const handleChangeStatus = async () => {
    if (newStatus === client.lead_stage) {
      setChangingStatus(false);
      return;
    }

    try {
      setChangingStatus(true);
      const noteContent = newNote.trim() || `Estado cambiado a "${LEAD_STAGE_LABELS[newStatus]}"`;
      
      const { error } = await supabase.rpc('update_client_status', {
        p_client_id: client.id,
        p_new_status: newStatus,
        p_note: noteContent
      });

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Cambio a "${LEAD_STAGE_LABELS[newStatus]}"`,
      });

      if (newNote.trim()) {
        setNewNote("");
      }
      setChangingStatus(false);
      fetchNotes();
      onRefresh?.();
    } catch (err) {
      console.error('Error changing status:', err);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado",
        variant: "destructive",
      });
      setChangingStatus(false);
    }
  };

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <RefreshCw size={12} className="text-primary" />;
      case 'creation':
        return <Clock size={12} className="text-green-500" />;
      default:
        return <MessageSquare size={12} className="text-muted-foreground" />;
    }
  };
  // TODO: Fetch real data from projects, quotes, and invoices tables
  const stats = {
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingProjects: 0,
    totalQuotes: 0,
    quotesAmount: 0,
    totalInvoices: 0,
    invoicesAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
  };

  const statCards = [
    {
      title: "Proyectos Totales",
      value: stats.totalProjects,
      icon: FolderKanban,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "En Progreso",
      value: stats.activeProjects,
      icon: Clock,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Completados",
      value: stats.completedProjects,
      icon: CheckCircle,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Presupuestos",
      value: stats.totalQuotes,
      icon: FileText,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Total Presupuestado",
      value: `${stats.quotesAmount.toLocaleString('es-ES')}€`,
      icon: Euro,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: "Facturas",
      value: stats.totalInvoices,
      icon: Receipt,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Total Facturado",
      value: `${stats.invoicesAmount.toLocaleString('es-ES')}€`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Pendiente Cobro",
      value: `${stats.pendingAmount.toLocaleString('es-ES')}€`,
      icon: AlertCircle,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-card border-border hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground text-xs mb-0.5">{stat.title}</p>
                    <p className="text-foreground text-base font-semibold truncate">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Client Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Sector</p>
                  <p className="text-foreground text-sm capitalize">{client.industry_sector?.toLowerCase() || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">NIF/CIF</p>
                  <p className="text-foreground text-sm font-mono">{client.tax_id || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Presupuesto Medio</p>
                  <p className="text-foreground text-sm">
                    {client.approximate_budget 
                      ? `${client.approximate_budget.toLocaleString('es-ES')}€`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Cliente desde</p>
                  <p className="text-foreground text-sm">
                    {new Date(client.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              {client.notes && (
                <div className="pt-3 border-t">
                  <p className="text-muted-foreground text-xs mb-1.5">Notas</p>
                  <p className="text-foreground text-sm leading-relaxed">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Notes and Activity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-card border-border flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Notas y Actividad</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 space-y-3 pb-4">
              {/* Add note section */}
              {canEdit && (
                <div className="space-y-2.5">
                  <Textarea
                    placeholder="Añadir nota..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[70px] resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Cambiar estado:</span>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="h-8 flex-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    {newNote.trim() && (
                      <Button 
                        size="sm" 
                        className="flex-1 h-8 text-xs"
                        onClick={handleAddNote}
                        disabled={addingNote}
                      >
                        <Send size={12} className="mr-1" />
                        {addingNote ? "Guardando..." : "Añadir Nota"}
                      </Button>
                    )}
                    {newStatus !== client.lead_stage && (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="flex-1 h-8 text-xs"
                        onClick={handleChangeStatus}
                        disabled={changingStatus}
                      >
                        <RefreshCw size={12} className="mr-1" />
                        {changingStatus ? "Guardando..." : "Cambiar Estado"}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Notes list */}
              <div className={cn(
                "flex-1 min-h-0",
                canEdit && "pt-2.5 border-t"
              )}>
                <h4 className="text-xs font-medium text-foreground mb-2">Historial de Actividad</h4>
                {loadingNotes ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-muted border-t-primary"></div>
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Sin actividad registrada
                  </p>
                ) : (
                  <ScrollArea className={cn(
                    "max-h-[400px]",
                    !canEdit && "max-h-[500px]"
                  )}>
                    <div className="space-y-2.5 pr-2">
                      {notes.map((note) => (
                        <div key={note.id} className="border-l-2 border-border pl-2.5 py-1.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            {getNoteIcon(note.note_type)}
                            <span className="text-[11px] text-muted-foreground">
                              {note.user_name} • {format(new Date(note.created_at), "d MMM, HH:mm", { locale: es })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground leading-relaxed">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ClientDashboardTab;
