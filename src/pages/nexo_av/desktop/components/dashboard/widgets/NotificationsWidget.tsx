import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell, CheckCheck, AlertTriangle, Info, AlertCircle,
  Loader2, ChevronRight, ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Notification {
  id: string;
  created_at: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  action_url: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
}

const severityConfig: Record<string, { icon: any; color: string; bg: string }> = {
  CRITICAL: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
  WARNING: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  INFO: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
};

interface NotificationsWidgetProps {
  maxItems?: number;
  onUnreadCountChange?: (count: number) => void;
}

const NotificationsWidget = ({ maxItems = 10, onUnreadCountChange }: NotificationsWidgetProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { userId } = useParams();

  useEffect(() => {
    refreshAndFetch();
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [showUnreadOnly]);

  const refreshAndFetch = async () => {
    try {
      // First refresh notifications for current user
      await supabase.rpc("notifications_refresh_for_user");
      // Then fetch
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (e) {
      console.error("Error refreshing notifications:", e);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("notifications_list", {
        p_limit: maxItems,
        p_only_unread: showUnreadOnly,
      });
      if (error) throw error;
      setNotifications((data as unknown as Notification[]) || []);
    } catch (e) {
      console.error("Error fetching notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const { data, error } = await supabase.rpc("notifications_count_unread");
      if (error) throw error;
      const count = (data as number) || 0;
      setUnreadCount(count);
      onUnreadCountChange?.(count);
    } catch (e) {
      console.error("Error fetching unread count:", e);
    }
  };

  const handleMarkRead = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.rpc("notifications_mark_read", { p_notification_id: notifId });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      onUnreadCountChange?.(Math.max(0, unreadCount - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await supabase.rpc("notifications_mark_all_read");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      onUnreadCountChange?.(0);
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch (e) {
      toast.error("Error al marcar notificaciones");
    }
  };

  const handleNotifClick = (notif: Notification) => {
    if (!notif.is_read) {
      supabase.rpc("notifications_mark_read", { p_notification_id: notif.id });
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (notif.action_url) {
      navigate(`/nexo-av/${userId}${notif.action_url}`);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card/50 border border-border rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={cn(
              "text-[10px] px-2 py-1 rounded-full transition-colors",
              showUnreadOnly ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            No leídas
          </button>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={handleMarkAllRead}>
              <CheckCheck className="h-3 w-3 mr-1" /> Leer todo
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-6">
          <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            {showUnreadOnly ? "Sin notificaciones no leídas" : "Sin notificaciones"}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notif) => {
            const sev = severityConfig[notif.severity] || severityConfig.INFO;
            const SevIcon = sev.icon;

            return (
              <button
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-2.5 rounded-lg transition-colors",
                  notif.is_read ? "hover:bg-secondary/30" : "bg-primary/5 hover:bg-primary/10",
                )}
              >
                <div className={cn("flex-shrink-0 p-1.5 rounded-lg mt-0.5", sev.bg)}>
                  <SevIcon className={cn("h-3.5 w-3.5", sev.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm truncate",
                      notif.is_read ? "text-muted-foreground" : "text-foreground font-medium"
                    )}>
                      {notif.title}
                    </span>
                    {!notif.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{notif.message}</p>
                  <span className="text-[10px] text-muted-foreground/60 mt-0.5">{formatTimeAgo(notif.created_at)}</span>
                </div>

                {notif.action_url && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground/40 flex-shrink-0 mt-1" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default NotificationsWidget;
