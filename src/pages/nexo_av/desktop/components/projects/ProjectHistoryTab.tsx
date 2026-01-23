import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { 
  History, 
  FileText, 
  Receipt, 
  Building2, 
  RefreshCw,
  User,
  Clock,
  ChevronDown,
  ChevronRight,
  Calculator,
  CreditCard,
  Edit,
  Plus,
  Trash,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface HistoryEvent {
  id: string;
  event_type: string;
  event_category: string;
  action: string;
  description: string;
  user_name: string;
  user_email: string;
  created_at: string;
  details: Json;
  severity: string;
  resource_type: string;
  resource_id: string;
}

interface ProjectHistoryTabProps {
  projectId: string;
}

const ProjectHistoryTab = ({ projectId }: ProjectHistoryTabProps) => {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_project_history", {
        p_project_id: projectId,
      });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching project history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [projectId]);

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const getEventIcon = (event: HistoryEvent) => {
    const iconClass = "w-4 h-4";
    
    switch (event.event_category) {
      case "projects":
        if (event.action === "CREATE") return <Plus className={iconClass} />;
        if (event.action === "UPDATE") return <Edit className={iconClass} />;
        return <Building2 className={iconClass} />;
      case "quotes":
        if (event.action === "CREATE") return <Plus className={iconClass} />;
        if (event.action === "UPDATE") return <Edit className={iconClass} />;
        if (event.action === "DELETE") return <Trash className={iconClass} />;
        if (event.event_type.includes("status")) return <ArrowRight className={iconClass} />;
        return <FileText className={iconClass} />;
      case "invoices":
        if (event.event_type === "payment_registered") return <CreditCard className={iconClass} />;
        if (event.action === "CREATE") return <Plus className={iconClass} />;
        return <Receipt className={iconClass} />;
      case "accounting":
        return <Calculator className={iconClass} />;
      default:
        return <History className={iconClass} />;
    }
  };

  const getEventColor = (event: HistoryEvent) => {
    switch (event.event_category) {
      case "projects":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "quotes":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "invoices":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "accounting":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "projects":
        return "Proyecto";
      case "quotes":
        return "Presupuesto";
      case "invoices":
        return "Factura";
      case "accounting":
        return "Contabilidad";
      default:
        return category;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const formatDetails = (details: Json) => {
    if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
    
    const detailsObj = details as Record<string, Json>;
    const relevantKeys = Object.keys(detailsObj).filter(
      (key) => !["project_id", "user_id"].includes(key)
    );

    if (relevantKeys.length === 0) return null;

    return (
      <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/50 text-xs space-y-1">
        {relevantKeys.map((key) => {
          const value = detailsObj[key];
          const formattedKey = key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
          
          return (
            <div key={key} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{formattedKey}:</span>
              <span className="text-foreground font-medium truncate">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const dateKey = new Date(event.created_at).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
    return groups;
  }, {} as Record<string, HistoryEvent[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <History className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Histórico del Proyecto
            </h2>
            <p className="text-xs text-muted-foreground">
              {events.length} eventos registrados
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHistory}
          className="h-8 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Actualizar
        </Button>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No hay eventos registrados para este proyecto
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {dateKey}
                    </span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>

                  {/* Events for this date */}
                  <div className="space-y-3">
                    {dateEvents.map((event) => {
                      const { time } = formatDateTime(event.created_at);
                      const isExpanded = expandedEvents.has(event.id);
                      const hasDetails = event.details && Object.keys(event.details).length > 0;

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "relative p-4 rounded-lg border transition-all",
                            "bg-card hover:bg-card/80",
                            "border-border/50 hover:border-border"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div
                              className={cn(
                                "p-2 rounded-lg border shrink-0",
                                getEventColor(event)
                              )}
                            >
                              {getEventIcon(event)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {event.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                      {getCategoryLabel(event.event_category)}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {time}
                                  </div>
                                </div>
                              </div>

                              {/* User info */}
                              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span>{event.user_name}</span>
                                {event.user_email && (
                                  <span className="opacity-60">
                                    ({event.user_email})
                                  </span>
                                )}
                              </div>

                              {/* Expandable details */}
                              {hasDetails && (
                                <button
                                  onClick={() => toggleExpanded(event.id)}
                                  className="flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                  {isExpanded ? "Ocultar detalles" : "Ver detalles"}
                                </button>
                              )}

                              {isExpanded && formatDetails(event.details)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProjectHistoryTab;