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
  Filter
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import NexoHeader, { NexoLogo } from "./components/NexoHeader";
import CreateClientDialog from "./components/CreateClientDialog";

interface Client {
  id: string;
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
  { value: 'NEW', label: 'Nuevo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'CONTACTED', label: 'Contactado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'MEETING', label: 'Reunión', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'PROPOSAL', label: 'Propuesta', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { value: 'NEGOTIATION', label: 'Negociación', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'WON', label: 'Ganado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'LOST', label: 'Perdido', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'PAUSED', label: 'Pausado', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const getStageInfo = (stage: string) => {
  return LEAD_STAGES.find(s => s.value === stage) || LEAD_STAGES[0];
};

const ClientsPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.rpc('list_clients', {
        p_lead_stage: stageFilter === 'all' ? null : stageFilter,
        p_search: searchTerm || null,
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

        const hasAccess = currentUserInfo.roles?.some((r: string) => 
          ['admin', 'manager', 'sales'].includes(r)
        );

        if (!hasAccess) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        setCurrentUserId(currentUserInfo.user_id);
        setLoading(false);
      } catch (err) {
        console.error('Auth check error:', err);
        navigate('/nexo-av');
      }
    };

    checkAuth();
  }, [navigate, userId]);

  useEffect(() => {
    if (!loading && !accessDenied) {
      fetchClients();
    }
  }, [loading, accessDenied, stageFilter, searchTerm]);

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Acceso Denegado</h1>
          <p className="text-white/60">No tienes permiso para acceder a este recurso.</p>
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
      <NexoHeader 
        title="Clientes / Leads" 
        userId={userId || ''} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar por empresa, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="all" className="text-white">Todos los estados</SelectItem>
              {LEAD_STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value} className="text-white">
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-white text-black hover:bg-white/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </motion.div>

        {/* Clients table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-white/10 overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60">Empresa</TableHead>
                <TableHead className="text-white/60">Contacto</TableHead>
                <TableHead className="text-white/60">Estado</TableHead>
                <TableHead className="text-white/60">Asignado</TableHead>
                <TableHead className="text-white/60">Seguimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow className="border-white/10">
                  <TableCell colSpan={5} className="text-center py-12">
                    <Building2 className="h-12 w-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">No hay clientes que mostrar</p>
                    <Button
                      variant="link"
                      onClick={() => setShowCreateDialog(true)}
                      className="text-white/60 hover:text-white mt-2"
                    >
                      Crear el primer cliente
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => {
                  const stageInfo = getStageInfo(client.lead_stage);
                  return (
                    <TableRow 
                      key={client.id} 
                      className="border-white/10 hover:bg-white/5 cursor-pointer"
                      onClick={() => navigate(`/nexo-av/${userId}/clients/${client.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white/5">
                            <Building2 className="h-4 w-4 text-white/60" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{client.company_name}</p>
                            {client.industry_sector && (
                              <p className="text-white/40 text-xs capitalize">
                                {client.industry_sector.toLowerCase()}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-white/60 text-sm">
                            <Mail className="h-3 w-3" />
                            {client.contact_email}
                          </div>
                          <div className="flex items-center gap-2 text-white/60 text-sm">
                            <Phone className="h-3 w-3" />
                            {client.contact_phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${stageInfo.color} border`}
                        >
                          {stageInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {client.assigned_to_name ? (
                          <div className="flex items-center gap-2 text-white/60 text-sm">
                            <User className="h-3 w-3" />
                            {client.assigned_to_name}
                          </div>
                        ) : (
                          <span className="text-white/30 text-sm">Sin asignar</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.next_follow_up_date ? (
                          <div className="flex items-center gap-2 text-white/60 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(client.next_follow_up_date).toLocaleDateString('es-ES')}
                          </div>
                        ) : (
                          <span className="text-white/30 text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </motion.div>
      </main>

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
      />
    </div>
  );
};

export default ClientsPage;
