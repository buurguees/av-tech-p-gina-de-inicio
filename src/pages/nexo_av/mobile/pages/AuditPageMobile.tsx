/**
 * AuditPageMobile
 * 
 * Versión optimizada para móviles de la página de auditoría.
 * Solo para administradores. Lista compacta de eventos.
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Search, Filter, Info, AlertTriangle, AlertCircle, Clock, User } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import MobileBottomNav from "../components/MobileBottomNav";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AuditEvent {
  id: string;
  event_type: string;
  event_category: string;
  severity: string;
  user_email: string | null;
  user_name: string | null;
  action: string;
  created_at: string;
}

const SEVERITY_CONFIG = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  critical: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-600/10", border: "border-red-600/20" },
};

const AuditPageMobile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const debouncedSearch = useDebounce(searchInput, 500);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_user_info');
        
        if (error || !data || data.length === 0) {
          setLoading(false);
          return;
        }

        const currentUserInfo = data[0];
        const userIsAdmin = currentUserInfo.roles?.includes('admin') || false;
        
        setIsAdmin(userIsAdmin);
        setLoading(false);
        
        if (!userIsAdmin) {
          setAccessDenied(true);
        }
      } catch (err) {
        console.error('Error fetching user info:', err);
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchEvents();
    }
  }, [debouncedSearch, filterSeverity, isAdmin]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        p_limit: 100,
        p_offset: 0,
      };

      if (debouncedSearch) {
        params.p_search = debouncedSearch;
      }

      if (filterSeverity !== "all") {
        params.p_severity = filterSeverity;
      }

      const { data, error } = await supabase.rpc('audit_list_events' as any, params);
      
      if (error) throw error;
      
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  const getSeverityInfo = (severity: string) => {
    return SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Acceso Denegado</h2>
          <p className="text-white/60 text-sm mb-4">Solo los administradores pueden acceder a esta página.</p>
          <Button
            onClick={() => navigate(`/nexo-av/${userId}/lead-map`)}
            className="bg-white text-black hover:bg-white/90"
          >
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-mobile-nav">
      <main className="p-3 space-y-3">
        {/* Filtros */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              type="text"
              placeholder="Buscar eventos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-11 bg-white/5 border-white/10 text-white text-sm h-10"
            />
          </div>

          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 text-sm">
              <SelectValue placeholder="Filtrar por severidad" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="all" className="text-white">Todas las severidades</SelectItem>
              <SelectItem value="info" className="text-white">Info</SelectItem>
              <SelectItem value="warning" className="text-white">Advertencia</SelectItem>
              <SelectItem value="error" className="text-white">Error</SelectItem>
              <SelectItem value="critical" className="text-white">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Eventos */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white"></div>
          </div>
        ) : events.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-12 text-center">
              <ShieldAlert className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 text-sm">No hay eventos de auditoría</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {events.map((event, index) => {
              const severityInfo = getSeverityInfo(event.severity);
              const SeverityIcon = severityInfo.icon;

              return (
                <motion.button
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => navigate(`/nexo-av/${userId}/audit/${event.id}`)}
                  className="w-full p-3 bg-white border-b border-gray-200 active:bg-gray-50 transition-colors text-left min-h-[60px] max-h-[70px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityIcon className={`w-3 h-3 ${severityInfo.color} shrink-0`} />
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {event.action}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.user_email && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-500 truncate max-w-[120px]">
                              {event.user_name || event.user_email}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-400">
                            {formatDateTime(event.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`${severityInfo.bg} ${severityInfo.border} ${severityInfo.color} text-xs px-2 py-0.5 shrink-0 ml-2`}
                    >
                      {event.severity}
                    </Badge>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </main>

      <MobileBottomNav userId={userId || ''} />
    </div>
  );
};

export default AuditPageMobile;
