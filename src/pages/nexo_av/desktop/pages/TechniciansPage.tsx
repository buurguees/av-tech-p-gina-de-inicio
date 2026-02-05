import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  UserRound,
  Building2,
  Briefcase,
  Euro,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Star,
  Trash2,
} from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import PaginationControls from "../components/common/PaginationControls";
import { useDebounce } from "@/hooks/useDebounce";
import DetailNavigationBar from "../components/navigation/DetailNavigationBar";
import DetailActionButton from "../components/navigation/DetailActionButton";
import CreateTechnicianDialog from "../components/technicians/CreateTechnicianDialog";
import DataList, { DataListColumn } from "../components/common/DataList";
import SearchBar from "../components/common/SearchBar";
import ConfirmActionDialog from "../components/common/ConfirmActionDialog";

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
  monthly_salary?: number | null;
  rating: number;
  created_at: string;
}

const TECHNICIAN_TYPES = [
  { value: 'FREELANCER', label: 'Autónomo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'COMPANY', label: 'Empresa', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'EMPLOYEE', label: 'Plantilla', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
];

const TECHNICIAN_STATUSES = [
  { value: 'ACTIVE', label: 'Activo', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'INACTIVE', label: 'Inactivo', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { value: 'BLOCKED', label: 'Bloqueado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const getTypeInfo = (type: string) => {
  return TECHNICIAN_TYPES.find(t => t.value === type) || TECHNICIAN_TYPES[0];
};

const getStatusInfo = (status: string) => {
  return TECHNICIAN_STATUSES.find(s => s.value === status) || TECHNICIAN_STATUSES[1];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const TechniciansPageDesktop = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Delete state
  const [technicianToDelete, setTechnicianToDelete] = useState<Technician | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [technicianKPIs, setTechnicianKPIs] = useState({
    byType: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    totalTechnicians: 0,
    monthlyCosts: {
      freelancers: 0,
      companies: 0,
      employees: 0,
      totalExternal: 0,
      totalEmployees: 0,
      avgFreelancer: 0,
      avgCompany: 0,
      avgEmployee: 0
    }
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedTechnicians = [...technicians].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "number":
        aValue = a.technician_number || "";
        bValue = b.technician_number || "";
        break;
      case "company":
        aValue = a.company_name || "";
        bValue = b.company_name || "";
        break;
      case "type":
        aValue = a.type;
        bValue = b.type;
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "city":
        aValue = a.city || "";
        bValue = b.city || "";
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
    paginatedData: paginatedTechnicians,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(sortedTechnicians, { pageSize: 50 });

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_technicians", {
        p_search: debouncedSearchTerm || null,
        p_status: statusFilter === "all" ? null : statusFilter,
        p_type: typeFilter === "all" ? null : typeFilter,
      });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (err: any) {
      console.error('Error fetching technicians:', err);
      toast({
        title: "Error",
        description: err.message || "No se pudieron cargar los técnicos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user is admin
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_user_info');
        if (!error && data && data.length > 0) {
          const roles = data[0].roles || [];
          setIsAdmin(roles.includes('admin'));
        }
      } catch (err) {
        console.error('Error checking user role:', err);
      }
    };
    checkUserRole();
  }, []);

  useEffect(() => {
    fetchTechnicians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    if (technicians.length > 0) {
      calculateTechnicianKPIs();
    }
  }, [technicians]);

  const handleDeleteTechnician = async () => {
    if (!technicianToDelete) return;
    
    try {
      setDeleting(true);
      const { error } = await supabase.rpc("delete_technician", {
        p_technician_id: technicianToDelete.id,
      });

      if (error) throw error;

      toast({
        title: "Técnico eliminado",
        description: `El técnico ${technicianToDelete.company_name} ha sido eliminado correctamente.`,
      });

      setDeleteDialogOpen(false);
      setTechnicianToDelete(null);
      fetchTechnicians();
    } catch (err: any) {
      console.error("Error deleting technician:", err);
      toast({
        title: "Error",
        description: err.message || "No se pudo eliminar el técnico. Puede tener facturas o proyectos asociados.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const calculateTechnicianKPIs = async () => {
    try {
      // Contar técnicos por tipo
      const byType: Record<string, number> = {};
      TECHNICIAN_TYPES.forEach(type => {
        byType[type.value] = technicians.filter(t => t.type === type.value).length;
      });

      // Contar técnicos por estado
      const byStatus: Record<string, number> = {};
      TECHNICIAN_STATUSES.forEach(status => {
        byStatus[status.value] = technicians.filter(t => t.status === status.value).length;
      });

      // Calcular costes mensuales
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Calcular costes de plantilla (suma de monthly_salary)
      const employees = technicians.filter(t => t.type === 'EMPLOYEE' && t.status === 'ACTIVE');
      const totalEmployees = employees.reduce((sum, emp) => sum + (emp.monthly_salary || 0), 0);
      const avgEmployee = employees.length > 0 ? totalEmployees / employees.length : 0;

      // Obtener facturas de compra del mes actual para técnicos freelance/empresas
      const params: Record<string, unknown> = {
        p_search: null,
        p_status: null,
        p_supplier_id: null,
        p_technician_id: null,
        p_document_type: null,
        p_page: 1,
        p_page_size: 10000
      };
      const { data: purchaseInvoicesData, error: invoicesError } = await supabase.rpc('list_purchase_invoices', params);

      if (invoicesError) {
        console.error('Error fetching purchase invoices:', invoicesError);
      }

      // Filtrar facturas del mes actual para técnicos
      const purchaseInvoices = (purchaseInvoicesData || []).filter((inv: any) => {
        if (!inv.provider_id || inv.provider_type !== 'TECHNICIAN' || !inv.issue_date) return false;
        const invoiceDate = new Date(inv.issue_date);
        return invoiceDate >= firstDayOfMonth && invoiceDate <= lastDayOfMonth &&
               (inv.status === 'APPROVED' || inv.status === 'PAID' || inv.status === 'REGISTERED');
      });

      // Separar facturas por tipo de técnico
      const freelancerIds = technicians
        .filter(t => t.type === 'FREELANCER' && t.status === 'ACTIVE')
        .map(t => t.id);
      
      const companyIds = technicians
        .filter(t => t.type === 'COMPANY' && t.status === 'ACTIVE')
        .map(t => t.id);

      const freelancerInvoices = purchaseInvoices?.filter((inv: any) => 
        inv.provider_id && freelancerIds.includes(inv.provider_id)
      ) || [];
      
      const companyInvoices = purchaseInvoices?.filter((inv: any) => 
        inv.provider_id && companyIds.includes(inv.provider_id)
      ) || [];

      const totalFreelancers = freelancerInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalCompanies = companyInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const totalExternal = totalFreelancers + totalCompanies;

      const activeFreelancers = technicians.filter(t => t.type === 'FREELANCER' && t.status === 'ACTIVE');
      const activeCompanies = technicians.filter(t => t.type === 'COMPANY' && t.status === 'ACTIVE');

      const avgFreelancer = activeFreelancers.length > 0 ? totalFreelancers / activeFreelancers.length : 0;
      const avgCompany = activeCompanies.length > 0 ? totalCompanies / activeCompanies.length : 0;

      setTechnicianKPIs({
        byType,
        byStatus,
        totalTechnicians: technicians.length,
        monthlyCosts: {
          freelancers: totalFreelancers,
          companies: totalCompanies,
          employees: totalEmployees,
          totalExternal,
          totalEmployees,
          avgFreelancer,
          avgCompany,
          avgEmployee
        }
      });
    } catch (error) {
      console.error('Error calculating technician KPIs:', error);
    }
  };

  if (loading && technicians.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6">
      <div className="w-full h-full">
        <div>
          {/* KPIs Cards - Recuento por Tipo - Optimizado */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-blue-500/10 rounded text-blue-600">
                  <UserRound className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Autónomos</span>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">
                  {technicianKPIs.byType['FREELANCER'] || 0}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({technicians.filter(t => t.type === 'FREELANCER' && t.status === 'ACTIVE').length} activos)
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-purple-500/10 rounded text-purple-600">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Empresas</span>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">
                  {technicianKPIs.byType['COMPANY'] || 0}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({technicians.filter(t => t.type === 'COMPANY' && t.status === 'ACTIVE').length} activas)
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-green-500/10 rounded text-green-600">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Plantilla</span>
              </div>
              <div>
                <span className="text-lg font-bold text-foreground">
                  {technicianKPIs.byType['EMPLOYEE'] || 0}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({technicians.filter(t => t.type === 'EMPLOYEE' && t.status === 'ACTIVE').length} activos)
                </span>
              </div>
            </div>
          </div>

          {/* KPIs Cards - Costes Mensuales - Optimizado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-orange-500/10 rounded text-orange-600">
                  <Euro className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Coste Total/Mes</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(technicianKPIs.monthlyCosts.totalExternal + technicianKPIs.monthlyCosts.totalEmployees)}
                </span>
                <div className="flex gap-1 mt-0.5 text-[10px] text-muted-foreground">
                  <span>Ext: {formatCurrency(technicianKPIs.monthlyCosts.totalExternal)}</span>
                  <span>•</span>
                  <span>Pl: {formatCurrency(technicianKPIs.monthlyCosts.totalEmployees)}</span>
                </div>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-blue-500/10 rounded text-blue-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Media Autónomos</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(technicianKPIs.monthlyCosts.avgFreelancer)}
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-purple-500/10 rounded text-purple-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Media Empresas</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(technicianKPIs.monthlyCosts.avgCompany)}
                </span>
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-green-500/10 rounded text-green-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-[9px] px-1.5 py-0.5 font-medium">Media Plantilla</span>
              </div>
              <div>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(technicianKPIs.monthlyCosts.avgEmployee)}
                </span>
              </div>
            </div>
          </div>

          {/* DetailNavigationBar */}
          <div className="mb-6">
            <DetailNavigationBar
              pageTitle="Técnicos"
              contextInfo={
                <SearchBar
                  value={searchInput}
                  onChange={setSearchInput}
                  items={technicians}
                  getSearchText={(tech) => `${tech.company_name} ${tech.contact_email} ${tech.contact_phone || ''} ${tech.technician_number || ''} ${tech.contact_name || ''}`}
                  renderResult={(tech) => ({
                    id: tech.id,
                    label: tech.company_name,
                    subtitle: tech.contact_email || tech.contact_phone,
                    icon: <UserRound className="h-4 w-4" />,
                    data: tech,
                  })}
                  onSelectResult={(result) => {
                    navigate(`/nexo-av/${userId}/technicians/${result.data.id}`);
                  }}
                  placeholder="Buscar técnicos..."
                  maxResults={8}
                  debounceMs={300}
                />
              }
              tools={
                <DetailActionButton
                  actionType="new_technician"
                  onClick={() => setShowCreateDialog(true)}
                />
              }
            />
          </div>

          {/* DataList */}
          <DataList
            data={paginatedTechnicians}
            columns={[
              {
                key: "technician_number",
                label: "Nº",
                sortable: true,
                align: "left",
                priority: 1,
                render: (tech) => (
                  <span className="text-foreground/80 text-[10px]">
                    {tech.technician_number || '-'}
                  </span>
                ),
              },
              {
                key: "company_name",
                label: "Técnico",
                sortable: true,
                align: "left",
                priority: 3,
                render: (tech) => (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted/30">
                      <UserRound className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium text-[10px]">{tech.company_name}</p>
                      {tech.city && (
                        <p className="text-muted-foreground text-[9px]">
                          {tech.city}{tech.province ? `, ${tech.province}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: "type",
                label: "Tipo",
                sortable: true,
                align: "center",
                priority: 2,
                render: (tech) => {
                  const typeInfo = getTypeInfo(tech.type);
                  return (
                    <div className="flex justify-center">
                      <Badge variant="outline" className={cn(typeInfo.color, "border text-[9px] px-1.5 py-0.5 w-20 justify-center")}>
                        {typeInfo.label}
                      </Badge>
                    </div>
                  );
                },
              },
              {
                key: "status",
                label: "Estado",
                sortable: true,
                align: "center",
                priority: 4,
                render: (tech) => {
                  const statusInfo = getStatusInfo(tech.status);
                  return (
                    <div className="flex justify-center">
                      <Badge variant="outline" className={cn(statusInfo.color, "border text-[9px] px-1.5 py-0.5 w-20 justify-center")}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  );
                },
              },
              {
                key: "specialties",
                label: "Especialidades",
                align: "left",
                priority: 5,
                render: (tech) => (
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {tech.specialties && tech.specialties.length > 0 ? (
                      tech.specialties.slice(0, 2).map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0.5">
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-[9px]">—</span>
                    )}
                    {tech.specialties && tech.specialties.length > 2 && (
                      <span className="text-[9px] text-muted-foreground">+{tech.specialties.length - 2}</span>
                    )}
                  </div>
                ),
              },
              {
                key: "rates",
                label: "Tarifas",
                align: "right",
                priority: 6,
                render: (tech) => {
                  if (tech.type === "EMPLOYEE" && tech.monthly_salary && tech.monthly_salary > 0) {
                    return (
                      <span className="text-foreground font-medium text-[10px]">
                        {formatCurrency(tech.monthly_salary)}/mes
                      </span>
                    );
                  }
                  return (
                    <div className="flex flex-col gap-0.5 items-end">
                      {tech.daily_rate && tech.daily_rate > 0 && (
                        <span className="text-[10px] text-foreground font-medium">{formatCurrency(tech.daily_rate)}/día</span>
                      )}
                      {tech.hourly_rate && tech.hourly_rate > 0 && (
                        <span className="text-[9px] text-muted-foreground">{formatCurrency(tech.hourly_rate)}/h</span>
                      )}
                      {(!tech.daily_rate || tech.daily_rate === 0) && (!tech.hourly_rate || tech.hourly_rate === 0) && (
                        <span className="text-muted-foreground text-[9px]">—</span>
                      )}
                    </div>
                  );
                },
              },
              {
                key: "contact_email",
                label: "Email",
                align: "left",
                priority: 7,
                render: (tech) => (
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[9px]">
                    <Mail className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[200px]">{tech.contact_email || '-'}</span>
                  </div>
                ),
              },
              {
                key: "contact_phone",
                label: "Teléfono",
                align: "left",
                priority: 8,
                render: (tech) => (
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[9px]">
                    <Phone className="h-2.5 w-2.5" />
                    {tech.contact_phone || '-'}
                  </div>
                ),
              },
            ]}
            actions={[
              {
                label: "Ver detalle",
                onClick: (tech) => navigate(`/nexo-av/${userId}/technicians/${tech.id}`),
              },
              {
                label: "Editar",
                onClick: () => {},
              },
              {
                label: "Duplicar",
                onClick: () => {},
              },
              ...(isAdmin ? [{
                label: "Eliminar",
                onClick: (tech: Technician) => {
                  setTechnicianToDelete(tech);
                  setDeleteDialogOpen(true);
                },
                variant: "destructive" as const,
              }] : []),
            ]}
            onItemClick={(tech) => navigate(`/nexo-av/${userId}/technicians/${tech.id}`)}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={loading}
            emptyMessage="No hay técnicos"
            emptyIcon={<UserRound className="h-16 w-16 text-muted-foreground" />}
            getItemId={(tech) => tech.id}
          />

          {/* Paginación */}
          {!loading && technicians.length > 0 && totalPages > 1 && (
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

      <CreateTechnicianDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          fetchTechnicians();
          toast({
            title: "Técnico creado",
            description: "El técnico se ha creado correctamente.",
          });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteTechnician}
        title="¿Eliminar técnico?"
        description={`Estás a punto de eliminar el técnico "${technicianToDelete?.company_name || ''}". Esta acción no se puede deshacer. Si el técnico tiene facturas o proyectos asociados, no podrá ser eliminado.`}
        confirmLabel="Eliminar técnico"
        variant="destructive"
        loading={deleting}
        icon={<Trash2 className="h-6 w-6" />}
      />
    </div>
  );
};

export default TechniciansPageDesktop;
