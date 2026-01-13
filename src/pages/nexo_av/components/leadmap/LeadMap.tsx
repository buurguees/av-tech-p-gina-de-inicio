import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LeadClient, LEAD_STAGE_COLORS, LEAD_STAGE_LABELS } from "../../LeadMapPage";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeadMapProps {
  clients: LeadClient[];
  selectedClient: LeadClient | null;
  onClientSelect: (client: LeadClient | null) => void;
  loading: boolean;
}

// Create colored marker icon
const createMarkerIcon = (color: string) => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="${color}" stroke="#fff" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to handle map center updates
const MapCenterHandler = ({ selectedClient }: { selectedClient: LeadClient | null }) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedClient?.latitude && selectedClient?.longitude) {
      map.setView([selectedClient.latitude, selectedClient.longitude], 14, {
        animate: true,
      });
    }
  }, [selectedClient, map]);
  
  return null;
};

const LeadMap = ({ clients, selectedClient, onClientSelect, loading }: LeadMapProps) => {
  const mapRef = useRef<L.Map | null>(null);

  // Filter clients with valid coordinates
  const mappableClients = clients.filter(c => c.latitude && c.longitude);

  // Spain center coordinates
  const defaultCenter: [number, number] = [40.4637, -3.7492];
  const defaultZoom = 6;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <style>{`
        .custom-marker {
          background: transparent;
          border: none;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          padding: 0;
        }
        .leaflet-popup-content {
          margin: 0;
          min-width: 200px;
        }
        /* Asegurar que el mapa y sus controles estén por debajo de los diálogos */
        .leaflet-container {
          z-index: 1 !important;
        }
        .leaflet-control-container {
          z-index: 2 !important;
        }
        .leaflet-top,
        .leaflet-bottom {
          z-index: 2 !important;
        }
        .leaflet-control {
          z-index: 2 !important;
        }
        .leaflet-popup {
          z-index: 3 !important;
        }
      `}</style>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapCenterHandler selectedClient={selectedClient} />
        
        {mappableClients.map((client) => (
          <Marker
            key={client.id}
            position={[client.latitude!, client.longitude!]}
            icon={createMarkerIcon(LEAD_STAGE_COLORS[client.lead_stage] || "#6B7280")}
            eventHandlers={{
              click: () => onClientSelect(client),
            }}
          >
            <Popup>
              <div className="p-3">
                <h3 className="font-semibold text-sm mb-1">{client.company_name}</h3>
                <div 
                  className="inline-block px-2 py-0.5 rounded-full text-xs text-white mb-2"
                  style={{ backgroundColor: LEAD_STAGE_COLORS[client.lead_stage] }}
                >
                  {LEAD_STAGE_LABELS[client.lead_stage]}
                </div>
                {client.full_address && (
                  <p className="text-xs text-gray-600">{client.full_address}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {mappableClients.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[500]">
          <div className="text-center">
            <p className="text-muted-foreground">No hay leads con ubicación</p>
            <p className="text-sm text-muted-foreground">Crea un nuevo lead para verlo en el mapa</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadMap;
