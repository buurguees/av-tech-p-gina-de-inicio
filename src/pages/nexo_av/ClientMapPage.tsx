import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import SimpleMap, { MapItem } from "./components/leadmap/SimpleMap";
import { Button } from "@/components/ui/button";
import { Filter, X, Loader2 } from "lucide-react";
import { createMobilePage } from "./MobilePageWrapper";
import { lazy } from "react";

// Lazy load mobile version (por ahora usamos el mismo componente)
const ClientMapPageMobile = lazy(() => import("./mobile/LeadMapPageMobile"));

interface Client extends MapItem {
  client_number: string;
  company_name: string;
  legal_name: string | null;
  contact_email: string;
  contact_phone: string;
  latitude: number | null;
  longitude: number | null;
  full_address: string | null;
}

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
      // Consulta directa a la tabla para obtener clientes con coordenadas
      const { data, error } = await supabase
        .from('clients')
        .select('id, client_number, company_name, legal_name, contact_email, contact_phone, latitude, longitude, full_address')
        .order('company_name');
      
      if (error) {
        console.error('Error fetching clients:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive",
        });
        return;
      }

      const clientsData = (data || []).map((c: any) => ({
        id: c.id,
        name: c.company_name,
        client_number: c.client_number || '',
        company_name: c.company_name,
        legal_name: c.legal_name,
        contact_email: c.contact_email,
        contact_phone: c.contact_phone,
        latitude: c.latitude,
        longitude: c.longitude,
        full_address: c.full_address,
        address: c.full_address,
      })) as Client[];

      setClients(clientsData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client: Client | null) => {
    setSelectedClient(client);
  };

  const totalClients = clients.length;
  const mappableClients = clients.filter(c => c.latitude && c.longitude).length;

  return (
    <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 8rem)', minHeight: '600px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mapa Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Todos los clientes ({mappableClients}/{totalClients} en mapa)
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
          <p className="text-sm text-muted-foreground">Filtros próximamente disponibles</p>
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
          <SimpleMap
            items={clients}
            selectedItem={selectedClient}
            onItemSelect={handleClientSelect}
            loading={loading}
            focusItem={focusClient}
            markerColor="#3B82F6"
            getItemLabel={(item) => item.company_name || item.name}
            getItemDetails={(item) => (
              <div>
                <p className="font-semibold">{item.company_name || item.name}</p>
                {item.full_address && <p className="text-sm text-muted-foreground">{item.full_address}</p>}
                {item.contact_email && <p className="text-xs text-muted-foreground">{item.contact_email}</p>}
              </div>
            )}
          />
        </div>

        {/* Sidebar - Desktop only - 40% del espacio - VACÍO por ahora */}
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
            <div className="h-full w-full flex items-center justify-center bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Panel de información próximamente</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export version with mobile routing
const ClientMapPage = createMobilePage({
  DesktopComponent: ClientMapPageDesktop,
  MobileComponent: ClientMapPageMobile,
});

export default ClientMapPage;
