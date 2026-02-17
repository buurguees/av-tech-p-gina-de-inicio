/**
 * ActivityTimeline - Componente compartido para notas internas y auditoría
 * Usado tanto en proyectos (Resumen) como en presupuestos (Auditoría)
 * Compatible con desktop y mobile
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  FileText,
  Receipt,
  ShoppingCart,
  Clock,
  Send,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface ActivityItem {
  id: string;
  activity_type: string;
  content: string;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface ActivityTimelineProps {
  entityType: "project" | "quote";
  entityId: string;
  compact?: boolean;
}

const ACTIVITY_ICONS: Record<string, typeof MessageSquare> = {
  NOTE: MessageSquare,
  QUOTE_STATUS: FileText,
  INVOICE_STATUS: Receipt,
  PURCHASE_STATUS: ShoppingCart,
  STATUS_CHANGE: AlertCircle,
};

const ACTIVITY_COLORS: Record<string, string> = {
  NOTE: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  QUOTE_STATUS: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  INVOICE_STATUS: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  PURCHASE_STATUS: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  STATUS_CHANGE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
};

const ACTIVITY_LABELS: Record<string, string> = {
  NOTE: "Nota",
  QUOTE_STATUS: "Presupuesto",
  INVOICE_STATUS: "Factura",
  PURCHASE_STATUS: "Compra",
  STATUS_CHANGE: "Estado",
};

const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ahora mismo";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

const formatFullDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const ActivityTimeline = ({ entityType, entityId, compact = false }: ActivityTimelineProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const rpcName = entityType === "project" ? "list_project_activity" : "list_quote_activity";
      const paramName = entityType === "project" ? "p_project_id" : "p_quote_id";

      const { data, error } = await supabase.rpc(rpcName, {
        [paramName]: entityId,
        p_limit: 50,
      });

      if (error) throw error;
      setActivities((data as ActivityItem[]) || []);
    } catch (err) {
      console.error("Error fetching activity:", err);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (entityId) fetchActivities();
  }, [entityId, fetchActivities]);

  const handleSubmitNote = async () => {
    const content = newNote.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      const rpcName = entityType === "project" ? "add_project_note" : "add_quote_note";
      const paramName = entityType === "project" ? "p_project_id" : "p_quote_id";

      const { error } = await supabase.rpc(rpcName, {
        [paramName]: entityId,
        p_content: content,
      });

      if (error) throw error;

      setNewNote("");
      await fetchActivities();
    } catch (err) {
      console.error("Error adding note:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmitNote();
    }
  };

  return (
    <div className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold text-foreground ${compact ? "text-sm" : "text-base"}`}>
          {entityType === "project" ? "Notas Internas & Actividad" : "Auditoría & Notas"}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchActivities}
          disabled={loading}
          className="h-7 px-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* New Note Input */}
      <div className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe una nota interna..."
          className={`resize-none ${compact ? "min-h-[60px] text-xs" : "min-h-[70px] text-sm"}`}
          disabled={submitting}
        />
        <Button
          size="sm"
          onClick={handleSubmitNote}
          disabled={!newNote.trim() || submitting}
          className={`self-end ${compact ? "h-8 px-3" : "h-9 px-4"}`}
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Timeline */}
      {loading && activities.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No hay actividad registrada todavía
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((item) => {
            const Icon = ACTIVITY_ICONS[item.activity_type] || Clock;
            const colorClass = ACTIVITY_COLORS[item.activity_type] || "bg-gray-100 text-gray-600";
            const label = ACTIVITY_LABELS[item.activity_type] || item.activity_type;

            return (
              <div
                key={item.id}
                className={`group flex gap-3 rounded-lg border border-transparent hover:border-border/50 hover:bg-muted/30 transition-colors ${
                  compact ? "p-2" : "p-3"
                }`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 mt-0.5 p-1.5 rounded-md ${colorClass}`}>
                  <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${colorClass} border-0`}
                    >
                      {label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {item.created_by_name || "Sistema"}
                    </span>
                    <span
                      className="text-[10px] text-muted-foreground/60 ml-auto"
                      title={formatFullDate(item.created_at)}
                    >
                      {formatRelativeDate(item.created_at)}
                    </span>
                  </div>
                  <p className={`text-foreground/90 mt-1 whitespace-pre-wrap ${
                    compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed"
                  }`}>
                    {item.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityTimeline;
