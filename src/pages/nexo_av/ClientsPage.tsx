import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  ShieldAlert,
  Building2,
  Phone,
  Mail,
  Calendar,
  User,
  Filter,
  Users,
  UserCheck,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Info,
  Euro,
  FolderKanban,
  TrendingUp,
  BarChart3,
  Target,
  Award,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox as UICheckbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import CreateClientDialog from "./components/CreateClientDialog";
import EditClientDialog from "./components/EditClientDialog";
import PaginationControls from "./components/PaginationControls";
import { useIsMobile } from "@/hooks/use-mobile";
import { lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { createMobilePage } from "./MobilePageWrapper";

// Lazy load mobile components
const ClientsListMobile = lazy(() => import("./components/mobile/ClientsListMobile"));
const ClientsPageMobile = lazy(() => import("./mobile/ClientsPageMobile"));

interface Client {
  id: string;
  client_number: string | null;
  company_name: string;
  contact_phone: string;
  contact_email: string;
  tax_id: string | null;
  legal_name: string | null;
  industry_sector: string | null;
  lead_stage: string;
  lead_source: string | null;
  urgency: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  next_follow_up_date: string | null;
  created_at: string;
  notes: string | null;
}

const LEAD_STAGES = [
  { value: 'NEW', label: 'Nuevo', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'CONTACTED', label: 'Contactado', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'MEETING', label: 'Reunión', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'PROPOSAL', label: 'Propuesta', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'NEGOTIATION', label: 'Negociación', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'WON', label: 'Ganado', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'RECURRING', label: 'Recurrente', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'LOST', label: 'Perdido', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'PAUSED', label: 'Pausado', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

const getStageInfo = (stage: string) => {
  return LEAD_STAGES.find(s => s.value === stage) || LEAD_STAGES[0];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const ClientsPageDesktop = () => {
  const { userId } = useParams<{ userId: string }>();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showOnlyMine, setShowOnlyMine] = useState<boolean | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [clientKPIs, setClientKPIs] = useState({
    byStage: {} as Record<string, number>,
    avgProjectsPerClient: 0,
    avgInvoiceTicket: 0,
    totalClients: 0,
    monthlyNewClients: 0,
    monthlyWonClients: 0,
    monthlyRevenue: 0,
    avgRevenuePerClient: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Filter clients based on showOnlyMine toggle - moved here for hook consistency
  const filteredClients = showOnlyMine === true
    ? clients.filter(c => c.assigned_to === currentUserId || c.assigned_to === null)
    : clients;


  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "number":
        aValue = a.client_number || "";
        bValue = b.client_number || "";
        break;
      case "company":
        aValue = a.company_name || "";
        bValue = b.company_name || "";
        break;
      case "stage":
        aValue = a.lead_stage;
        bValue = b.lead_stage;
        break;
      case "assigned":
        aValue = a.assigned_to_name || "";
        bValue = b.assigned_to_name || "";
        break;
      case "followup":
        aValue = a.next_follow_up_date ? new Date(a.next_follow_up_date).getTime() : 0;
        bValue = b.next_follow_up_date ? new Date(b.next_follow_up_date).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination hook must be called unconditionally at the top level
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedClients,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(sortedClients, { pageSize: 50 });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(new Set(paginatedClients.map(c => c.id)));
    } else {
      setSelectedClients(new Set());
    }
  };

  const handleSelectClient = (clientId: string, checked: boolean) => {
    const newSelected = new Set(selectedClients);
    if (checked) {
      newSelected.add(clientId);
    } else {
      newSelected.delete(clientId);
    }
    setSelectedClients(newSelected);
  };

  const handleEditClient = async (clientId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_client', {
        p_client_id: clientId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setEditingClient(data[0]);
        setEditDialogOpen(true);
      } else {
        toast({
          title: "Error",
          description: "No se pudo encontrar la información detallada del cliente",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error fetching client for edit:', err);
      toast({
        title: "Error",
        description: "No se pudo cargar el cliente para editar",
        variant: "destructive",
      });
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.rpc('list_clients', {
        p_lead_stage: stageFilter === 'all' ? null : stageFilter,
        p_search: debouncedSearchTerm || null,
      });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_user_info');

        if (error || !data || data.length === 0) {
          console.error('Error fetching user info:', error);
          return;
        }

        const currentUserInfo = data[0];
        setCurrentUserId(currentUserInfo.user_id);
        const userIsAdmin = currentUserInfo.roles?.includes('admin') || false;
        setIsAdmin(userIsAdmin);
        // For admins, default to showing all clients; for others, show only their clients
        setShowOnlyMine(!userIsAdmin);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user info:', err);
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchClients();
    }
  }, [loading, stageFilter, debouncedSearchTerm]);

  useEffect(() => {
    if (clients.length > 0) {
      calculateClientKPIs();
    }
  }, [clients]);


  const calculateClientKPIs = async () => {
    try {
      // Contar clientes por estado
      const byStage: Record<string, number> = {};
      LEAD_STAGES.forEach(stage => {
        byStage[stage.value] = clients.filter(c => c.lead_stage === stage.value).length;
      });

      // Obtener proyectos por cliente
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects.projects')
        .select('client_id');

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
      }

      const projectsByClient = new Map<string, number>();
      (projectsData || []).forEach((project: any) => {
        if (project.client_id) {
          projectsByClient.set(project.client_id, (projectsByClient.get(project.client_id) || 0) + 1);
        }
      });

      const totalProjects = Array.from(projectsByClient.values()).reduce((sum, count) => sum + count, 0);
      const clientsWithProjects = projectsByClient.size;
      const avgProjectsPerClient = clientsWithProjects > 0 ? totalProjects / clientsWithProjects : 0;

      // Obtener facturas por cliente (mes actual y total)
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('sales.invoices')
        .select('client_id, total, issue_date, status');

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
      }

      // Calcular ticket medio por cliente
      const invoicesByClient = new Map<string, number[]>();
      (invoicesData || []).forEach((invoice: any) => {
        if (invoice.client_id && invoice.total && invoice.status !== 'CANCELLED' && invoice.status !== 'DRAFT') {
          const clientInvoices = invoicesByClient.get(invoice.client_id) || [];
          clientInvoices.push(invoice.total);
          invoicesByClient.set(invoice.client_id, clientInvoices);
        }
      });

      const allInvoiceTotals: number[] = [];
      invoicesByClient.forEach((invoices) => {
        allInvoiceTotals.push(...invoices);
      });

      const avgInvoiceTicket = allInvoiceTotals.length > 0
        ? allInvoiceTotals.reduce((sum, total) => sum + total, 0) / allInvoiceTotals.length
        : 0;

      // Calcular KPIs mensuales
      const monthlyInvoices = (invoicesData || []).filter((inv: any) => {
        if (!inv.issue_date) return false;
        const invoiceDate = new Date(inv.issue_date);
        return invoiceDate >= firstDayOfMonth && invoiceDate <= lastDayOfMonth &&
               inv.status !== 'CANCELLED' && inv.status !== 'DRAFT';
      });

      const monthlyRevenue = monthlyInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      // Clientes nuevos del mes
      const monthlyNewClients = clients.filter(c => {
        const createdDate = new Date(c.created_at);
        return createdDate >= firstDayOfMonth && createdDate <= lastDayOfMonth;
      }).length;

      // Clientes ganados del mes (cambios de estado a WON o RECURRING)
      const monthlyWonClients = clients.filter(c => {
        const createdDate = new Date(c.created_at);
        return createdDate >= firstDayOfMonth && createdDate <= lastDayOfMonth &&
               (c.lead_stage === 'WON' || c.lead_stage === 'RECURRING');
      }).length;

      // Media de facturación por cliente
      const clientsWithInvoices = invoicesByClient.size;
      const avgRevenuePerClient = clientsWithInvoices > 0
        ? monthlyRevenue / clientsWithInvoices
        : 0;

      setClientKPIs({
        byStage,
        avgProjectsPerClient,
        avgInvoiceTicket,
        totalClients: clients.length,
        monthlyNewClients,
        monthlyWonClients,
        monthlyRevenue,
        avgRevenuePerClient
      });
    } catch (error) {
      console.error('Error calculating client KPIs:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full px-3 md:px-4 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* KPIs Cards - Recuento por Estado */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                  <Award className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Recurrentes</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {clientKPIs.byStage['RECURRING'] || 0}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
                  <Target className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Ganados</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {clientKPIs.byStage['WON'] || 0}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Nuevos Leads</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {clientKPIs.byStage['NEW'] || 0}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-600">
                  <XCircle className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Perdidos</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {clientKPIs.byStage['LOST'] || 0}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-violet-500/10 rounded-lg text-violet-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Total</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {clientKPIs.totalClients}
                </span>
              </div>
            </motion.div>
          </div>

          {/* KPIs Cards - Métricas de Negocio */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Media Proyectos/Cliente</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {clientKPIs.avgProjectsPerClient.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground ml-2 block mt-1">
                  proyectos por cliente
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-600">
                  <Euro className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Ticket Medio Factura</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(clientKPIs.avgInvoiceTicket)}
                </span>
                <span className="text-xs text-muted-foreground ml-2 block mt-1">
                  por factura
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Facturación Mensual</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(clientKPIs.monthlyRevenue)}
                </span>
                <span className="text-xs text-muted-foreground ml-2 block mt-1">
                  este mes
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Media Facturación/Cliente</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(clientKPIs.avgRevenuePerClient)}
                </span>
                <span className="text-xs text-muted-foreground ml-2 block mt-1">
                  por cliente/mes
                </span>
              </div>
            </motion.div>
          </div>

          {/* KPIs Cards - Métricas Mensuales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                  <User className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Nuevos Clientes (Mes)</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {clientKPIs.monthlyNewClients}
                </span>
                <span className="text-xs text-muted-foreground ml-2 block mt-1">
                  clientes nuevos este mes
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
                  <Target className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Clientes Ganados (Mes)</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {clientKPIs.monthlyWonClients}
                </span>
                <span className="text-xs text-muted-foreground ml-2 block mt-1">
                  ganados este mes
                </span>
              </div>
            </motion.div>
          </div>

          {/* Header - Estilo Holded */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Clientes</h1>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Acciones
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      Exportar seleccionados
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      Asignar seleccionados
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="h-9 px-4 text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Nuevo cliente
                  <span className="ml-2 text-xs opacity-70">N</span>
                </Button>
              </div>
            </div>

            {/* Search and Filters Bar - Estilo Holded */}
            <div className="flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs",
                      stageFilter !== "all" && "bg-accent"
                    )}
                  >
                    {stageFilter === "all" ? "Todos" : LEAD_STAGES.find(s => s.value === stageFilter)?.label || "Todos"}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => setStageFilter("all")}
                    className={cn(stageFilter === "all" && "bg-accent")}
                  >
                    Todos
                  </DropdownMenuItem>
                  {LEAD_STAGES.map((stage) => (
                    <DropdownMenuItem
                      key={stage.value}
                      onClick={() => setStageFilter(stage.value)}
                      className={cn(stageFilter === stage.value && "bg-accent")}
                    >
                      {stage.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-secondary border border-border">
                <Switch
                  id="show-mine"
                  checked={showOnlyMine === true}
                  onCheckedChange={setShowOnlyMine}
                />
                <Label htmlFor="show-mine" className="text-foreground text-xs flex items-center gap-1.5 cursor-pointer">
                  {showOnlyMine === true ? (
                    <>
                      <UserCheck className="h-3 w-3" />
                      Mis clientes
                    </>
                  ) : (
                    <>
                      <Users className="h-3 w-3" />
                      Todos
                    </>
                  )}
                </Label>
              </div>

              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pr-11 h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Mobile card view */}
          {isMobile ? (
            <Suspense fallback={
              <div className="flex items-center justify-center py-12 md:hidden">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
              </div>
            }>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="md:hidden"
              >
                <ClientsListMobile
                  clients={paginatedClients}
                  getStageInfo={getStageInfo}
                  onClientClick={(clientId) => navigate(`/nexo-av/${userId}/clients/${clientId}`)}
                  onCreateClick={() => setShowCreateDialog(true)}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={totalItems}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                  onPrevPage={prevPage}
                  onNextPage={nextPage}
                  onGoToPage={goToPage}
                />
              </motion.div>
            </Suspense>
          ) : null}

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay clientes</p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                Crea tu primer cliente para comenzar
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                      <TableHead className="w-12 px-4">
                        <UICheckbox
                          checked={selectedClients.size === paginatedClients.length && paginatedClients.length > 0}
                          onCheckedChange={handleSelectAll}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableHead>
                      <TableHead
                        className="text-muted-foreground cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("number")}
                      >
                        <div className="flex items-center gap-1">
                          Nº
                          {sortColumn === "number" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("company")}
                      >
                        <div className="flex items-center gap-1">
                          Empresa
                          {sortColumn === "company" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-white/70">Contacto</TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("stage")}
                      >
                        <div className="flex items-center gap-1">
                          Estado
                          {sortColumn === "stage" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("assigned")}
                      >
                        <div className="flex items-center gap-1">
                          Asignado
                          {sortColumn === "assigned" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-white/70 cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("followup")}
                      >
                        <div className="flex items-center gap-1">
                          Seguimiento
                          {sortColumn === "followup" && (
                            sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-white/70 w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClients.map((client) => {
                      const stageInfo = getStageInfo(client.lead_stage);
                      const isSelected = selectedClients.has(client.id);
                      return (
                        <TableRow
                          key={client.id}
                          className={cn(
                            "border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors duration-200",
                            isSelected && "bg-white/10"
                          )}
                          onClick={() => navigate(`/nexo-av/${userId}/clients/${client.id}`)}
                        >
                          <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                            <UICheckbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                              className="border-white/30 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-white/70 text-sm">
                            {client.client_number ? `#${client.client_number}` : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-white/5">
                                <Building2 className="h-4 w-4 text-white/60" />
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm">{client.company_name}</p>
                                {client.industry_sector && (
                                  <p className="text-white/40 text-xs">
                                    {client.industry_sector}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-white/60 text-xs">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[200px]">{client.contact_email}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-white/60 text-xs">
                                <Phone className="h-3 w-3" />
                                {client.contact_phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(stageInfo.color, "border text-xs")}>
                              {stageInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white/70 text-sm">
                            {client.assigned_to_name || <span className="text-white/30">Sin asignar</span>}
                          </TableCell>
                          <TableCell className="text-white/70 text-sm">
                            {client.next_follow_up_date ? (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                {new Date(client.next_follow_up_date).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </div>
                            ) : (
                              <span className="text-white/30">-</span>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-white/40 hover:text-foreground hover:bg-white/10"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                <DropdownMenuItem
                                  className="text-white hover:bg-white/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/nexo-av/${userId}/clients/${client.id}`);
                                  }}
                                >
                                  Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-white hover:bg-white/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClient(client.id);
                                  }}
                                >
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-white hover:bg-white/10">
                                  Duplicar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={totalItems}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                  onPrevPage={prevPage}
                  onNextPage={nextPage}
                  onGoToPage={goToPage}
                />
              )}
            </>
          )}
        </motion.div>
      </div>

      <CreateClientDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          fetchClients();
          toast({
            title: "Cliente creado",
            description: "El cliente se ha creado correctamente.",
          });
        }}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />

      {editingClient && (
        <EditClientDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          client={editingClient}
          isAdmin={isAdmin}
          onSuccess={() => {
            fetchClients();
            setEditingClient(null);
          }}
        />
      )}
    </div>
  );
};

// Export version with mobile routing
const ClientsPage = createMobilePage({
  DesktopComponent: ClientsPageDesktop,
  MobileComponent: ClientsPageMobile,
});

export default ClientsPage;
