import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
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
  focusClient?: LeadClient | null;
}

export interface LeadMapRef {
  focusOnClient: (client: LeadClient) => void;
}

// Create colored marker icon for clients
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

// Create POI marker icon (smaller, different style)
const createPOIIcon = (type: string) => {
  const colors: Record<string, string> = {
    shop: "#8B5CF6",
    restaurant: "#EF4444",
    cafe: "#F59E0B",
    hotel: "#3B82F6",
    default: "#6B7280"
  };
  
  const color = colors[type] || colors.default;
  
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20">
      <circle cx="10" cy="10" r="8" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="10" cy="10" r="3" fill="#fff"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'poi-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

// POI interface
interface POI {
  id: string;
  lat: number;
  lon: number;
  name: string;
  type: string;
  amenity?: string;
  shop?: string;
}

// Component to handle map center updates
const MapCenterHandler = ({ 
  selectedClient, 
  focusClient 
}: { 
  selectedClient: LeadClient | null;
  focusClient?: LeadClient | null;
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedClient?.latitude && selectedClient?.longitude) {
      map.setView([selectedClient.latitude, selectedClient.longitude], 14, {
        animate: true,
      });
    }
  }, [selectedClient, map]);
  
  // Handle focus client with maximum zoom
  useEffect(() => {
    if (focusClient?.latitude && focusClient?.longitude) {
      map.setView([focusClient.latitude, focusClient.longitude], 18, {
        animate: true,
      });
    }
  }, [focusClient, map]);
  
  return null;
};

// Component to fetch POIs from Overpass API based on viewport
const POILoader = ({ 
  onPOIsLoaded 
}: { 
  onPOIsLoaded: (pois: POI[]) => void;
}) => {
  const map = useMap();
  const [loading, setLoading] = useState(false);
  const lastBoundsRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPOIs = useCallback(async (bounds: L.LatLngBounds) => {
    // Only fetch if zoom level is appropriate (not too zoomed out)
    const currentZoom = map.getZoom();
    console.log(`[POILoader] Current zoom: ${currentZoom}`);
    
    if (currentZoom < 11) {
      console.log('[POILoader] Zoom too low, clearing POIs');
      onPOIsLoaded([]);
      return;
    }

    const boundsStr = `${bounds.getSouth().toFixed(6)},${bounds.getWest().toFixed(6)},${bounds.getNorth().toFixed(6)},${bounds.getEast().toFixed(6)}`;
    
    // Avoid duplicate requests for same bounds
    if (boundsStr === lastBoundsRef.current) {
      console.log('[POILoader] Same bounds, skipping request');
      return;
    }
    
    lastBoundsRef.current = boundsStr;
    setLoading(true);
    console.log('[POILoader] Fetching POIs for bounds:', boundsStr);

    try {
      // Overpass API query for shops, restaurants, cafes, hotels, and other businesses
      const south = bounds.getSouth();
      const west = bounds.getWest();
      const north = bounds.getNorth();
      const east = bounds.getEast();
      
      // Simplified Overpass QL query - focusing on nodes first (faster)
      const overpassQuery = `[out:json][timeout:25];
(
  node["shop"](bbox(${south},${west},${north},${east}));
  node["amenity"~"^(restaurant|cafe|bar|fast_food|hotel|bank|pharmacy)$"](bbox(${south},${west},${north},${east}));
);
out body;`;

      console.log('[POILoader] Query:', overpassQuery.substring(0, 100) + '...');

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });

      console.log('[POILoader] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[POILoader] Response error:', errorText);
        throw new Error(`Error fetching POIs: ${response.status} - ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();
      console.log('[POILoader] Received data:', data.elements?.length || 0, 'elements');
      
      if (!data.elements || !Array.isArray(data.elements)) {
        console.warn('[POILoader] Unexpected response format:', data);
        onPOIsLoaded([]);
        return;
      }
      
      const pois: POI[] = data.elements
        .filter((element: any) => {
          // Get coordinates - nodes have lat/lon directly
          const lat = element.lat;
          const lon = element.lon;
          const name = element.tags?.name;
          
          const hasCoords = lat && lon && !isNaN(lat) && !isNaN(lon);
          const hasName = name && name.trim() !== '';
          
          if (!hasCoords) {
            console.warn('[POILoader] Element missing coordinates:', element);
          }
          if (!hasName) {
            console.warn('[POILoader] Element missing name:', element);
          }
          
          return hasCoords && hasName;
        })
        .map((element: any) => {
          const lat = element.lat;
          const lon = element.lon;
          const name = element.tags?.name || 'Sin nombre';
          const type = element.tags?.shop || element.tags?.amenity || 'default';
          
          return {
            id: `poi-${element.type}-${element.id}`,
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            name,
            type,
            amenity: element.tags?.amenity,
            shop: element.tags?.shop,
          };
        })
        .slice(0, 150); // Limit to 150 POIs to avoid overload

      console.log(`[POILoader] Successfully loaded ${pois.length} POIs`);
      console.log('[POILoader] Sample POIs:', pois.slice(0, 3));
      onPOIsLoaded(pois);
    } catch (error) {
      console.error('[POILoader] Error fetching POIs:', error);
      if (error instanceof Error) {
        console.error('[POILoader] Error message:', error.message);
      }
      onPOIsLoaded([]);
    } finally {
      setLoading(false);
    }
  }, [map, onPOIsLoaded]);

  // Handle map movement and zoom with debounce
  useMapEvents({
    moveend: () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        fetchPOIs(bounds);
      }, 500); // 500ms debounce
    },
    zoomend: () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        fetchPOIs(bounds);
      }, 500);
    },
  });

  // Initial load - wait for map to be ready
  useEffect(() => {
    console.log('[POILoader] Component mounted, waiting for map...');
    
    // Wait for map to be ready and have valid bounds
    const checkAndLoad = () => {
      if (map && map.getBounds && map.getBounds().isValid()) {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        console.log('[POILoader] Map ready, zoom:', zoom, 'bounds:', bounds.toBBoxString());
        
        if (zoom >= 11) {
          fetchPOIs(bounds);
        } else {
          console.log('[POILoader] Initial zoom too low, waiting for user to zoom in');
        }
      } else {
        console.log('[POILoader] Map not ready yet, retrying...');
        setTimeout(checkAndLoad, 500);
      }
    };

    const timer = setTimeout(checkAndLoad, 1500);
    return () => clearTimeout(timer);
  }, [map, fetchPOIs]);

  return null;
};

const LeadMap = forwardRef<LeadMapRef, LeadMapProps>(
  ({ clients, selectedClient, onClientSelect, loading, focusClient }, ref) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [pois, setPois] = useState<POI[]>([]);

  // Filter clients with valid coordinates
  const mappableClients = clients.filter(c => c.latitude && c.longitude);

  // Barcelona Metropolitan Area center coordinates
  const defaultCenter: [number, number] = [41.3851, 2.1734];
  const defaultZoom = 12; // Increased to 12 so POIs load immediately

  const handlePOIsLoaded = useCallback((loadedPois: POI[]) => {
    console.log('[LeadMap] Received POIs:', loadedPois.length);
    setPois(loadedPois);
  }, []);

  useImperativeHandle(ref, () => ({
    focusOnClient: (client: LeadClient) => {
      if (client.latitude && client.longitude && mapInstanceRef.current) {
        mapInstanceRef.current.setView([client.latitude, client.longitude], 18, {
          animate: true,
        });
      }
    },
  }));

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
        .poi-marker {
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
        ref={(map) => {
          mapRef.current = map;
          mapInstanceRef.current = map;
        }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {/* Map style with colored streets (but not highways) - CartoDB Voyager */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        
        <MapCenterHandler selectedClient={selectedClient} focusClient={focusClient} />
        <POILoader onPOIsLoaded={handlePOIsLoaded} />
        
        {/* Client markers */}
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
        
        {/* POI markers */}
        {pois.length > 0 && (
          <>
            {pois.map((poi) => {
              console.log('[LeadMap] Rendering POI:', poi.id, poi.name, poi.lat, poi.lon);
              return (
                <Marker
                  key={poi.id}
                  position={[poi.lat, poi.lon]}
                  icon={createPOIIcon(poi.type)}
                  zIndexOffset={-100}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-xs mb-1">{poi.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">
                        {poi.shop || poi.amenity || poi.type}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </>
        )}
      </MapContainer>
      
      {mappableClients.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[500]">
          <div className="text-center">
            <p className="text-muted-foreground">No hay clientes con ubicación</p>
            <p className="text-sm text-muted-foreground">Crea un nuevo cliente para verlo en el mapa</p>
          </div>
        </div>
      )}
    </div>
  );
});

LeadMap.displayName = "LeadMap";

export default LeadMap;
