import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ShieldAlert, Search, Filter, RefreshCw, Loader2, AlertTriangle, Info, AlertCircle, Shield, Clock, User, Database, Key, Globe, Monitor, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import NexoHeader, { NexoLogo } from "./components/NexoHeader";
import { useDebounce } from "@/hooks/useDebounce";
import PaginationControls from "./components/PaginationControls";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  total_count: number;
}

interface AuditStats {
  total_events: number;
  events_by_category: Record<string, number> | null;
  events_by_severity: Record<string, number> | null;
  events_by_type: Record<string, number> | null;
  top_users: Array<{ email: string; count: number }> | null;
}

const SEVERITY_CONFIG = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  critical: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-600/10", border: "border-red-600/20" },
};

const CATEGORY_ICONS: Record<string, typeof Shield> = {
  security: Shield,
  crm: Database,
  auth: Key,
};

// Parse user agent for display
const parseUserAgentShort = (ua: string | null): string => {
  if (!ua) return "—";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Otro";
};

const AuditPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Initialize filters from URL params
  const initialSearch = searchParams.get('search') || "";
  const initialSeverity = searchParams.get('severity') || "all";
  
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>(initialSeverity);
  const [filterType, setFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  
  const debouncedSearch = useDebounce(searchInput, 500);
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/nexo-av');
          return;
        }

        const { data, error } = await supabase.rpc('get_current_user_info');
        
        if (error || !data || data.length === 0) {
          navigate('/nexo-av');
          return;
        }

        const currentUserInfo = data[0];

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
        setLoading(false);
        
        // Fetch initial data
        fetchStats();
        fetchEvents();
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/nexo-av');
      }
    };

    checkAuth();
  }, [navigate, userId]);

  useEffect(() => {
    if (isAdmin) {
      fetchEvents();
    }
  }, [debouncedSearch, filterCategory, filterSeverity, filterType, currentPage, isAdmin]);

  const fetchStats = async () => {
    try {
      // Use raw SQL query via RPC for stats
      const { data, error } = await supabase.rpc('audit_get_stats' as any, { p_days: 7 });
      if (error) throw error;
      if (data && Array.isArray(data) && data.length > 0) {
        setStats(data[0] as AuditStats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const params: Record<string, unknown> = {
        p_limit: pageSize,
        p_offset: (currentPage - 1) * pageSize,
      };
      
      if (debouncedSearch) params.p_search = debouncedSearch;
      if (filterCategory !== "all") params.p_event_category = filterCategory;
      if (filterSeverity !== "all") params.p_severity = filterSeverity;
      if (filterType !== "all") params.p_event_type = filterType;

      const { data, error } = await supabase.rpc('audit_list_events' as any, params);
      
      if (error) throw error;
      
      const eventsData = data as AuditEvent[] | null;
      setEvents(eventsData || []);
      if (eventsData && eventsData.length > 0) {
        setTotalCount(Number(eventsData[0].total_count));
      } else {
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleRefresh = () => {
    fetchStats();
    fetchEvents();
  };

  const getSeverityConfig = (severity: string) => {
    return SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
  };

  const getCategoryIcon = (category: string) => {
    return CATEGORY_ICONS[category] || Database;
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse">
          <NexoLogo />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <NexoHeader title="Registro de Auditoría" userId={userId || ''} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Eventos (7 días)</p>
                    <p className="text-2xl font-bold text-white">{stats.total_events}</p>
                  </div>
                  <Clock className="h-8 w-8 text-white/20" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Warnings</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {stats.events_by_severity?.warning || 0}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-400/40" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Errores</p>
                    <p className="text-2xl font-bold text-red-400">
                      {(stats.events_by_severity?.error || 0) + (stats.events_by_severity?.critical || 0)}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-400/40" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Seguridad</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {stats.events_by_category?.security || 0}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-400/40" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros
                </CardTitle>
                <CardDescription className="text-white/60">
                  Busca y filtra eventos de auditoría
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loadingEvents}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingEvents ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Buscar..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="security">Seguridad</SelectItem>
                  <SelectItem value="crm">CRM</SelectItem>
                  <SelectItem value="auth">Autenticación</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Severidad" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                  <SelectItem value="USER_MANAGEMENT">Gestión usuarios</SelectItem>
                  <SelectItem value="ROLE_CHANGE">Cambio de roles</SelectItem>
                  <SelectItem value="DATA_MODIFICATION">Modificación datos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">
              Eventos de Auditoría
              {totalCount > 0 && (
                <span className="text-white/40 text-sm font-normal ml-2">
                  ({totalCount} registros)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-white/40" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 mx-auto text-white/20 mb-4" />
                <p className="text-white/40">No se encontraron eventos de auditoría</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/60">Fecha</TableHead>
                        <TableHead className="text-white/60">Severidad</TableHead>
                        <TableHead className="text-white/60">Tipo</TableHead>
                        <TableHead className="text-white/60">Usuario</TableHead>
                        <TableHead className="text-white/60">
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            IP
                          </div>
                        </TableHead>
                        <TableHead className="text-white/60">
                          <div className="flex items-center gap-1">
                            <Monitor className="w-3 h-3" />
                            Navegador
                          </div>
                        </TableHead>
                        <TableHead className="text-white/60">Recurso</TableHead>
                        <TableHead className="text-white/60 text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => {
                        const severityConfig = getSeverityConfig(event.severity);
                        const SeverityIcon = severityConfig.icon;
                        const CategoryIcon = getCategoryIcon(event.event_category);
                        
                        return (
                          <TableRow 
                            key={event.id} 
                            className="border-white/10 hover:bg-white/5 cursor-pointer transition-colors"
                            onClick={() => navigate(`/nexo-av/${userId}/audit/${event.id}`)}
                          >
                            <TableCell className="text-white/60 text-sm whitespace-nowrap">
                              {format(new Date(event.created_at), "dd MMM HH:mm", { locale: es })}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${severityConfig.bg} ${severityConfig.border} ${severityConfig.color} border`}>
                                <SeverityIcon className="w-3 h-3 mr-1" />
                                {event.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CategoryIcon className="w-4 h-4 text-white/40" />
                                <span className="text-white text-sm">{event.event_type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 max-w-[150px]">
                                    <User className="w-4 h-4 text-white/40 flex-shrink-0" />
                                    <span className="text-white/80 text-sm truncate">
                                      {event.user_email || 'Sistema'}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{event.user_email || 'Sistema'}</p>
                                  {event.user_name && <p className="text-white/60">{event.user_name}</p>}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <code className="text-white/60 text-xs font-mono bg-white/5 px-1.5 py-0.5 rounded">
                                    {event.ip_address || '—'}
                                  </code>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Dirección IP: {event.ip_address || 'No disponible'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <span className="text-white/60 text-sm">
                                {parseUserAgentShort(event.user_agent)}
                              </span>
                            </TableCell>
                            <TableCell className="text-white/60 text-sm">
                              {event.resource_type ? (
                                <span>{event.resource_type}/{event.resource_id?.slice(0, 8)}...</span>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-white/40 hover:text-white hover:bg-white/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/nexo-av/${userId}/audit/${event.id}`);
                                }}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="mt-4">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalCount}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    canGoPrev={currentPage > 1}
                    canGoNext={currentPage < totalPages}
                    onPrevPage={() => goToPage(currentPage - 1)}
                    onNextPage={() => goToPage(currentPage + 1)}
                    onGoToPage={goToPage}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AuditPage;
