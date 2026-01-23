import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  Target,
  Users,
  XCircle,
  Building2,
  FolderKanban,
  Euro,
  TrendingUp,
  BarChart3,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import PaginationControls from "../components/common/PaginationControls";
import { useDebounce } from "@/hooks/useDebounce";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import CreateClientDialog from "../components/clients/CreateClientDialog";
import EditClientDialog from "../components/clients/EditClientDialog";
import DataList, { DataListColumn, DataListAction } from "../components/common/DataList";
import SearchBar, { SearchResult } from "../components/common/SearchBar";

interface Client {
  id: string;
  client_number: string | null;
  company_name: string;
  contact_email: string;
  contact_phone: string | null;
  lead_stage: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  industry_sector: string | null;
  created_at: string;
}

const LEAD_STAGES = [
  { value: 'NEW', label: 'Nuevo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'CONTACTED', label: 'Contactado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'MEETING', label: 'Reunión', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'PROPOSAL', label: 'Propuesta', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { value: 'NEGOTIATION', label: 'Negociación', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'WON', label: 'Ganado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'RECURRING', label: 'Recurrente', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'LOST', label: 'Perdido', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'PAUSED', label: 'Pausado', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
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
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showOnlyMine, setShowOnlyMine] = useState<boolean | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [projectsByClient, setProjectsByClient] = useState<Map<string, number>>(new Map());

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

      // Obtener proyectos por cliente usando RPC
      const { data: projectsData, error: projectsError } = await supabase.rpc('list_projects', {
        p_search: null
      });

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
      }

      const projectsByClientMap = new Map<string, number>();
      (projectsData || []).forEach((project: any) => {
        if (project.client_id) {
          projectsByClientMap.set(project.client_id, (projectsByClientMap.get(project.client_id) || 0) + 1);
        }
      });

      const totalProjects = Array.from(projectsByClientMap.values()).reduce((sum, count) => sum + count, 0);
      const clientsWithProjects = projectsByClientMap.size;
      const avgProjectsPerClient = clientsWithProjects > 0 ? totalProjects / clientsWithProjects : 0;

      // Obtener facturas por cliente (mes actual y total)
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Obtener facturas usando RPC
      const { data: invoicesData, error: invoicesError } = await supabase.rpc('finance_list_invoices', {
        p_search: null,
        p_status: null
      });

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
      }

      // Calcular ticket medio por cliente (usando subtotales)
      const invoicesByClient = new Map<string, number[]>();
      (invoicesData || []).forEach((invoice: any) => {
        if (invoice.client_id && invoice.subtotal && invoice.status !== 'CANCELLED' && invoice.status !== 'DRAFT') {
          const clientInvoices = invoicesByClient.get(invoice.client_id) || [];
          clientInvoices.push(invoice.subtotal);
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

      const monthlyRevenue = monthlyInvoices.reduce((sum: number, inv: any) => sum + (inv.subtotal || 0), 0);

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

      setProjectsByClient(projectsByClientMap);
      
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
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="w-full h-full">
        <div>
          {/* KPIs Cards - Recuento por Estado - Optimizado */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-emerald-500/10 rounded text-emerald-600">
                  <Award className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Recurrentes</span>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">
                  {clientKPIs.byStage['RECURRING'] || 0}
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-green-500/10 rounded text-green-600">
                  <Target className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Ganados</span>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">
                  {clientKPIs.byStage['WON'] || 0}
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-blue-500/10 rounded text-blue-600">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Nuevos Leads</span>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">
                  {clientKPIs.byStage['NEW'] || 0}
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-red-500/10 rounded text-red-600">
                  <XCircle className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Perdidos</span>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">
                  {clientKPIs.byStage['LOST'] || 0}
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-violet-500/10 rounded text-violet-600">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Total</span>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">
                  {clientKPIs.totalClients}
                </span>
              </div>
            </div>
          </div>

          {/* KPIs Cards - Métricas de Negocio - Optimizado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-purple-500/10 rounded text-purple-600">
                  <FolderKanban className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Media Proy./Cliente</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {clientKPIs.avgProjectsPerClient.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-orange-500/10 rounded text-orange-600">
                  <Euro className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Ticket Medio</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(clientKPIs.avgInvoiceTicket)}
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-green-500/10 rounded text-green-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Fact. Mensual</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(clientKPIs.monthlyRevenue)}
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-cyan-500/10 rounded text-cyan-600">
                  <BarChart3 className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Media Fact./Cliente</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(clientKPIs.avgRevenuePerClient)}
                </span>
              </div>
            </div>
          </div>

          {/* KPIs Cards - Métricas Mensuales - Optimizado */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-blue-500/10 rounded text-blue-600">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Nuevos (Mes)</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {clientKPIs.monthlyNewClients}
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-green-500/10 rounded text-green-600">
                  <Target className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Ganados (Mes)</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {clientKPIs.monthlyWonClients}
                </span>
              </div>
            </div>
          </div>

          {/* DetailNavigationBar */}
          <div className="mb-6">
            <DetailNavigationBar
              pageTitle="Clientes"
              contextInfo={
                <SearchBar
                  value={searchInput}
                  onChange={setSearchInput}
                  items={clients}
                  getSearchText={(client) => `${client.company_name} ${client.contact_email} ${client.contact_phone || ''} ${client.client_number || ''}`}
                  renderResult={(client) => ({
                    id: client.id,
                    label: client.company_name,
                    subtitle: client.contact_email,
                    icon: <Building2 className="h-4 w-4" />,
                    data: client,
                  })}
                  onSelectResult={(result) => {
                    navigate(`/nexo-av/${userId}/clients/${result.data.id}`);
                  }}
                  placeholder="Buscar clientes..."
                  maxResults={8}
                  debounceMs={300}
                />
              }
              tools={
                <DetailActionButton
                  actionType="new_client"
                  onClick={() => setShowCreateDialog(true)}
                />
              }
            />
          </div>

          {/* DataList */}
          <DataList
            data={paginatedClients}
            columns={[
              {
                key: "client_number",
                label: "Nº",
                sortable: true,
                align: "left",
                priority: 1,
                render: (client) => (
                  <span className="text-foreground/80 text-[10px]">
                    {client.client_number || '-'}
                  </span>
                ),
              },
              {
                key: "company_name",
                label: "Empresa",
                sortable: true,
                align: "left",
                priority: 3,
                render: (client) => (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted/30">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium text-[10px]">{client.company_name}</p>
                      {client.industry_sector && (
                        <p className="text-muted-foreground text-[9px]">
                          {client.industry_sector}
                        </p>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: "lead_stage",
                label: "Estado",
                sortable: true,
                align: "center",
                priority: 2,
                render: (client) => {
                  const stageInfo = getStageInfo(client.lead_stage);
                  return (
                    <div className="flex justify-center">
                      <Badge variant="outline" className={cn(stageInfo.color, "border text-[9px] px-1.5 py-0.5 w-20 justify-center")}>
                        {stageInfo.label}
                      </Badge>
                    </div>
                  );
                },
              },
              {
                key: "projects",
                label: "Proyectos",
                align: "center",
                priority: 4,
                render: (client) => (
                  <span className="text-foreground font-medium text-[10px]">
                    {projectsByClient.get(client.id) || 0}
                  </span>
                ),
              },
              {
                key: "contact_email",
                label: "Email",
                align: "left",
                priority: 5,
                render: (client) => (
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[9px]">
                    <Mail className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[200px]">{client.contact_email}</span>
                  </div>
                ),
              },
              {
                key: "contact_phone",
                label: "Teléfono",
                align: "left",
                priority: 6,
                render: (client) => (
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[9px]">
                    <Phone className="h-2.5 w-2.5" />
                    {client.contact_phone || '-'}
                  </div>
                ),
              },
              {
                key: "assigned_to_name",
                label: "Asignado",
                sortable: true,
                align: "left",
                priority: 7,
                render: (client) => (
                  <span className="text-muted-foreground text-[10px]">
                    {client.assigned_to_name || <span className="text-muted-foreground/50">Sin asignar</span>}
                  </span>
                ),
              },
            ]}
            actions={[
              {
                label: "Ver detalle",
                onClick: (client) => navigate(`/nexo-av/${userId}/clients/${client.id}`),
              },
              {
                label: "Editar",
                onClick: (client) => handleEditClient(client.id),
              },
              {
                label: "Duplicar",
                onClick: () => {},
              },
            ]}
            onItemClick={(client) => navigate(`/nexo-av/${userId}/clients/${client.id}`)}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={loading}
            emptyMessage="No hay clientes"
            emptyIcon={<Building2 className="h-16 w-16 text-muted-foreground" />}
            getItemId={(client) => client.id}
          />

          {/* Paginación */}
          {!loading && filteredClients.length > 0 && totalPages > 1 && (
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
        </div>
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

export default ClientsPageDesktop;
