import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNexoAvTheme } from "../hooks/useNexoAvTheme";
import { Loader2, Search, Users, UserCheck, Briefcase, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Worker {
  id: string;
  email: string;
  full_name: string;
  department: string;
  job_position: string | null;
  phone: string | null;
  is_active: boolean;
  worker_type: string | null;
  linked_partner_id: string | null;
  linked_partner_number: string | null;
  linked_employee_id: string | null;
  linked_employee_number: string | null;
  tax_id: string | null;
  created_at: string;
  last_login_at: string | null;
}

const departmentLabels: Record<string, string> = {
  COMMERCIAL: "Comercial",
  TECHNICAL: "Técnico",
  ADMIN: "Administración",
  DIRECTION: "Dirección",
};

const workerTypeConfig = {
  PARTNER: { label: "Socio", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  EMPLOYEE: { label: "Empleado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

function WorkerCard({ worker, onClick }: { worker: Worker; onClick: () => void }) {
  const initials = worker.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const typeConfig = worker.worker_type 
    ? workerTypeConfig[worker.worker_type as keyof typeof workerTypeConfig]
    : null;

  return (
    <Card
      className="group cursor-pointer hover:border-primary/50 transition-all duration-200 bg-card/50 backdrop-blur-sm"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shrink-0">
            <span className="text-sm font-semibold text-primary">{initials}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-foreground truncate">{worker.full_name}</h3>
              {!worker.is_active && (
                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                  Inactivo
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground truncate">{worker.email}</p>
            
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <Building2 className="w-3 h-3 mr-1" />
                {departmentLabels[worker.department] || worker.department}
              </Badge>
              
              {worker.job_position && (
                <Badge variant="outline" className="text-xs">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {worker.job_position}
                </Badge>
              )}
            </div>
          </div>

          {/* Type Badge */}
          <div className="shrink-0">
            {typeConfig ? (
              <Badge variant="outline" className={`text-xs ${typeConfig.color}`}>
                <UserCheck className="w-3 h-3 mr-1" />
                {typeConfig.label}
                {worker.linked_partner_number && ` (${worker.linked_partner_number})`}
                {worker.linked_employee_number && ` (${worker.linked_employee_number})`}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                Sin asignar
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkersPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  useNexoAvTheme();
  
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("list_workers");
      if (error) throw error;
      setWorkers(data || []);
    } catch (error) {
      console.error("Error fetching workers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const filteredWorkers = useMemo(() => {
    // Filtrar trabajadores: excluir los que están asociados a socios (tienen linked_partner_id)
    const workersWithoutPartners = workers.filter((w) => !w.linked_partner_id);
    
    if (!searchTerm) return workersWithoutPartners;
    const term = searchTerm.toLowerCase();
    return workersWithoutPartners.filter(
      (w) =>
        w.full_name.toLowerCase().includes(term) ||
        w.email.toLowerCase().includes(term) ||
        (w.department && departmentLabels[w.department]?.toLowerCase().includes(term)) ||
        (w.job_position && w.job_position.toLowerCase().includes(term))
    );
  }, [workers, searchTerm]);

  const stats = useMemo(() => {
    // Filtrar trabajadores: excluir los que están asociados a socios
    const workersWithoutPartners = workers.filter((w) => !w.linked_partner_id);
    const total = workersWithoutPartners.length;
    const employees = workersWithoutPartners.filter((w) => w.worker_type === "EMPLOYEE").length;
    const unassigned = workersWithoutPartners.filter((w) => !w.worker_type).length;
    return { total, employees, unassigned };
  }, [workers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-6 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trabajadores</h1>
          <p className="text-muted-foreground">
            Gestión del personal de la empresa
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Personal</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.employees}</p>
                <p className="text-xs text-muted-foreground">Empleados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unassigned}</p>
                <p className="text-xs text-muted-foreground">Sin Asignar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email, departamento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredWorkers.map((worker) => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            onClick={() => navigate(`/nexo-av/${userId}/workers/${worker.id}`)}
          />
        ))}
      </div>

      {filteredWorkers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mb-4 opacity-50" />
          <p>No se encontraron trabajadores</p>
        </div>
      )}
    </div>
  );
}
