import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LeadMap from "../components/leadmap/LeadMap";

// Client interface
export interface Client {
  id: string;
  client_number: string;
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

const ClientMapPageMobile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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
        lead_stage: client.lead_stage || 'NEW',
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

  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">Mapa Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Clientes registrados ({clients.filter(c => c.latitude && c.longitude).length}/{clients.length} en mapa)
        </p>
      </div>
      <div className="h-[calc(100vh-12rem)] rounded-lg overflow-hidden border border-border">
        <LeadMap
          clients={clientsAsLeadClients}
          selectedClient={selectedClientAsLeadClient}
          onClientSelect={setSelectedClient}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ClientMapPageMobile;
