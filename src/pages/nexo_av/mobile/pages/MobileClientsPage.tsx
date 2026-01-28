import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Loader2, 
  Plus,
  Search,
  ChevronRight,
  Building2,
  User,
  Phone,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface Client {
  id: string;
  client_number: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  status: string;
  contact_name: string | null;
  is_company: boolean;
  created_at: string;
}

const MobileClientsPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 500);
  const [clientStats, setClientStats] = useState({
    total: 0,
    active: 0,
    companies: 0,
  });

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_clients', {
        p_search: debouncedSearchTerm || null,
        p_status: null
      });

      if (error) throw error;
      
      const clientsList = data || [];
      setClients(clientsList);

      // Calculate stats
      const total = clientsList.length;
      const active = clientsList.filter((c: Client) => c.status === 'ACTIVE').length;
      const companies = clientsList.filter((c: Client) => c.is_company).length;
      
      setClientStats({ total, active, companies });
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [debouncedSearchTerm]);

  const handleClientClick = (clientId: string) => {
    navigate(`/nexo-av/${userId}/clients/${clientId}`);
  };

  const handleCreateClient = () => {
    // TODO: Implement create client modal for mobile
    console.log('Create client clicked');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]">Activo</Badge>;
      case 'INACTIVE':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30 text-[10px]">Inactivo</Badge>;
      case 'LEAD':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">Lead</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-600">
              <Users className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-xs">Total</span>
          </div>
          <span className="text-lg text-foreground font-semibold">
            {clientStats.total}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg text-green-600">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-xs">Activos</span>
          </div>
          <span className="text-lg text-foreground font-semibold">
            {clientStats.active}
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-600">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-xs">Empresas</span>
          </div>
          <span className="text-lg text-foreground font-semibold">
            {clientStats.companies}
          </span>
        </div>
      </div>

      {/* Search and Create Button */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40 pb-3 mb-4 flex-shrink-0 -mx-[15px] px-[15px] pt-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar clientes..."
              className="pl-9 h-10 bg-card border-border"
            />
          </div>
          <Button
            onClick={handleCreateClient}
            size="sm"
            className="h-10 px-3 gap-1.5 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Clients List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay clientes</p>
            <p className="text-muted-foreground text-sm">
              {searchInput ? 'Prueba con otra búsqueda' : 'Añade tu primer cliente'}
            </p>
          </div>
        ) : (
          clients.map((client) => (
            <button
              key={client.id}
              onClick={() => handleClientClick(client.id)}
              className={cn(
                "w-full text-left p-4 rounded-xl",
                "bg-card border border-border",
                "active:scale-[0.98] transition-all duration-200",
                "hover:border-primary/30"
              )}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Client Number & Type */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-mono text-muted-foreground">
                      {client.client_number}
                    </span>
                    {client.is_company ? (
                      <Building2 className="h-3.5 w-3.5 text-purple-500" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-blue-500" />
                    )}
                    {getStatusBadge(client.status)}
                  </div>
                  
                  {/* Client Name */}
                  <h3 className="font-medium text-foreground truncate mb-1">
                    {client.name}
                  </h3>
                  
                  {/* Contact Info */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {client.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </span>
                    )}
                    {client.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </span>
                    )}
                  </div>
                  
                  {/* Location */}
                  {client.city && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      📍 {client.city}
                    </p>
                  )}
                </div>
                
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-2" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default MobileClientsPage;
