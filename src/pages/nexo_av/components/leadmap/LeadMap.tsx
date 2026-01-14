import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Crosshair, MapPin, Edit } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LeadClient, LEAD_STAGE_COLORS, LEAD_STAGE_LABELS } from "../../LeadMapPage";
import CanvassingTool, { CANVASSING_STATUSES, CanvassingStatus } from "./CanvassingTool";
import CanvassingLocationDialog from "./CanvassingLocationDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsNexoAvDarkTheme } from "../../hooks/useNexoAvThemeMode";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CanvassingLocation {
  id: string;
  status: string; // Usamos string para compatibilidad con la base de datos
  company_name?: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_phone_primary?: string | null;
  contact_email_primary?: string | null;
  priority?: string | null;
  lead_score?: number | null;
  appointment_date?: string | null;
  callback_date?: string | null;
  created_at: string;
  updated_at?: string;
}

interface LeadMapProps {
  canvassingLocations?: CanvassingLocation[];
  clients?: LeadClient[];
  selectedLocation?: CanvassingLocation | null;
  selectedClient?: LeadClient | null;
  onLocationSelect?: (location: CanvassingLocation | null) => void;
  onClientSelect?: (client: any) => void; // Usar any para compatibilidad con Client de ClientMapPage
  loading: boolean;
  focusLocation?: CanvassingLocation | null;
  focusClient?: LeadClient | null;
  onCanvassingLocationCreate?: (locationId: string) => void;
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

// Create Canvassing marker icon
const createCanvassingIcon = (status: string) => {
  const statusInfo = CANVASSING_STATUSES[status as keyof typeof CANVASSING_STATUSES] || {
    color: '#6B7280',
    icon: '📍',
  };
  const color = statusInfo.color;
  const icon = statusInfo.icon;
  
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="${color}" stroke="#fff" stroke-width="2"/>
      <text x="16" y="20" font-size="16" text-anchor="middle" fill="#fff" font-weight="bold">${icon}</text>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'canvassing-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Create POI marker icon (smaller, different style) - Reducido para no interferir con Canvassing
const createPOIIcon = (type: string, category?: string) => {
  const colors: Record<string, string> = {
    // Tiendas
    shop: "#8B5CF6",
    supermarket: "#9333EA",
    mall: "#A855F7",
    // Restaurantes y comida
    restaurant: "#EF4444",
    cafe: "#F59E0B",
    bar: "#DC2626",
    fast_food: "#F97316",
    // Hoteles y alojamiento
    hotel: "#3B82F6",
    // Servicios
    bank: "#10B981",
    pharmacy: "#14B8A6",
    // Oficinas y empresas
    office: "#6366F1",
    company: "#4F46E5",
    industrial: "#7C3AED",
    // Otros
    default: "#6B7280"
  };
  
  // Determinar color basado en tipo o categoría
  let color = colors.default;
  if (category && colors[category]) {
    color = colors[category];
  } else if (type && colors[type]) {
    color = colors[type];
  }
  
  // Icono más pequeño (12x12) para referencia visual
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="12" height="12">
      <circle cx="10" cy="10" r="6" fill="${color}" stroke="#fff" stroke-width="1"/>
      <circle cx="10" cy="10" r="2" fill="#fff"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'poi-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6],
  });
};

// Create user location marker icon
const createUserLocationIcon = () => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="12" fill="#3B82F6" fill-opacity="0.3" stroke="#3B82F6" stroke-width="2"/>
      <circle cx="16" cy="16" r="8" fill="#3B82F6" fill-opacity="0.5" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="16" r="4" fill="#3B82F6" stroke="#fff" stroke-width="1.5"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'user-location-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// POI interface
interface POI {
  id: string;
  lat: number;
  lon: number;
  name: string;
  type: string;
  category: string; // shop, amenity, office, etc.
  amenity?: string;
  shop?: string;
  office?: string;
  craft?: string;
  leisure?: string;
  address?: string;
}

// Component to handle map center updates
const MapCenterHandler = ({ 
  selectedClient, 
  selectedLocation,
  focusClient,
  focusLocation,
  userLocation
}: { 
  selectedClient?: LeadClient | null;
  selectedLocation?: CanvassingLocation | null;
  focusClient?: LeadClient | null;
  focusLocation?: CanvassingLocation | null;
  userLocation?: { lat: number; lon: number } | null;
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedClient?.latitude && selectedClient?.longitude) {
      map.setView([selectedClient.latitude, selectedClient.longitude], 14, {
        animate: true,
      });
    } else if (selectedLocation?.latitude && selectedLocation?.longitude) {
      map.setView([selectedLocation.latitude, selectedLocation.longitude], 14, {
        animate: true,
      });
    }
  }, [selectedClient, selectedLocation, map]);
  
  // Handle focus client or location with maximum zoom
  useEffect(() => {
    if (focusClient?.latitude && focusClient?.longitude) {
      map.setView([focusClient.latitude, focusClient.longitude], 18, {
        animate: true,
      });
    } else if (focusLocation?.latitude && focusLocation?.longitude) {
      map.setView([focusLocation.latitude, focusLocation.longitude], 18, {
        animate: true,
      });
    }
  }, [focusClient, focusLocation, map]);
  
  // Handle user location focus (solo cuando se actualiza manualmente, no en carga inicial)
  useEffect(() => {
    if (userLocation) {
      const currentCenter = map.getCenter();
      const distance = Math.abs(currentCenter.lat - userLocation.lat) + Math.abs(currentCenter.lng - userLocation.lon);
      
      // Si la distancia es significativa (> 0.01 grados ≈ 1km), centrar
      if (distance > 0.01) {
        map.setView([userLocation.lat, userLocation.lon], 12, {
          animate: true,
        });
      }
    }
  }, [userLocation, map]);
  
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
  const errorCountRef = useRef<number>(0);
  const isDisabledRef = useRef<boolean>(false);

  const fetchPOIs = useCallback(async (bounds: L.LatLngBounds) => {
    // Si hay demasiados errores, deshabilitar temporalmente los POIs
    if (isDisabledRef.current) {
      console.log('[POILoader] ⏸ POIs temporarily disabled due to repeated connection errors');
      console.log('[POILoader] They will be re-enabled automatically after the cooldown period');
      onPOIsLoaded([]);
      return;
    }
    
    // Solo cargar POIs cuando el zoom sea 18 o superior
    const currentZoom = map.getZoom();
    console.log(`[POILoader] Current zoom: ${currentZoom}`);
    
    if (currentZoom < 18) {
      console.log('[POILoader] Zoom too low (need 18+), clearing POIs');
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
      // Usar Nominatim (OpenStreetMap) para buscar lugares cercanos
      // Usamos el formato viewbox para buscar dentro del área visible
      const viewbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      
      console.log(`[POILoader] Searching POIs in viewbox: ${viewbox}`);
      
      // Estrategia simplificada: una sola búsqueda para minimizar timeouts
      // Usamos un término que Nominatim reconoce bien
      const searchQueries = [
        'shop'  // Término en inglés que OSM/Nominatim reconoce universalmente
      ];
      
      // Función helper para hacer peticiones con retry mejorado
      const fetchWithRetry = async (query: string, retries = 1): Promise<any[]> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            if (attempt > 0) {
              // Esperar más tiempo en cada retry (5 segundos)
              console.log(`[POILoader] Retrying "${query}" (attempt ${attempt + 1}/${retries + 1})...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            const controller = new AbortController();
            // Timeout reducido a 20 segundos - si no responde en ese tiempo, probablemente hay un problema
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            
            // Búsqueda normal por texto con términos en español
            // Usar servidor alternativo si el principal falla
            const baseUrl = attempt === 0 
              ? 'https://nominatim.openstreetmap.org'
              : 'https://nominatim.openstreetmap.org'; // Mantener el mismo por ahora
            
            const url = `${baseUrl}/search?` +
              `q=${encodeURIComponent(query)}&` +
              `format=json&` +
              `viewbox=${viewbox}&` +
              `bounded=1&` +
              `limit=50&` +
              `addressdetails=1&` +
              `accept-language=es`;
            
            console.log(`[POILoader] Fetching "${query}" from ${baseUrl}...`);
            console.log(`[POILoader] URL: ${url.substring(0, 100)}...`);
            
            // Intentar con fetch y mejor manejo de errores
            let response: Response;
            try {
              response = await fetch(url, {
                method: 'GET',
                headers: {
                  'User-Agent': 'NexoAV-LeadMap/1.0',
                  'Accept': 'application/json',
                  'Referer': window.location.origin
                },
                signal: controller.signal,
                cache: 'no-store', // Cambiar a no-store en lugar de no-cache
                mode: 'cors',
                credentials: 'omit'
              });
            } catch (fetchError: any) {
              // Capturar errores de red antes de que lleguen al timeout
              if (fetchError.name === 'AbortError') {
                throw fetchError; // Re-lanzar para que se maneje como timeout
              }
              throw new Error(`Network error: ${fetchError.message || 'Failed to fetch'}`);
            }
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              if (response.status === 429) {
                // Rate limit - esperar más tiempo antes de retry
                console.warn(`[POILoader] Rate limited for "${query}", waiting 10 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                continue;
              }
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (Array.isArray(data)) {
              console.log(`[POILoader] ✓ Successfully fetched ${data.length} results for "${query}"`);
              // Resetear contador de errores en caso de éxito
              errorCountRef.current = 0;
              return data;
            }
            console.warn(`[POILoader] Unexpected response format for "${query}"`);
            return [];
          } catch (error: any) {
            // Log detallado del error para debugging
            const errorType = error.name || 'Unknown';
            const errorMsg = error.message || String(error);
            
            if (attempt === 0) {
              if (errorType === 'AbortError') {
                console.warn(`[POILoader] ⏱ Timeout fetching "${query}" (25s exceeded)`);
              } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('ERR_CONNECTION') || errorMsg.includes('Network error')) {
                console.warn(`[POILoader] 🔌 Connection error fetching "${query}":`, errorMsg);
                console.warn(`[POILoader] This may be due to:`);
                console.warn(`[POILoader] - Nominatim server overloaded`);
                console.warn(`[POILoader] - Network connectivity issues`);
                console.warn(`[POILoader] - CORS or firewall blocking`);
              } else {
                console.warn(`[POILoader] ❌ Error fetching "${query}":`, errorMsg);
              }
            }
            
            // Si es el último intento, retornar array vacío
            if (attempt === retries) {
              console.log(`[POILoader] ✗ Failed to fetch "${query}" after ${retries + 1} attempts`);
              
              // Incrementar contador de errores
              errorCountRef.current += 1;
              
              // Si hay 2 errores consecutivos (más rápido), deshabilitar POIs por 10 minutos
              if (errorCountRef.current >= 2) {
                console.warn('[POILoader] ⚠ Too many connection errors, disabling POIs for 10 minutes');
                console.warn('[POILoader] POIs will be automatically re-enabled after the cooldown period');
                isDisabledRef.current = true;
                setTimeout(() => {
                  isDisabledRef.current = false;
                  errorCountRef.current = 0;
                  console.log('[POILoader] ✓ POIs re-enabled after cooldown period');
                }, 10 * 60 * 1000); // 10 minutos
              }
              return [];
            }
          }
        }
        return [];
      };
      
      // Hacer una sola búsqueda para minimizar problemas de conexión
      const allResults = await fetchWithRetry(searchQueries[0]);
      
      console.log(`[POILoader] Received ${allResults.length} total results`);
      
      if (allResults.length === 0) {
        console.log('[POILoader] No POIs found in this area');
        onPOIsLoaded([]);
        return;
      }
      
      // Procesar y deduplicar resultados
      const poisMap = new Map<string, POI>();
      
      allResults.forEach((item: any) => {
        if (!item.lat || !item.lon || !item.display_name) return;
        
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        
        // Extraer nombre (primera parte de display_name o usar name)
        const nameParts = item.display_name.split(',');
        const name = nameParts[0]?.trim() || item.name || 'Sin nombre';
        
        // Determinar tipo y categoría desde address o type
        const address = item.address || {};
        const shop = address.shop || item.type;
        const amenity = address.amenity;
        const office = address.office;
        
        // Determinar categoría para color basado en el tipo
        let finalCategory = 'default';
        let finalType = 'default';
        
        if (shop) {
          finalCategory = shop === 'supermarket' || shop === 'mall' ? shop : 'shop';
          finalType = shop;
        } else if (amenity) {
          finalCategory = amenity;
          finalType = amenity;
        } else if (office) {
          finalCategory = 'office';
          finalType = office;
        } else if (item.type) {
          finalCategory = item.type;
          finalType = item.type;
        } else if (item.class) {
          finalCategory = item.class;
          finalType = item.class;
        }
        
        // Crear ID único basado en coordenadas y nombre
        const id = `poi-${lat.toFixed(6)}-${lon.toFixed(6)}-${name.substring(0, 20)}`;
        
        // Deduplicación por coordenadas (redondeadas a 4 decimales ≈ 11 metros)
        const coordKey = `${lat.toFixed(4)}-${lon.toFixed(4)}`;
        
        if (!poisMap.has(coordKey)) {
          poisMap.set(coordKey, {
            id,
            lat,
            lon,
            name,
            type: finalType,
            category: finalCategory,
            amenity,
            shop,
            office,
            address: item.display_name,
          });
        }
      });
      
      const pois = Array.from(poisMap.values()).slice(0, 150);
      
      if (pois.length > 0) {
        console.log(`[POILoader] Successfully loaded ${pois.length} unique POIs`);
        console.log('[POILoader] Sample POIs:', pois.slice(0, 3));
      } else {
        console.log('[POILoader] No valid POIs after processing');
      }
      onPOIsLoaded(pois);
    } catch (error) {
      console.error('[POILoader] Fatal error fetching POIs:', error);
      if (error instanceof Error) {
        console.error('[POILoader] Error message:', error.message);
        console.error('[POILoader] Error stack:', error.stack);
      }
      // En caso de error fatal, limpiar POIs pero no mostrar error al usuario
      // ya que los POIs son opcionales y no críticos para la funcionalidad
      onPOIsLoaded([]);
    } finally {
      setLoading(false);
    }
  }, [map, onPOIsLoaded]);

  // Handle map movement and zoom with debounce
  useMapEvents({
    moveend: () => {
      // Solo hacer fetch si el zoom es suficiente
      const currentZoom = map.getZoom();
      if (currentZoom < 18) {
        return; // No hacer nada si el zoom es muy bajo
      }
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        fetchPOIs(bounds);
      }, 1000); // Aumentar debounce a 1 segundo para reducir peticiones
    },
    zoomend: () => {
      const currentZoom = map.getZoom();
      
      // Si el zoom baja de 18, limpiar POIs inmediatamente
      if (currentZoom < 18) {
        onPOIsLoaded([]);
        return;
      }
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        fetchPOIs(bounds);
      }, 1000); // Aumentar debounce a 1 segundo
    },
  });

  // Initial load - wait for map to be ready
  // NOTA: No cargar automáticamente al montar, solo cuando el usuario haga zoom a 18+
  useEffect(() => {
    console.log('[POILoader] Component mounted, waiting for zoom >= 18...');
    // No hacer carga inicial automática - esperar a que el usuario haga zoom
  }, [map]);

  return null;
};

// Component to handle map clicks for Canvassing
const MapClickHandler = ({
  isCanvassingMode,
  selectedStatus,
  onLocationClick,
}: {
  isCanvassingMode: boolean;
  selectedStatus: CanvassingStatus | null;
  onLocationClick: (lat: number, lon: number) => void;
}) => {
  const map = useMap();

  useMapEvents({
    click: (e) => {
      if (isCanvassingMode && selectedStatus) {
        onLocationClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
};

const LeadMap = forwardRef<LeadMapRef, LeadMapProps>(
  ({ 
    canvassingLocations: propsCanvassingLocations, 
    clients: propsClients, 
    selectedLocation, 
    selectedClient, 
    onLocationSelect, 
    onClientSelect, 
    loading, 
    focusLocation, 
    focusClient, 
    onCanvassingLocationCreate 
  }, ref) => {
  const { toast } = useToast();
  const mapRef = useRef<L.Map | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [internalCanvassingLocations, setInternalCanvassingLocations] = useState<CanvassingLocation[]>([]);
  const [isCanvassingMode, setIsCanvassingMode] = useState(false);
  const [selectedCanvassingStatus, setSelectedCanvassingStatus] = useState<CanvassingStatus | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedCanvassingLocation, setSelectedCanvassingLocation] = useState<string | null>(null);
  const [showCanvassingDialog, setShowCanvassingDialog] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const userLocationHandlerRef = useRef<{
    getCurrentLocation: () => void;
    startWatching: () => void;
    stopWatching: () => void;
  } | null>(null);

  // Use props canvassing locations if provided, otherwise use internal state
  const canvassingLocations = propsCanvassingLocations || internalCanvassingLocations;
  
  // Filter clients with valid coordinates (only if clients are provided)
  const mappableClients = (propsClients || []).filter(c => c.latitude && c.longitude);
  
  // Filter canvassing locations with valid coordinates
  const mappableCanvassingLocations = canvassingLocations.filter(loc => loc.latitude && loc.longitude);

  // Barcelona Metropolitan Area center coordinates (fallback si no hay ubicación del dispositivo)
  const defaultCenter: [number, number] = [41.3851, 2.1734];
  const defaultZoom = 12; // Zoom inicial para cargar el mapa
  const [initialLocationSet, setInitialLocationSet] = useState(false);
  const isDarkTheme = useIsNexoAvDarkTheme();

  // Usamos siempre el mismo estilo de calles (Carto Voyager)
  // tanto en tema claro como en tema oscuro, para mantener
  // los mismos colores y legibilidad del mapa.
  const lightTileUrl =
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const darkTileUrl = lightTileUrl;

  const handlePOIsLoaded = useCallback((loadedPois: POI[]) => {
    console.log('[LeadMap] Received POIs:', loadedPois.length);
    if (loadedPois.length > 0) {
      console.log('[LeadMap] Sample POIs to render:', loadedPois.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lon: p.lon,
        type: p.type,
        category: p.category
      })));
      
      // Validar que los POIs tengan coordenadas válidas antes de guardarlos
      const validPois = loadedPois.filter(poi => {
        const isValid = poi.lat && poi.lon && !isNaN(poi.lat) && !isNaN(poi.lon);
        if (!isValid) {
          console.warn('[LeadMap] Filtering invalid POI before setting state:', poi);
        }
        return isValid;
      });
      
      console.log(`[LeadMap] Setting ${validPois.length} valid POIs to state (filtered from ${loadedPois.length})`);
      setPois(validPois);
    } else {
      console.log('[LeadMap] No POIs to set, clearing state');
      setPois([]);
    }
  }, []);

  // Cargar ubicación del dispositivo automáticamente al montar el componente
  useEffect(() => {
    if (initialLocationSet) return; // Solo una vez
    
    if (!navigator.geolocation) {
      console.log('[LeadMap] Geolocation not available, using default center');
      return;
    }

    console.log('[LeadMap] Attempting to get device location on mount...');
    
    const options: PositionOptions = {
      enableHighAccuracy: false, // Usar menos precisión para carga inicial más rápida
      timeout: 10000,
      maximumAge: 60000 // Aceptar ubicación de hasta 1 minuto de antigüedad
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('[LeadMap] Device location obtained:', latitude, longitude);
        setUserLocation({ lat: latitude, lon: longitude });
        setInitialLocationSet(true);
        
        // Centrar el mapa en la ubicación del dispositivo con zoom 12
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 12, {
            animate: false, // Sin animación para carga inicial más rápida
          });
        }
      },
      (error) => {
        console.log('[LeadMap] Could not get device location, using default center:', error.message);
        setInitialLocationSet(true);
        // Si falla, usar el centro por defecto (Barcelona)
      },
      options
    );
  }, [initialLocationSet]);

  // Handle user location (botón manual)
  const handleGetUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocalización no está disponible en este navegador",
        variant: "destructive",
      });
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        setIsLocating(false);
        
        // Centrar el mapa en la ubicación del usuario con zoom 12
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 12, {
            animate: true,
          });
        }
        
        toast({
          title: "Ubicación obtenida",
          description: "Tu ubicación se ha mostrado en el mapa",
        });
      },
      (error) => {
        let errorMessage = 'Error al obtener la ubicación';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de geolocalización denegado. Por favor, permite el acceso a tu ubicación en la configuración del navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado al obtener la ubicación';
            break;
        }
        setLocationError(errorMessage);
        setIsLocating(false);
        toast({
          title: "Error de geolocalización",
          description: errorMessage,
          variant: "destructive",
        });
      },
      options
    );
  }, [toast]);

  // Load Canvassing locations for current user (only if not provided via props)
  const loadCanvassingLocations = useCallback(async () => {
    // If canvassing locations are provided via props, don't load them
    if (propsCanvassingLocations) {
      return;
    }
    
    try {
      const { data, error } = await (supabase.rpc as any)('list_user_canvassing_locations');
      
      if (error) {
        console.error('[LeadMap] Error loading canvassing locations:', error);
        return;
      }
      
      // Ensure data is an array
      const dataArray = Array.isArray(data) ? data : [];
      
      const locations: CanvassingLocation[] = dataArray.map((loc: any) => ({
        id: loc.id,
        status: loc.status,
        company_name: loc.company_name,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        address: loc.address,
        city: loc.city,
        province: loc.province,
        contact_first_name: loc.contact_first_name,
        contact_last_name: loc.contact_last_name,
        contact_phone_primary: loc.contact_phone_primary,
        created_at: loc.created_at,
      }));
      
      console.log('[LeadMap] Loaded', locations.length, 'canvassing locations');
      setInternalCanvassingLocations(locations);
    } catch (error) {
      console.error('[LeadMap] Error loading canvassing locations:', error);
    }
  }, [propsCanvassingLocations]);

  // Handle Canvassing status selection
  const handleCanvassingStatusSelect = useCallback((status: CanvassingStatus) => {
    setSelectedCanvassingStatus(status);
    setIsCanvassingMode(true);
    console.log('[LeadMap] Canvassing mode activated with status:', status);
  }, []);

  // Handle map click for Canvassing
  const handleMapClickForCanvassing = useCallback(async (lat: number, lon: number) => {
    if (!selectedCanvassingStatus) {
      console.warn('[LeadMap] No status selected for Canvassing');
      return;
    }

    console.log('[LeadMap] Map clicked for Canvassing at:', lat, lon, 'with status:', selectedCanvassingStatus);
    setPendingLocation({ lat, lon });
    
    // Try to create location directly first (faster, no geocoding delay)
    // If geocoding is needed, we can update it later
    const createLocation = async (addressData: {
      address: string;
      city: string;
      province?: string | null;
      postalCode?: string | null;
      country: string;
      locationReferences?: string | null;
      companyName: string;
    }) => {
      // Ensure numeric values are properly formatted
      const latitude = typeof lat === 'number' ? lat : parseFloat(String(lat));
      const longitude = typeof lon === 'number' ? lon : parseFloat(String(lon));
      
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Coordenadas inválidas');
      }

      // Solo campos obligatorios: status, latitude, longitude, company_name
      const params = {
        p_status: selectedCanvassingStatus,
        p_latitude: latitude,
        p_longitude: longitude,
        p_company_name: addressData.companyName || 'Sin nombre',
        // Campos opcionales (se completarán con geocodificación)
        p_address: addressData.address || null,
        p_city: addressData.city || null,
        p_province: addressData.province || null,
        p_postal_code: addressData.postalCode || null,
        p_country: addressData.country || 'ES',
        p_location_references: addressData.locationReferences || null,
      };

      console.log('[LeadMap] Calling create_canvassing_location with params:', params);
      console.log('[LeadMap] Status type:', typeof selectedCanvassingStatus, 'Value:', selectedCanvassingStatus);

      const { data: locationData, error } = await (supabase.rpc as any)('create_canvassing_location', params);

      if (error) {
        console.error('[LeadMap] Error creating canvassing location:', error);
        console.error('[LeadMap] Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('[LeadMap] Canvassing location created, response:', locationData);
      console.log('[LeadMap] Response type:', typeof locationData, 'Is array:', Array.isArray(locationData));
      
      // Extract location ID - Function now returns TABLE with location_id field
      let locationId: string | null = null;
      
      if (Array.isArray(locationData) && locationData.length > 0) {
        // New format: [{ location_id: 'uuid' }]
        locationId = (locationData[0] as any)?.location_id || null;
      } else if (typeof locationData === 'object' && locationData !== null) {
        // Fallback: { location_id: 'uuid' }
        locationId = (locationData as any)?.location_id || null;
      } else if (typeof locationData === 'string') {
        // Legacy format: direct UUID string
        locationId = locationData;
      }
      
      if (!locationId) {
        console.error('[LeadMap] No location ID returned. Raw data:', locationData);
        throw new Error('No se recibió el ID de la ubicación creada');
      }

      console.log('[LeadMap] Extracted location ID:', locationId);
      
      // Reload locations to show the new pin
      await loadCanvassingLocations();
      
      // Open dialog to edit the new location
      setSelectedCanvassingLocation(locationId);
      setShowCanvassingDialog(true);
      
      // Reset mode
      setIsCanvassingMode(false);
      setSelectedCanvassingStatus(null);
      setPendingLocation(null);
      
      // Notify parent
      if (onCanvassingLocationCreate) {
        onCanvassingLocationCreate(locationId);
      }

      toast({
        title: "Punto creado",
        description: "El punto de Canvassing se ha creado correctamente",
      });

      // Retornar locationId para usarlo en geocodificación en segundo plano
      return locationId;
    };

    // Crear punto inmediatamente con coordenadas (rápido)
    // La geocodificación se hará en segundo plano y actualizará la dirección después
    try {
      // Crear primero con coordenadas para respuesta inmediata
      const createdLocationId =         // Crear con solo campos obligatorios - el usuario completará el nombre después
        await createLocation({
          address: null, // Se completará con geocodificación
          city: null, // Se completará con geocodificación
          province: null,
          postalCode: null,
          country: 'ES',
          locationReferences: null,
          companyName: 'Sin nombre', // Temporal, el usuario debe cambiarlo
        });

      // Geocodificación en segundo plano (no bloquea la UI)
      // Se actualizará la dirección cuando termine
      if (createdLocationId) {
        setTimeout(async () => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=es&zoom=18`,
              {
                headers: {
                  'User-Agent': 'NexoAV-Canvassing/1.0'
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              const addr = data.address || {};
              
              // Construir dirección completa con calle y número
              const streetParts = [];
              if (addr.road) streetParts.push(addr.road);
              if (addr.house_number) streetParts.push(addr.house_number);
              const streetAddress = streetParts.length > 0 ? streetParts.join(', ') : addr.road || '';
              
              // Dirección completa para display
              const fullAddress = data.display_name || `${streetAddress || lat}, ${lon}`;
              
              // Ciudad (prioridad: city > town > village > municipality)
              const city = addr.city || addr.town || addr.village || addr.municipality || 'Desconocida';
              
              // Provincia/Estado
              const province = addr.state || addr.region || addr.province || '';
              
              // Código postal
              const postalCode = addr.postcode || '';
              
              // País
              const country = addr.country_code?.toUpperCase() || 'ES';

              console.log('[LeadMap] Geocoded address (background):', {
                fullAddress,
                streetAddress,
                city,
                province,
                postalCode,
                country,
              });

              // Actualizar la ubicación con la dirección geocodificada
              await (supabase.rpc as any)('update_canvassing_location', {
                p_location_id: createdLocationId,
                p_data: {
                  address: fullAddress,
                  city,
                  province: province || null,
                  postal_code: postalCode || null,
                  country,
                  location_references: streetAddress ? `Calle: ${streetAddress}` : null,
                },
              });
              
              // Recargar para mostrar la dirección actualizada
              await loadCanvassingLocations();
            }
          } catch (geocodeError) {
            console.warn('[LeadMap] Background geocoding failed:', geocodeError);
            // No mostrar error al usuario, el punto ya está creado
          }
        }, 1200); // Delay para cumplir rate limiting de Nominatim
      }
      
    } catch (createError: any) {
      console.error('[LeadMap] Error creating location:', createError);
      toast({
        title: "Error",
        description: createError.message || "No se pudo crear el punto de Canvassing. Verifica la consola para más detalles.",
        variant: "destructive",
      });
    }
  }, [selectedCanvassingStatus, loadCanvassingLocations, onCanvassingLocationCreate, toast]);

  // Load canvassing locations on mount
  useEffect(() => {
    loadCanvassingLocations();
  }, [loadCanvassingLocations]);

  useImperativeHandle(ref, () => ({
    focusOnClient: (client: LeadClient) => {
      if (client.latitude && client.longitude && mapInstanceRef.current) {
        mapInstanceRef.current.setView([client.latitude, client.longitude], 18, {
          animate: true,
        });
      }
    },
    focusOnLocation: (location: CanvassingLocation) => {
      if (location.latitude && location.longitude && mapInstanceRef.current) {
        mapInstanceRef.current.setView([location.latitude, location.longitude], 18, {
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
    <div className="h-full w-full relative" style={{ height: '100%', minHeight: '500px', width: '100%' }}>
      <style>{`
        .custom-marker {
          background: transparent;
          border: none;
        }
        .poi-marker {
          background: transparent;
          border: none;
        }
        .canvassing-marker {
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
        .canvassing-popup .leaflet-popup-content-wrapper {
          padding: 0;
        }
        .canvassing-popup .leaflet-popup-content {
          margin: 0;
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
        /* Asegurar que los controles flotantes de Canvassing estén por encima del mapa */
        .leaflet-container {
          pointer-events: auto;
        }
        /* Permitir que los elementos con z-index alto reciban eventos táctiles */
        [style*="z-index"] {
          pointer-events: auto !important;
        }
      `}</style>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        style={{ height: '100%', width: '100%', minHeight: '500px' }}
        ref={(map) => {
          mapRef.current = map;
          mapInstanceRef.current = map;
        }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {/* Capa base: cambia entre claro/oscuro según el tema de NEXO AV */}
        <TileLayer
          key={isDarkTheme ? "nexo-map-dark" : "nexo-map-light"}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={isDarkTheme ? darkTileUrl : lightTileUrl}
          maxZoom={19}
        />
        
        <MapCenterHandler 
          selectedClient={selectedClient} 
          selectedLocation={selectedLocation}
          focusClient={focusClient} 
          focusLocation={focusLocation}
          userLocation={userLocation} 
        />
        <POILoader onPOIsLoaded={handlePOIsLoaded} />
        <MapClickHandler
          isCanvassingMode={isCanvassingMode}
          selectedStatus={selectedCanvassingStatus}
          onLocationClick={handleMapClickForCanvassing}
        />
        
        {/* Client markers */}
        {/* Client markers - only show if clients are provided and no canvassing locations */}
        {mappableClients.length > 0 && mappableCanvassingLocations.length === 0 && mappableClients.map((client) => (
          <Marker
            key={client.id}
            position={[client.latitude!, client.longitude!]}
            icon={createMarkerIcon(LEAD_STAGE_COLORS[client.lead_stage] || "#6B7280")}
            eventHandlers={{
              click: () => onClientSelect && onClientSelect(client),
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
        {(() => {
          // Debug: verificar estado de POIs en cada render
          if (pois && Array.isArray(pois)) {
            if (pois.length > 0) {
              console.log(`[LeadMap] Render: ${pois.length} POIs in state, attempting to render...`);
            }
          } else {
            console.warn('[LeadMap] Render: pois is not a valid array:', typeof pois, pois);
          }
          return null;
        })()}
        {pois && Array.isArray(pois) && pois.length > 0 && (
          <>
            {pois.map((poi, index) => {
              // Validar coordenadas
              if (!poi.lat || !poi.lon || isNaN(poi.lat) || isNaN(poi.lon)) {
                console.warn(`[LeadMap] POI ${index} has invalid coordinates:`, poi);
                return null;
              }
              
              // Determinar el tipo para el icono
              const iconType = poi.category || poi.type || 'default';
              
              // Log del primer POI para debug
              if (index === 0) {
                console.log(`[LeadMap] Rendering first POI:`, {
                  id: poi.id,
                  name: poi.name,
                  lat: poi.lat,
                  lon: poi.lon,
                  type: iconType,
                  category: poi.category
                });
              }
              
              try {
                const icon = createPOIIcon(iconType, poi.category);
                return (
                  <Marker
                    key={poi.id}
                    position={[poi.lat, poi.lon]}
                    icon={icon}
                    zIndexOffset={-100}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-semibold text-xs mb-1">{poi.name || 'Sin nombre'}</h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {poi.shop || poi.amenity || poi.type || 'Punto de interés'}
                        </p>
                        {poi.address && (
                          <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">{poi.address}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              } catch (error) {
                console.error(`[LeadMap] Error rendering POI ${index}:`, poi, error);
                return null;
              }
            })}
          </>
        )}
        
        {/* User location marker */}
        {userLocation && (
          <Marker
            key="user-location"
            position={[userLocation.lat, userLocation.lon]}
            icon={createUserLocationIcon()}
            zIndexOffset={200}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-xs mb-1">Tu ubicación</h3>
                <p className="text-xs text-muted-foreground">
                  {userLocation.lat.toFixed(6)}, {userLocation.lon.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Canvassing location markers - show if canvassing locations are provided */}
        {mappableCanvassingLocations.map((location) => {
          const statusInfo = CANVASSING_STATUSES[location.status as CanvassingStatus];
          
          return (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={createCanvassingIcon(location.status as CanvassingStatus)}
              zIndexOffset={100}
              eventHandlers={{
                click: () => {
                  if (onLocationSelect) {
                    onLocationSelect(location);
                  }
                },
              }}
            >
              <Popup
                closeButton={true}
                className="canvassing-popup"
                autoPan={true}
                closeOnClick={false}
              >
                <div className="p-3 min-w-[220px]">
                  <div className="flex items-start gap-2.5 mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color, border: `1.5px solid ${statusInfo.color}30` }}
                    >
                      {statusInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      {location.company_name ? (
                        <h3 className="font-semibold text-sm mb-1.5 truncate" title={location.company_name}>
                          {location.company_name}
                        </h3>
                      ) : (
                        <h3 className="font-semibold text-sm mb-1.5 text-muted-foreground">
                          Sin nombre
                        </h3>
                      )}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color }}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCanvassingLocation(location.id);
                      setShowCanvassingDialog(true);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Botón de geolocalización */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Button
          onClick={handleGetUserLocation}
          disabled={isLocating}
          size="sm"
          variant="outline"
          className="bg-background/90 backdrop-blur-sm shadow-lg hover:bg-background"
          title="Mostrar mi ubicación"
        >
          {isLocating ? (
            <>
              <Crosshair className="h-4 w-4 mr-2 animate-spin" />
              Localizando...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Mi ubicación
            </>
          )}
        </Button>
      </div>
      
      {/* Empty state messages - Solo mostrar para clientes, no para canvassing (permite navegación) */}
      {mappableCanvassingLocations.length === 0 && mappableClients.length === 0 && !loading && !propsCanvassingLocations && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[500] pointer-events-none">
          <div className="text-center">
            <p className="text-muted-foreground">No hay elementos con ubicación</p>
            <p className="text-sm text-muted-foreground">Crea un nuevo elemento para verlo en el mapa</p>
          </div>
        </div>
      )}

      {/* Canvassing Tool - Mostrar siempre si hay canvassingLocations o si no hay clients */}
      {(propsCanvassingLocations || (mappableClients.length === 0 && !propsClients)) && (
        <CanvassingTool
          onStatusSelect={handleCanvassingStatusSelect}
          isActive={true}
        />
      )}

      {/* Indicador de modo Canvassing */}
      {isCanvassingMode && selectedCanvassingStatus && (
        <div className="absolute left-1/2 -translate-x-1/2 z-[9998] bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg pointer-events-none top-20 md:top-4">
          <p className="text-xs sm:text-sm font-medium text-center">
            Estás usando la xinxeta{" "}
            <span className="inline-block px-2 py-0.5 rounded-full bg-primary-foreground/10 text-primary-foreground font-semibold">
              {CANVASSING_STATUSES[selectedCanvassingStatus].label}
            </span>
            <span className="block sm:inline mt-1 sm:mt-0">
              {" "}
              · toca en el mapa para marcar un punto
            </span>
          </p>
        </div>
      )}

      {/* Dialog para editar Canvassing Location */}
      <CanvassingLocationDialog
        open={showCanvassingDialog}
        onOpenChange={setShowCanvassingDialog}
        locationId={selectedCanvassingLocation}
        onSuccess={() => {
          loadCanvassingLocations();
          setSelectedCanvassingLocation(null);
          // Si las ubicaciones vienen desde props, notificar al padre para refrescar
          if (propsCanvassingLocations && onCanvassingLocationCreate) {
            // El padre debería refrescar las ubicaciones
          }
        }}
      />
    </div>
  );
});

LeadMap.displayName = "LeadMap";

export default LeadMap;
