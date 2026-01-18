import { useState, useEffect } from "react";
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
  Star
} from "lucide-react";
import { motion } from "motion/react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Technician {
  id: string;
  technician_number: string;
  company_name: string;
  legal_name: string;
  tax_id: string;
  type: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  specialties: string[];
  daily_rate: number;
  hourly_rate: number;
  created_at: string;
}

const TechniciansPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 500);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchTechnicians();
  }, [debouncedSearchQuery, statusFilter, typeFilter]);

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
    }).format(amount);
  };

  return (
    <div className="w-full">
      <div className="w-[95%] max-w-[1800px] mx-auto px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                  <UserRound className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Técnicos</h1>
                  <p className="text-white/40 text-sm mt-0.5">Freelances y personal externo especializado</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => { }}
                  className="bg-violet-600 hover:bg-violet-700 text-white h-10 px-5 rounded-2xl shadow-lg shadow-violet-500/20 gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Técnico
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-sm p-4 rounded-3xl flex items-center gap-4">
                <div className="p-3 bg-violet-500/10 rounded-2xl">
                  <Star className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Total Técnicos</p>
                  <p className="text-xl font-bold text-white">{technicians.length}</p>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-sm p-4 rounded-3xl flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <UserRound className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Freelances</p>
                  <p className="text-xl font-bold text-white">
                    {technicians.filter(t => t.type === 'FREELANCE').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row items-center gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-[2rem] backdrop-blur-md">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Buscar por nombre, especialidad o ciudad..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-11 h-11 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-violet-500/20 focus:border-violet-500/40 transition-all text-sm"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-11 px-4 bg-white/5 border-white/10 text-white rounded-2xl hover:bg-white/10 gap-2 whitespace-nowrap min-w-[140px]"
                    >
                      <Filter className="h-4 w-4 text-white/40" />
                      {typeFilter === "all" ? "Tipo" : typeFilter}
                      <ChevronDown className="h-3 w-3 ml-auto opacity-40" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 rounded-2xl p-1 w-48">
                    <DropdownMenuItem onClick={() => setTypeFilter("all")} className="text-white rounded-xl focus:bg-white/10">
                      Todos los tipos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("FREELANCE")} className="text-white rounded-xl focus:bg-white/10">
                      Autónomo / Freelance
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTypeFilter("COMPANY")} className="text-white rounded-xl focus:bg-white/10">
                      Empresa Externa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-11 px-4 bg-white/5 border-white/10 text-white rounded-2xl hover:bg-white/10 gap-2 whitespace-nowrap min-w-[140px]"
                    >
                      {statusFilter === "all" ? "Estado" : statusFilter}
                      <ChevronDown className="h-3 w-3 ml-auto opacity-40" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 rounded-2xl p-1 w-48">
                    <DropdownMenuItem onClick={() => setStatusFilter("all")} className="text-white rounded-xl focus:bg-white/10">
                      Cualquier estado
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("ACTIVE")} className="text-white rounded-xl focus:bg-white/10">
                      Disponible / Activo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("INACTIVE")} className="text-white rounded-xl focus:bg-white/10">
                      No disponible
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
                <p className="text-white/40 font-medium animate-pulse">Cargando base de técnicos...</p>
              </div>
            ) : technicians.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                <div className="p-6 bg-white/[0.03] rounded-[2.5rem] border border-white/5 mb-6">
                  <UserRound className="h-12 w-12 text-white/10" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No hay técnicos registrados</h3>
                <p className="text-white/40 max-w-sm mb-8">
                  No hemos encontrado ningún perfil que coincida con la búsqueda actual.
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setSearchInput(""); setStatusFilter("all"); setTypeFilter("all"); }}
                  className="rounded-2xl border-white/10 text-white/60 hover:text-white"
                >
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/[0.02]">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] pl-8 h-14">Técnico</TableHead>
                      <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] h-14">Especialidades</TableHead>
                      <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] h-14">Tarifas</TableHead>
                      <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] h-14">Estado</TableHead>
                      <TableHead className="text-white/40 font-bold uppercase tracking-wider text-[10px] h-14 text-right pr-8">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {technicians.map((tech) => (
                      <TableRow
                        key={tech.id}
                        className="group border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors h-24"
                        onClick={() => navigate(`/nexo-av/${userId}/technicians/${tech.id}`)}
                      >
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 font-bold">
                              {tech.company_name.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-white group-hover:text-violet-400 transition-colors capitalize">
                                {tech.company_name.toLowerCase()}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin className="h-3 w-3 text-white/20" />
                                <span className="text-[10px] text-white/30 uppercase tracking-wider">
                                  {tech.city || "Sin ciudad"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[250px]">
                            {tech.specialties && tech.specialties.length > 0 ? (
                              tech.specialties.slice(0, 3).map((s, i) => (
                                <Badge key={i} variant="secondary" className="bg-white/5 text-[10px] py-0 px-2 rounded-md border-none text-white/60">
                                  {s}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-white/20 text-xs italic">No especificadas</span>
                            )}
                            {tech.specialties && tech.specialties.length > 3 && (
                              <span className="text-[10px] text-white/20 ml-1">+{tech.specialties.length - 3}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {tech.daily_rate > 0 && (
                              <div className="flex items-center gap-1.5 font-mono text-xs">
                                <span className="text-white/40 bg-white/5 px-1 rounded">D</span>
                                <span className="text-white/80">{formatCurrency(tech.daily_rate)}</span>
                              </div>
                            )}
                            {tech.hourly_rate > 0 && (
                              <div className="flex items-center gap-1.5 font-mono text-xs mt-0.5">
                                <span className="text-white/40 bg-white/5 px-1 rounded">H</span>
                                <span className="text-white/80">{formatCurrency(tech.hourly_rate)}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border-none",
                              tech.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"
                            )}
                          >
                            {tech.status === 'ACTIVE' ? "DISPONIBLE" : "BAJA"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-white/20 hover:text-white hover:bg-white/10">
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9 text-white/20 hover:text-white hover:bg-white/10">
                              <Phone className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TechniciansPage;
