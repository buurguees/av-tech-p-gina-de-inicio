import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ShieldAlert, ArrowLeft, Loader2, AlertTriangle, Info, AlertCircle, 
  Shield, Clock, User, Database, Key, Globe, Monitor, MapPin, 
  Fingerprint, Activity, FileText, Copy, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NexoLogo } from "./components/NexoHeader";

interface AuditEvent {
  id: string;
  event_type: string;
  event_category: string;
  severity: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
}

interface RelatedEvent {
  id: string;
  event_type: string;
  severity: string;
  created_at: string;
}

const SEVERITY_CONFIG = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Información" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", label: "Advertencia" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Error" },
  critical: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-600/10", border: "border-red-600/20", label: "Crítico" },
};

const CATEGORY_CONFIG: Record<string, { icon: typeof Shield; label: string; color: string }> = {
  security: { icon: Shield, label: "Seguridad", color: "text-red-400" },
  crm: { icon: Database, label: "CRM", color: "text-blue-400" },
  auth: { icon: Key, label: "Autenticación", color: "text-green-400" },
};

// Parse user agent to get browser and OS info
const parseUserAgent = (ua: string | null): { browser: string; os: string; device: string } => {
  if (!ua) return { browser: "Desconocido", os: "Desconocido", device: "Desconocido" };
  
  let browser = "Desconocido";
  let os = "Desconocido";
  let device = "Desktop";
  
  // Browser detection
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome")) browser = "Google Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera")) browser = "Opera";
  
  // OS detection
  if (ua.includes("Windows NT 10")) os = "Windows 10/11";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) { os = "Android"; device = "Móvil"; }
  else if (ua.includes("iPhone") || ua.includes("iPad")) { os = "iOS"; device = ua.includes("iPad") ? "Tablet" : "Móvil"; }
  
  return { browser, os, device };
};

const AuditEventDetailPage = () => {
  const { userId, eventId } = useParams<{ userId: string; eventId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [event, setEvent] = useState<AuditEvent | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<RelatedEvent[]>([]);
  const [ipStats, setIpStats] = useState<{ total_attempts: number; failed_attempts: number; first_seen: string; last_seen: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndFetchEvent = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/nexo-av');
          return;
        }

        const { data: userInfo, error: userError } = await supabase.rpc('get_current_user_info');
        
        if (userError || !userInfo || userInfo.length === 0) {
          navigate('/nexo-av');
          return;
        }

        const currentUserInfo = userInfo[0];

        if (userId && userId !== currentUserInfo.user_id) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        if (!currentUserInfo.roles?.includes('admin')) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        setIsAdmin(true);
        
        // Fetch event details
        if (eventId) {
          await fetchEventDetails(eventId);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/nexo-av');
      }
    };

    checkAuthAndFetchEvent();
  }, [navigate, userId, eventId]);

  const fetchEventDetails = async (id: string) => {
    try {
      // Fetch the specific event
      const { data: events, error } = await supabase.rpc('audit_list_events' as any, {
        p_search: id,
        p_limit: 1,
        p_offset: 0
      });
      
      if (error) throw error;
      
      if (events && events.length > 0) {
        const eventData = events[0] as AuditEvent;
        setEvent(eventData);
        
        // Fetch related events (same IP or same user)
        if (eventData.ip_address || eventData.user_email) {
          await fetchRelatedEvents(eventData);
          if (eventData.ip_address) {
            await fetchIpStats(eventData.ip_address);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching event details:', err);
    }
  };

  const fetchRelatedEvents = async (currentEvent: AuditEvent) => {
    try {
      // Fetch events from same IP or user
      const searchTerm = currentEvent.ip_address || currentEvent.user_email || '';
      const { data, error } = await supabase.rpc('audit_list_events' as any, {
        p_search: searchTerm,
        p_limit: 10,
        p_offset: 0
      });
      
      if (error) throw error;
      
      if (data) {
        const related = (data as AuditEvent[])
          .filter(e => e.id !== currentEvent.id)
          .slice(0, 5)
          .map(e => ({
            id: e.id,
            event_type: e.event_type,
            severity: e.severity,
            created_at: e.created_at
          }));
        setRelatedEvents(related);
      }
    } catch (err) {
      console.error('Error fetching related events:', err);
    }
  };

  const fetchIpStats = async (ipAddress: string) => {
    try {
      // Get stats for this IP from audit events
      const { data, error } = await supabase.rpc('audit_list_events' as any, {
        p_search: ipAddress,
        p_limit: 100,
        p_offset: 0
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const events = data as AuditEvent[];
        const failedAttempts = events.filter(e => 
          e.severity === 'error' || e.severity === 'warning' || 
          e.event_type?.includes('FAILED') || e.event_type?.includes('DENIED')
        ).length;
        
        const dates = events.map(e => new Date(e.created_at).getTime());
        
        setIpStats({
          total_attempts: events.length,
          failed_attempts: failedAttempts,
          first_seen: new Date(Math.min(...dates)).toISOString(),
          last_seen: new Date(Math.max(...dates)).toISOString()
        });
      }
    } catch (err) {
      console.error('Error fetching IP stats:', err);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const getSeverityConfig = (severity: string) => {
    return SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
  };

  const getCategoryConfig = (category: string) => {
    return CATEGORY_CONFIG[category] || { icon: Database, label: category, color: "text-white/60" };
  };

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Acceso Denegado</h1>
          <p className="text-white/60">Solo los administradores pueden acceder al registro de auditoría.</p>
          <Button 
            onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}
            className="bg-white text-black hover:bg-white/90"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <NexoLogo />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Evento no encontrado</h1>
          <p className="text-white/60">El evento de auditoría solicitado no existe.</p>
          <Button 
            onClick={() => navigate(`/nexo-av/${userId}/audit`)}
            className="bg-white text-black hover:bg-white/90"
          >
            Volver a auditoría
          </Button>
        </div>
      </div>
    );
  }

  const severityConfig = getSeverityConfig(event.severity);
  const SeverityIcon = severityConfig.icon;
  const categoryConfig = getCategoryConfig(event.event_category);
  const CategoryIcon = categoryConfig.icon;
  const userAgentInfo = parseUserAgent(event.user_agent);

  return (
    <div className="w-full">
      <div className="w-full px-3 sm:px-4 lg:px-6 py-3 md:py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <SeverityIcon className={`w-6 h-6 ${severityConfig.color}`} />
                {event.event_type}
              </h1>
              <p className="text-white/60 mt-1">
                {format(new Date(event.created_at), "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm:ss", { locale: es })}
              </p>
            </div>
            <Badge className={`${severityConfig.bg} ${severityConfig.border} ${severityConfig.color} border text-sm px-3 py-1`}>
              {severityConfig.label}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Overview */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Información del Evento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/40 text-sm mb-1">ID del Evento</p>
                    <div className="flex items-center gap-2">
                      <code className="text-white bg-white/10 px-2 py-1 rounded text-sm font-mono">
                        {event.id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(event.id, 'id')}
                        className="h-6 w-6 p-0 text-white/40 hover:text-white"
                      >
                        {copied === 'id' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-white/40 text-sm mb-1">Categoría</p>
                    <div className="flex items-center gap-2">
                      <CategoryIcon className={`w-4 h-4 ${categoryConfig.color}`} />
                      <span className="text-white">{categoryConfig.label}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-white/40 text-sm mb-1">Tipo de Evento</p>
                    <span className="text-white font-medium">{event.event_type}</span>
                  </div>
                  <div>
                    <p className="text-white/40 text-sm mb-1">Session ID</p>
                    <code className="text-white/60 text-sm font-mono">
                      {event.session_id || 'N/A'}
                    </code>
                  </div>
                </div>
                
                {event.resource_type && (
                  <>
                    <Separator className="bg-white/10" />
                    <div>
                      <p className="text-white/40 text-sm mb-1">Recurso Afectado</p>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-white/40" />
                        <span className="text-white">{event.resource_type}</span>
                        <span className="text-white/40">/</span>
                        <code className="text-white/60 font-mono text-sm">{event.resource_id}</code>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* User Information */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información del Usuario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/40 text-sm mb-1">Email</p>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{event.user_email || 'Sistema / Anónimo'}</span>
                      {event.user_email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(event.user_email!, 'email')}
                          className="h-6 w-6 p-0 text-white/40 hover:text-white"
                        >
                          {copied === 'email' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-white/40 text-sm mb-1">Nombre</p>
                    <span className="text-white">{event.user_name || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-white/40 text-sm mb-1">User ID</p>
                    <code className="text-white/60 font-mono text-sm">{event.user_id || 'N/A'}</code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Details */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Detalles de Conexión
                </CardTitle>
                <CardDescription className="text-white/60">
                  Información técnica sobre el origen de la solicitud
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-white/40 text-sm mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Dirección IP
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-white bg-white/10 px-2 py-1 rounded font-mono">
                        {event.ip_address || 'No disponible'}
                      </code>
                      {event.ip_address && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(event.ip_address!, 'ip')}
                          className="h-6 w-6 p-0 text-white/40 hover:text-white"
                        >
                          {copied === 'ip' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-white/40 text-sm mb-1 flex items-center gap-1">
                      <Monitor className="w-3 h-3" />
                      Dispositivo
                    </p>
                    <span className="text-white">{userAgentInfo.device}</span>
                  </div>
                  <div>
                    <p className="text-white/40 text-sm mb-1">Sistema Operativo</p>
                    <span className="text-white">{userAgentInfo.os}</span>
                  </div>
                  <div>
                    <p className="text-white/40 text-sm mb-1">Navegador</p>
                    <span className="text-white">{userAgentInfo.browser}</span>
                  </div>
                </div>
                
                <Separator className="bg-white/10" />
                
                <div>
                  <p className="text-white/40 text-sm mb-2">User Agent Completo</p>
                  <div className="bg-black/50 rounded-lg p-3 border border-white/10">
                    <code className="text-white/60 text-xs font-mono break-all">
                      {event.user_agent || 'No disponible'}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Details (JSON) */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Detalles Adicionales
                </CardTitle>
                <CardDescription className="text-white/60">
                  Datos JSON completos del evento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-black/50 rounded-lg p-4 border border-white/10 overflow-auto max-h-96">
                  <pre className="text-white/80 text-sm font-mono whitespace-pre-wrap">
                    {JSON.stringify(event.details, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side column */}
          <div className="space-y-6">
            {/* IP Statistics */}
            {ipStats && event.ip_address && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2 text-lg">
                    <Fingerprint className="w-5 h-5" />
                    Estadísticas de IP
                  </CardTitle>
                  <CardDescription className="text-white/60 font-mono text-sm">
                    {event.ip_address}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-white">{ipStats.total_attempts}</p>
                      <p className="text-white/40 text-xs">Total eventos</p>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/20">
                      <p className="text-2xl font-bold text-red-400">{ipStats.failed_attempts}</p>
                      <p className="text-white/40 text-xs">Fallidos/Warnings</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-white/40 text-xs">Primera actividad</p>
                      <p className="text-white text-sm">
                        {format(new Date(ipStats.first_seen), "dd/MM/yyyy HH:mm", { locale: es })}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Última actividad</p>
                      <p className="text-white text-sm">
                        {format(new Date(ipStats.last_seen), "dd/MM/yyyy HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                  
                  {ipStats.failed_attempts > 5 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Actividad sospechosa</span>
                      </div>
                      <p className="text-white/60 text-xs mt-1">
                        Esta IP tiene múltiples intentos fallidos
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Related Events */}
            {relatedEvents.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5" />
                    Eventos Relacionados
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Misma IP o usuario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {relatedEvents.map((related) => {
                      const relSeverity = getSeverityConfig(related.severity);
                      const RelIcon = relSeverity.icon;
                      return (
                        <button
                          key={related.id}
                          onClick={() => navigate(`/nexo-av/${userId}/audit/${related.id}`)}
                          className="w-full text-left bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <RelIcon className={`w-3 h-3 ${relSeverity.color}`} />
                            <span className="text-white text-sm font-medium truncate">
                              {related.event_type}
                            </span>
                          </div>
                          <p className="text-white/40 text-xs">
                            {format(new Date(related.created_at), "dd/MM HH:mm", { locale: es })}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {event.ip_address && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-white/20 text-white hover:bg-white/10"
                    onClick={() => navigate(`/nexo-av/${userId}/audit?search=${event.ip_address}`)}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Ver todos los eventos de esta IP
                  </Button>
                )}
                {event.user_email && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-white/20 text-white hover:bg-white/10"
                    onClick={() => navigate(`/nexo-av/${userId}/audit?search=${event.user_email}`)}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Ver todos los eventos del usuario
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start border-white/20 text-white hover:bg-white/10"
                  onClick={() => navigate(`/nexo-av/${userId}/audit?severity=${event.severity}`)}
                >
                  <SeverityIcon className={`w-4 h-4 mr-2 ${severityConfig.color}`} />
                  Ver eventos de severidad "{event.severity}"
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditEventDetailPage;
