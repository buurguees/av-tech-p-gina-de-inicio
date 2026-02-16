import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Lightbulb,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  MessageSquare,
  User,
  Tag,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import PaginationControls from "../components/common/PaginationControls";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const rpc = (name: string, params?: Record<string, unknown>) =>
  (supabase.rpc as any)(name, params);

interface Suggestion {
  id: string;
  conversation_id: string;
  message_id: string | null;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  content: string;
  category: string;
  context_summary: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  total_count?: number;
}

interface SuggestionStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  implemented: number;
  duplicate: number;
  by_category: Record<string, number> | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Clock }> = {
  pending: { label: "Pendiente", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: Clock },
  accepted: { label: "Aceptada", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20", icon: CheckCircle2 },
  rejected: { label: "Rechazada", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: XCircle },
  implemented: { label: "Implementada", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Sparkles },
  duplicate: { label: "Duplicada", color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border", icon: Copy },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  ui_improvement: { label: "Mejora UI", color: "text-purple-500" },
  feature_request: { label: "Nueva funcionalidad", color: "text-blue-500" },
  notification: { label: "Notificación", color: "text-orange-500" },
  workflow: { label: "Flujo de trabajo", color: "text-green-500" },
  data_visibility: { label: "Visibilidad datos", color: "text-cyan-500" },
  performance: { label: "Rendimiento", color: "text-red-500" },
  other: { label: "Otro", color: "text-muted-foreground" },
};

const SuggestionsPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [stats, setStats] = useState<SuggestionStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingData, setLoadingData] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    suggestion: Suggestion | null;
    action: "accepted" | "rejected" | "implemented" | "duplicate";
  }>({ open: false, suggestion: null, action: "accepted" });
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 500);
  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data, error } = await supabase.rpc("get_current_user_info");
        if (error || !data || data.length === 0) {
          setLoading(false);
          return;
        }
        const currentUser = data[0];
        const userIsAdmin = currentUser.roles?.includes("admin") || false;
        const userIsManager = currentUser.roles?.includes("manager") || false;

        setIsAdmin(userIsAdmin);
        setIsManager(userIsManager);
        setLoading(false);

        if (userIsAdmin || userIsManager) {
          fetchStats();
          fetchSuggestions();
        } else {
          setAccessDenied(true);
        }
      } catch (err) {
        console.error("Error fetching user info:", err);
        setLoading(false);
      }
    };
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (isAdmin || isManager) {
      fetchSuggestions();
    }
  }, [debouncedSearch, filterStatus, filterCategory, currentPage, isAdmin, isManager]);

  const fetchStats = async () => {
    try {
      const { data, error } = await rpc("ai_get_suggestion_stats");
      if (error) throw error;
      if (data && Array.isArray(data) && data.length > 0) {
        setStats(data[0] as SuggestionStats);
      }
    } catch (err) {
      console.error("Error fetching suggestion stats:", err);
    }
  };

  const fetchSuggestions = async () => {
    setLoadingData(true);
    try {
      const params: Record<string, unknown> = {
        p_limit: pageSize,
        p_offset: (currentPage - 1) * pageSize,
      };
      if (filterStatus !== "all") params.p_status = filterStatus;
      if (filterCategory !== "all") params.p_category = filterCategory;

      const { data, error } = await rpc("ai_list_suggestions", params);
      if (error) throw error;

      const list = (data as Suggestion[]) || [];
      setSuggestions(list);
      if (list.length > 0 && list[0].total_count !== undefined) {
        setTotalCount(Number(list[0].total_count));
      } else {
        setTotalCount(list.length);
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleReview = async () => {
    if (!reviewDialog.suggestion) return;
    setReviewLoading(true);
    try {
      const { error } = await rpc("ai_review_suggestion", {
        p_suggestion_id: reviewDialog.suggestion.id,
        p_status: reviewDialog.action,
        p_admin_notes: adminNotes.trim() || null,
      });
      if (error) throw error;
      setReviewDialog({ open: false, suggestion: null, action: "accepted" });
      setAdminNotes("");
      fetchSuggestions();
      fetchStats();
    } catch (err) {
      console.error("Error reviewing suggestion:", err);
    } finally {
      setReviewLoading(false);
    }
  };

  const openReview = (suggestion: Suggestion, action: "accepted" | "rejected" | "implemented" | "duplicate") => {
    setReviewDialog({ open: true, suggestion, action });
    setAdminNotes(suggestion.admin_notes || "");
  };

  const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const getCategoryConfig = (category: string) => CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Acceso Denegado</h1>
        <p className="text-muted-foreground">
          Solo administradores y managers pueden ver las sugerencias.
        </p>
        <Button onClick={() => navigate(`/nexo-av/${userId}/dashboard`)}>
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6">
      <div className="w-full h-full">
        {/* Back + Title */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(`/nexo-av/${userId}/audit`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Sugerencias del AI
            </h1>
            <p className="text-sm text-muted-foreground">
              Sugerencias detectadas automáticamente por NEXO AI desde las conversaciones
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card className="border border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs">Pendientes</p>
                    <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                  </div>
                  <Clock className="h-6 w-6 text-yellow-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs">Aceptadas</p>
                    <p className="text-2xl font-bold text-green-500">{stats.accepted}</p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-green-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs">Implementadas</p>
                    <p className="text-2xl font-bold text-blue-500">{stats.implemented}</p>
                  </div>
                  <Sparkles className="h-6 w-6 text-blue-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs">Rechazadas</p>
                    <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
                  </div>
                  <XCircle className="h-6 w-6 text-red-500/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs">Total</p>
                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="border border-border mb-6">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Filtra sugerencias por estado o categoría
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { fetchSuggestions(); fetchStats(); }}
                disabled={loadingData}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingData ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="accepted">Aceptada</SelectItem>
                  <SelectItem value="rejected">Rechazada</SelectItem>
                  <SelectItem value="implemented">Implementada</SelectItem>
                  <SelectItem value="duplicate">Duplicada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="ui_improvement">Mejora UI</SelectItem>
                  <SelectItem value="feature_request">Nueva funcionalidad</SelectItem>
                  <SelectItem value="notification">Notificación</SelectItem>
                  <SelectItem value="workflow">Flujo de trabajo</SelectItem>
                  <SelectItem value="data_visibility">Visibilidad datos</SelectItem>
                  <SelectItem value="performance">Rendimiento</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                {filterStatus !== "all" || filterCategory !== "all" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10"
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterCategory("all");
                      setCurrentPage(1);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions Table */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              Sugerencias
              {totalCount > 0 && (
                <span className="text-muted-foreground text-sm font-normal ml-2">
                  ({totalCount} registros)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-12">
                <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No se encontraron sugerencias</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Las sugerencias se detectan automáticamente en las conversaciones del AI
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-muted-foreground">Fecha</TableHead>
                          <TableHead className="text-muted-foreground">Estado</TableHead>
                          <TableHead className="text-muted-foreground">Categoría</TableHead>
                          <TableHead className="text-muted-foreground">Sugerencia</TableHead>
                          <TableHead className="text-muted-foreground">Usuario</TableHead>
                          <TableHead className="text-muted-foreground hidden lg:table-cell">Contexto</TableHead>
                          <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suggestions.map((s) => {
                          const statusCfg = getStatusConfig(s.status);
                          const categoryCfg = getCategoryConfig(s.category);
                          const StatusIcon = statusCfg.icon;

                          return (
                            <TableRow key={s.id}>
                              <TableCell className="text-foreground text-sm whitespace-nowrap">
                                {format(new Date(s.created_at), "dd MMM HH:mm", { locale: es })}
                              </TableCell>
                              <TableCell>
                                <Badge className={`${statusCfg.bg} ${statusCfg.border} ${statusCfg.color} border`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusCfg.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={categoryCfg.color}>
                                  <Tag className="w-3 h-3 mr-1" />
                                  {categoryCfg.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[300px]">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-sm text-foreground truncate cursor-help">
                                      {s.content}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-sm">
                                    <p className="text-sm">{s.content}</p>
                                    {s.admin_notes && (
                                      <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                                        Notas: {s.admin_notes}
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-sm text-foreground truncate max-w-[120px]">
                                    {s.user_name || s.user_email || "—"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className="text-xs text-muted-foreground">
                                  {s.context_summary || "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {s.status === "pending" && isAdmin && (
                                  <div className="flex items-center justify-end gap-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                          onClick={() => openReview(s, "accepted")}
                                        >
                                          <ThumbsUp className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Aceptar</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                          onClick={() => openReview(s, "rejected")}
                                        >
                                          <ThumbsDown className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Rechazar</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                          onClick={() => openReview(s, "duplicate")}
                                        >
                                          <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Marcar duplicada</TooltipContent>
                                    </Tooltip>
                                  </div>
                                )}
                                {s.status === "accepted" && isAdmin && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                        onClick={() => openReview(s, "implemented")}
                                      >
                                        <Sparkles className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Marcar implementada</TooltipContent>
                                  </Tooltip>
                                )}
                                {s.status !== "pending" && s.status !== "accepted" && (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {totalCount > pageSize && (
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
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => {
          if (!open) setReviewDialog({ open: false, suggestion: null, action: "accepted" });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewDialog.action === "accepted" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {reviewDialog.action === "rejected" && <XCircle className="h-5 w-5 text-red-500" />}
              {reviewDialog.action === "implemented" && <Sparkles className="h-5 w-5 text-blue-500" />}
              {reviewDialog.action === "duplicate" && <Copy className="h-5 w-5 text-muted-foreground" />}
              {reviewDialog.action === "accepted" && "Aceptar sugerencia"}
              {reviewDialog.action === "rejected" && "Rechazar sugerencia"}
              {reviewDialog.action === "implemented" && "Marcar como implementada"}
              {reviewDialog.action === "duplicate" && "Marcar como duplicada"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.suggestion?.content}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="admin-notes">Notas (opcional)</Label>
              <Textarea
                id="admin-notes"
                placeholder="Añade notas sobre esta decisión..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialog({ open: false, suggestion: null, action: "accepted" })}
            >
              Cancelar
            </Button>
            <Button onClick={handleReview} disabled={reviewLoading}>
              {reviewLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuggestionsPage;
