import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Loader2, 
  Plus,
  Search,
  ChevronRight,
  Building2,
  User,
  Phone,
  Mail,
  Euro,
  TrendingUp,
  FolderKanban,
  Target,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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
  { value: 'NEGOTIATION', label: 'En Negociación', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'WON', label: 'Ganado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'LOST', label: 'Perdido', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'RECURRING', label: 'Recurrente', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
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

const MobileClientsPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  const [clientKPIs, setClientKPIs] = useState({
    avgRevenuePerClient: 0,
    totalClients: 0,
    monthlyNewClients: 0,
    monthlyWonClients: 0,
    avgProjectsPerClient: 0,
    avgInvoiceTicket: 0
  });

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_clients', {
        p_lead_stage: null,
        p_search: debouncedSearchTerm || null,
      });

      if (error) throw error;
      
      const clientsList = data || [];
      setClients(clientsList);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateClientKPIs = async () => {
    try {
      // Obtener proyectos por cliente
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

      // Obtener facturas por cliente
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data: invoicesData, error: invoicesError } = await supabase.rpc('finance_list_invoices', {
        p_search: null,
        p_status: null
      });

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
      }

      // Calcular ticket medio por cliente
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

      // Clientes ganados del mes (WON o RECURRING)
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
        avgRevenuePerClient,
        totalClients: clients.length,
        monthlyNewClients,
        monthlyWonClients,
        avgProjectsPerClient,
        avgInvoiceTicket
      });
    } catch (error) {
      console.error('Error calculating client KPIs:', error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (clients.length > 0) {
      calculateClientKPIs();
    }
  }, [clients]);

  const handleClientClick = (clientId: string) => {
    navigate(`/nexo-av/${userId}/clients/${clientId}`);
  };

  const handleCreateClient = () => {
    navigate(`/nexo-av/${userId}/clients/new`);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Fixed Header Section: KPIs + Search - Always visible, never scrolls */}
      <div 
        className="flex-shrink-0 py-3 px-3 w-full"
        style={{ background: 'linear-gradient(0deg, rgba(0, 0, 0, 1) 100%, rgba(255, 255, 255, 0) 0%)', height: 'fit-content' }}
      >
        {/* KPI Cards - Compact: Icon + Number/Value */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {/* Facturación Media por Cliente - Principal */}
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg text-green-500">
              <Euro className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground block">Fact. Media</span>
              <span className="text-sm text-foreground font-semibold truncate">
                {formatCurrency(clientKPIs.avgRevenuePerClient)}
              </span>
            </div>
          </div>

          {/* Total Clientes */}
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground block">Total</span>
              <span className="text-lg text-foreground font-semibold">
                {clientKPIs.totalClients}
              </span>
            </div>
          </div>

          {/* Proyectos Promedio */}
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500">
              <FolderKanban className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground block">Proy. Prom.</span>
              <span className="text-lg text-foreground font-semibold">
                {clientKPIs.avgProjectsPerClient.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Second Row of KPIs */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {/* Clientes Nuevos del Mes */}
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-yellow-500/10 rounded-lg text-yellow-500">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground block">Nuevos Mes</span>
              <span className="text-lg text-foreground font-semibold">
                {clientKPIs.monthlyNewClients}
              </span>
            </div>
          </div>

          {/* Clientes Ganados del Mes */}
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
              <Target className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground block">Ganados Mes</span>
              <span className="text-lg text-foreground font-semibold">
                {clientKPIs.monthlyWonClients}
              </span>
            </div>
          </div>

          {/* Ticket Medio */}
          <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-500">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground block">Ticket Medio</span>
              <span className="text-sm text-foreground font-semibold truncate">
                {formatCurrency(clientKPIs.avgInvoiceTicket)}
              </span>
            </div>
          </div>
        </div>

        {/* Search and Create Button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar clientes..."
              className="pl-9 h-8 bg-card border-border text-sm"
            />
          </div>
          {/* Button styled like bottom navigation - same height as input */}
          <button
            onClick={handleCreateClient}
            className={cn(
              "h-8 px-3 flex items-center justify-center gap-1.5 rounded-full",
              "text-sm font-medium whitespace-nowrap leading-none",
              "bg-white/10 backdrop-blur-xl border border-[rgba(79,79,79,1)]",
              "text-white/90 hover:text-white hover:bg-white/15",
              "active:scale-95 transition-all duration-200",
              "shadow-[inset_0px_0px_15px_5px_rgba(138,138,138,0.1)]"
            )}
            style={{ touchAction: 'manipulation', height: '32px' }}
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo</span>
          </button>
        </div>
      </div>

      {/* Clients List - Scrollable area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-3 pb-[80px] w-full h-full px-[15px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay clientes</p>
            <p className="text-muted-foreground text-sm">
              {searchInput ? 'Prueba con otra búsqueda' : 'Crea tu primer cliente'}
            </p>
          </div>
        ) : (
          clients.map((client) => {
            const stageInfo = getStageInfo(client.lead_stage);
            return (
              <button
                key={client.id}
                onClick={() => handleClientClick(client.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl",
                  "bg-card border border-border",
                  "active:scale-[0.98] transition-all duration-200",
                  "hover:border-primary/30"
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex items-center gap-3">
                  {/* Stage Badge - Fixed width column */}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      stageInfo.color, 
                      "text-[10px] px-2 py-0.5 w-[80px] justify-center flex-shrink-0 whitespace-nowrap"
                    )}
                  >
                    {stageInfo.label}
                  </Badge>
                  
                  {/* Client Name - Flexible column */}
                  <div className="flex-1 min-w-0">
                    <span className="font-normal text-foreground truncate text-sm block">
                      {client.company_name}
                    </span>
                    {client.contact_phone && (
                      <span className="text-xs text-muted-foreground truncate block">
                        {client.contact_phone}
                      </span>
                    )}
                  </div>
                  
                  {/* Arrow */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MobileClientsPage;
