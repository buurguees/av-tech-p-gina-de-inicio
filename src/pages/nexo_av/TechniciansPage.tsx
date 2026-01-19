import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Loader2,
  Plus,
  ChevronDown,
  Filter,
  UserRound,
  Mail,
  Phone,
  Euro,
  MapPin,
  Star,
  Building2,
  Briefcase,
  Users,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createMobilePage } from "./MobilePageWrapper";
import CreateTechnicianDialog from "./components/CreateTechnicianDialog";
import { MoreVertical, Info } from "lucide-react";

const TechniciansPageMobile = lazy(() => import("./mobile/TechniciansPageMobile"));

interface Technician {
  id: string;
  technician_number: string;
  company_name: string;
  legal_name: string;
  tax_id: string;
  type: string;
  contact_email: string;
  contact_phone: string;
  contact_name: string;
  city: string;
  province: string;
  status: string;
  specialties: string[];
  daily_rate: number;
  hourly_rate: number;
  monthly_salary: number | null;
  rating: number;
  created_at: string;
}

const TechniciansPageDesktop = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [monthlyCosts, setMonthlyCosts] = useState({
    freelancers: 0,
    companies: 0,
    employees: 0,
    totalExternal: 0,
    totalEmployees: 0,
    avgFreelancer: 0,
    avgCompany: 0,
    avgEmployee: 0
  });

  useEffect(() => {
    fetchTechnicians();
  }, [debouncedSearchQuery, statusFilter, typeFilter]);

  useEffect(() => {
    if (technicians.length > 0) {
      calculateMonthlyCosts();
    }
  }, [technicians]);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_technicians", {
        p_search: debouncedSearchQuery || null,
        p_status: statusFilter === "all" ? null : statusFilter,
        p_type: typeFilter === "all" ? null : typeFilter,
      });
      if (error) throw error;
      setTechnicians(data || []);
    } catch (error: any) {
      console.error("Error fetching technicians:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los técnicos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateMonthlyCosts = async () => {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Calcular costes de plantilla (suma de monthly_salary)
      const employees = technicians.filter(t => t.type === 'EMPLOYEE' && t.status === 'ACTIVE');
      const totalEmployees = employees.reduce((sum, emp) => sum + (emp.monthly_salary || 0), 0);
      const avgEmployee = employees.length > 0 ? totalEmployees / employees.length : 0;

      // Obtener facturas de compra del mes actual para técnicos freelance/empresas
      const { data: purchaseInvoicesData, error: invoicesError } = await supabase.rpc('list_purchase_invoices', {
        p_limit: 10000,
        p_offset: 0,
        p_search: null,
        p_status: null,
        p_document_type: null
      });

      if (invoicesError) {
        console.error('Error fetching purchase invoices:', invoicesError);
        return;
      }

      // Filtrar facturas del mes actual para técnicos
      const purchaseInvoices = (purchaseInvoicesData || []).filter((inv: any) => {
        if (!inv.technician_id || !inv.issue_date) return false;
        const invoiceDate = new Date(inv.issue_date);
        return invoiceDate >= firstDayOfMonth && invoiceDate <= lastDayOfMonth &&
               (inv.status === 'APPROVED' || inv.status === 'PAID');
      });

      if (error) {
        console.error('Error fetching purchase invoices:', error);
        return;
      }

      // Separar facturas por tipo de técnico
      const freelancerIds = technicians
        .filter(t => t.type === 'FREELANCER' && t.status === 'ACTIVE')
        .map(t => t.id);
      
      const companyIds = technicians
        .filter(t => t.type === 'COMPANY' && t.status === 'ACTIVE')
        .map(t => t.id);

      const freelancerInvoices = purchaseInvoices?.filter(inv => 
        inv.technician_id && freelancerIds.includes(inv.technician_id)
      ) || [];
      
      const companyInvoices = purchaseInvoices?.filter(inv => 
        inv.technician_id && companyIds.includes(inv.technician_id)
      ) || [];

      const totalFreelancers = freelancerInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalCompanies = companyInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalExternal = totalFreelancers + totalCompanies;

      const activeFreelancers = technicians.filter(t => t.type === 'FREELANCER' && t.status === 'ACTIVE');
      const activeCompanies = technicians.filter(t => t.type === 'COMPANY' && t.status === 'ACTIVE');

      const avgFreelancer = activeFreelancers.length > 0 ? totalFreelancers / activeFreelancers.length : 0;
      const avgCompany = activeCompanies.length > 0 ? totalCompanies / activeCompanies.length : 0;

      setMonthlyCosts({
        freelancers: totalFreelancers,
        companies: totalCompanies,
        employees: totalEmployees,
        totalExternal,
        totalEmployees,
        avgFreelancer,
        avgCompany,
        avgEmployee
      });
    } catch (error) {
      console.error('Error calculating monthly costs:', error);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Activo', color: 'bg-green-100 text-green-700 border-green-300' };
      case 'INACTIVE':
        return { label: 'Inactivo', color: 'bg-zinc-100 text-zinc-700 border-zinc-300' };
      case 'BLOCKED':
        return { label: 'Bloqueado', color: 'bg-red-100 text-red-700 border-red-300' };
      default:
        return { label: status, color: 'bg-zinc-100 text-zinc-700 border-zinc-300' };
    }
  };

  return (
    <div className="w-full">
      <div className="w-full px-3 md:px-4 pb-4 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Summary Cards - Recuento por tipo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                  <UserRound className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Autónomos</span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold text-foreground">
                  {technicians.filter(t => t.type === 'FREELANCER').length}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {technicians.filter(t => t.type === 'FREELANCER' && t.status === 'ACTIVE').length} activos
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
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Empresas</span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold text-foreground">
                  {technicians.filter(t => t.type === 'COMPANY').length}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {technicians.filter(t => t.type === 'COMPANY' && t.status === 'ACTIVE').length} activas
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
                <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
                  <Briefcase className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Plantilla</span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold text-foreground">
                  {technicians.filter(t => t.type === 'EMPLOYEE').length}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {technicians.filter(t => t.type === 'EMPLOYEE' && t.status === 'ACTIVE').length} activos
                </span>
              </div>
            </motion.div>
          </div>

          {/* Costes Mensuales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-600">
                  <Euro className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Coste Mensual Total</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(monthlyCosts.totalExternal + monthlyCosts.totalEmployees)}
                </span>
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                  <span>Ext: {formatCurrency(monthlyCosts.totalExternal)}</span>
                  <span>•</span>
                  <span>Plantilla: {formatCurrency(monthlyCosts.totalEmployees)}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Media Autónomos</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(monthlyCosts.avgFreelancer)}
                </span>
                <span className="text-xs text-muted-foreground ml-2 block mt-1">
                  por técnico/mes
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-card/50 border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Media Empresas</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(monthlyCosts.avgCompany)}
                </span>
                <span className="text-xs text-muted-foreground ml-2 block mt-1">
                  por empresa/mes
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
                <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-sm font-medium">Media Plantilla</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(monthlyCosts.avgEmployee)}
                </span>
                <span className="text-xs text-muted-foreground ml-2 block mt-1">
                  por empleado/mes
                </span>
              </div>
            </motion.div>
          </div>

          {/* Header - Estilo ProjectsPage */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Técnicos</h1>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="h-9 px-4 text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Nuevo técnico
                </Button>
              </div>
            </div>

            {/* Search Bar - Estilo ProjectsPage */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar técnicos..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pr-11 h-8 text-xs"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Filter className="h-3 w-3 mr-1.5" />
                    {typeFilter === "all" ? "Tipo" : typeFilter}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                    Todos los tipos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("FREELANCER")}>
                    Autónomo / Freelance
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("COMPANY")}>
                    Empresa Externa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    {statusFilter === "all" ? "Estado" : statusFilter}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    Cualquier estado
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("ACTIVE")}>
                    Disponible / Activo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("INACTIVE")}>
                    No disponible
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : technicians.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <UserRound className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay técnicos</p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                Crea tu primer técnico para comenzar
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/30">
                    <TableHead className="text-white/70">Técnico</TableHead>
                    <TableHead className="text-white/70">Especialidades</TableHead>
                    <TableHead className="text-white/70">Tarifas</TableHead>
                    <TableHead className="text-white/70">Estado</TableHead>
                    <TableHead className="text-white/70 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicians.map((tech) => {
                    const statusInfo = getStatusInfo(tech.status);
                    return (
                      <TableRow
                        key={tech.id}
                        className={cn(
                          "border-white/10 cursor-pointer hover:bg-white/[0.06] transition-colors duration-200"
                        )}
                        onClick={() => navigate(`/nexo-av/${userId}/technicians/${tech.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 font-bold text-sm">
                              {tech.company_name.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-white text-sm">
                                {tech.company_name}
                              </span>
                              {tech.city && (
                                <span className="text-xs text-white/50 mt-0.5">{tech.city}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[250px]">
                            {tech.specialties && tech.specialties.length > 0 ? (
                              tech.specialties.slice(0, 3).map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {s}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-white/50 text-xs">—</span>
                            )}
                            {tech.specialties && tech.specialties.length > 3 && (
                              <span className="text-xs text-white/50">+{tech.specialties.length - 3}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {tech.type === "EMPLOYEE" && tech.monthly_salary && tech.monthly_salary > 0 ? (
                              <span className="text-sm text-white/80 font-medium">{formatCurrency(tech.monthly_salary)}/mes</span>
                            ) : (
                              <>
                                {tech.daily_rate && tech.daily_rate > 0 && (
                                  <span className="text-sm text-white/80 font-medium">{formatCurrency(tech.daily_rate)}/día</span>
                                )}
                                {tech.hourly_rate && tech.hourly_rate > 0 && (
                                  <span className="text-xs text-white/60">{formatCurrency(tech.hourly_rate)}/h</span>
                                )}
                                {(!tech.daily_rate || tech.daily_rate === 0) && (!tech.hourly_rate || tech.hourly_rate === 0) && (
                                  <span className="text-white/50 text-xs">—</span>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(statusInfo.color, "border text-xs")}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                              <DropdownMenuItem
                                className="text-white hover:bg-white/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/nexo-av/${userId}/technicians/${tech.id}`);
                                }}
                              >
                                Ver detalle
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
          )}
        </motion.div>
      </div>

      <CreateTechnicianDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          setIsDialogOpen(false);
          fetchTechnicians();
        }}
      />
    </div>
  );
};

const TechniciansPage = createMobilePage({
  DesktopComponent: TechniciansPageDesktop,
  MobileComponent: TechniciansPageMobile,
});

export default TechniciansPage;
