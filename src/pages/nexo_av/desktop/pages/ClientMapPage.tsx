import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Filter, MapPin, Mail, Phone, Users } from "lucide-react";
import LeadMap from "../components/leadmap/LeadMap";

interface Client {
  id: string;
  client_number: string | null;
  company_name: string;
  legal_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  lead_stage: string;
  latitude: number | null;
  longitude: number | null;
  full_address: string | null;
  created_at: string;
}

const CLIENT_STAGE_COLORS: Record<string, string> = {
  'NEW': '#3B82F6',
  'CONTACTED': '#EAB308',
  'MEETING': '#A855F7',
  'PROPOSAL': '#6366F1',
  'NEGOTIATION': '#F97316',
  'WON': '#22C55E',
  'RECURRING': '#10B981',
  'LOST': '#EF4444',
  'PAUSED': '#6B7280',
};

const CLIENT_STAGE_LABELS: Record<string, string> = {
  'NEW': 'Nuevo',
  'CONTACTED': 'Contactado',
  'MEETING': 'Reunión',
  'PROPOSAL': 'Propuesta',
  'NEGOTIATION': 'Negociación',
  'WON': 'Ganado',
  'RECURRING': 'Recurrente',
  'LOST': 'Perdido',
  'PAUSED': 'Pausado',
};

const ClientMapPageDesktop = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [focusClient, setFocusClient] = useState<Client | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Usar la función RPC list_clients_for_map para obtener clientes con coordenadas
      // Mostrar todos los clientes EXCEPTO los rechazados/perdidos (LOST)
      const { data, error } = await supabase.rpc('list_clients_for_map', {
        p_lead_stages: ['NEW', 'CONTACTED', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'RECURRING', 'PAUSED']
      });
      
      if (error) {
        console.error('Error fetching clients:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive",
        });
        return;
      }

      const clientsData = (data || []).map((client: any) => ({
        id: client.id,
        client_number: client.client_number,
        company_name: client.company_name,
        legal_name: client.legal_name,
        contact_email: client.contact_email,
        contact_phone: client.contact_phone,
        lead_stage: client.lead_stage,
        latitude: client.latitude ? parseFloat(String(client.latitude)) : null,
        longitude: client.longitude ? parseFloat(String(client.longitude)) : null,
        full_address: client.full_address,
        created_at: client.created_at,
      }));

      setClients(clientsData);
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: "Error",
        description: "Error al cargar los clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client: Client | null) => {
    setSelectedClient(client);
  };

  const handleRefresh = () => {
    fetchClients();
    setSelectedClient(null);
  };

  const totalClients = clients.length;
  const mappableClients = clients.filter(c => c.latitude && c.longitude).length;

  // Convert Client to LeadClient format for LeadMap component
  const clientsAsLeadClients = clients.map(client => ({
    id: client.id,
    client_number: client.client_number,
    company_name: client.company_name,
    legal_name: client.legal_name,
    contact_email: client.contact_email || '',
    contact_phone: client.contact_phone || '',
    lead_stage: client.lead_stage || 'NEW',
    latitude: client.latitude,
    longitude: client.longitude,
    full_address: client.full_address,
    assigned_to: null,
    assigned_to_name: null,
    created_at: client.created_at,
    notes_count: 0,
  }));

  const selectedClientAsLeadClient = selectedClient ? {
    id: selectedClient.id,
    client_number: selectedClient.client_number,
    company_name: selectedClient.company_name,
    legal_name: selectedClient.legal_name,
    contact_email: selectedClient.contact_email || '',
    contact_phone: selectedClient.contact_phone || '',
    lead_stage: selectedClient.lead_stage || 'NEW',
    latitude: selectedClient.latitude,
    longitude: selectedClient.longitude,
    full_address: selectedClient.full_address,
    assigned_to: null,
    assigned_to_name: null,
    created_at: selectedClient.created_at,
    notes_count: 0,
  } : null;

  const focusClientAsLeadClient = focusClient ? {
    id: focusClient.id,
    client_number: focusClient.client_number,
    company_name: focusClient.company_name,
    legal_name: focusClient.legal_name,
    contact_email: focusClient.contact_email || '',
    contact_phone: focusClient.contact_phone || '',
    lead_stage: focusClient.lead_stage || 'NEW',
    latitude: focusClient.latitude,
    longitude: focusClient.longitude,
    full_address: focusClient.full_address,
    assigned_to: null,
    assigned_to_name: null,
    created_at: focusClient.created_at,
    notes_count: 0,
  } : null;

  return (
    <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 8rem)', minHeight: '600px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mapa Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Clientes registrados ({mappableClients}/{totalClients} en mapa)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-secondary" : ""}
          >
            {showFilters ? <X size={16} /> : <Filter size={16} />}
            <span className="ml-1 hidden sm:inline">Filtros</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-4 bg-card border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Filtros próximamente</p>
        </div>
      )}

      {/* Main content - 60/40 split: Map gets 60%, Sidebar gets 40% */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden" style={{ height: '100%', padding: '0 1%' }}>
        {/* Map - 60% del espacio con márgenes */}
        <div 
          className="rounded-lg overflow-hidden border border-border flex-shrink-0" 
          style={{ 
            width: '58%', 
            minWidth: '58%',
            maxWidth: '58%',
            flex: '0 0 58%',
            height: '100%',
            minHeight: '500px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <LeadMap
            clients={clientsAsLeadClients}
            selectedClient={selectedClientAsLeadClient}
            onClientSelect={handleClientSelect}
            loading={loading}
            focusClient={focusClientAsLeadClient}
          />
        </div>

        {/* Sidebar - Desktop only - 40% del espacio */}
        {!isMobile && (
          <div 
            className="flex-shrink-0 overflow-y-auto"
            style={{ 
              width: '40%', 
              minWidth: '40%',
              maxWidth: '40%',
              flex: '0 0 40%',
              height: '100%'
            }}
          >
            {selectedClient ? (
              <Card className="h-full shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">{selectedClient.company_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedClient.full_address && (
                      <div className="flex items-start gap-2">
                        <MapPin size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{selectedClient.full_address}</p>
                      </div>
                    )}
                    {selectedClient.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-muted-foreground flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{selectedClient.contact_email}</p>
                      </div>
                    )}
                    {selectedClient.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-muted-foreground flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{selectedClient.contact_phone}</p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedClient(null);
                        setFocusClient(null);
                      }}
                      className="w-full"
                    >
                      Cerrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex-1 flex flex-col min-h-0 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users size={14} />
                    Listado de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-2">
                      {clients.map((client) => (
                        <button
                          key={client.id}
                          className="w-full text-left p-3 rounded-md hover:bg-secondary transition-colors border border-border/50 shadow-none"
                          onClick={() => handleClientSelect(client)}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-medium text-sm truncate">{client.company_name}</p>
                            <div 
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: CLIENT_STAGE_COLORS[client.lead_stage] || '#6B7280' }}
                              title={CLIENT_STAGE_LABELS[client.lead_stage] || client.lead_stage}
                            />
                          </div>
                          {client.full_address && (
                            <div className="flex items-start gap-1.5">
                              <MapPin size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                                {client.full_address}
                              </p>
                            </div>
                          )}
                        </button>
                      ))}
                      {clients.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay clientes registrados
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientMapPageDesktop;
