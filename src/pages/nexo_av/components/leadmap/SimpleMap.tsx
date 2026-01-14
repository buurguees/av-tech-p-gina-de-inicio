import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Crosshair, MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface MapItem {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
  [key: string]: any; // Para permitir propiedades adicionales según el tipo
}

interface SimpleMapProps {
  items: MapItem[];
  selectedItem: MapItem | null;
  onItemSelect: (item: MapItem | null) => void;
  loading: boolean;
  focusItem?: MapItem | null;
  markerColor?: string; // Color para los marcadores
  getItemLabel?: (item: MapItem) => string; // Función para obtener la etiqueta del item
  getItemDetails?: (item: MapItem) => React.ReactNode; // Función para obtener detalles del item
}

export interface SimpleMapRef {
  focusOnItem: (item: MapItem) => void;
}

// Create colored marker icon
const createMarkerIcon = (color: string = "#3B82F6") => {
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

// Component to handle map updates
const MapUpdater = ({ 
  focusItem, 
  mapRef 
}: { 
  focusItem: MapItem | null; 
  mapRef: React.MutableRefObject<L.Map | null>;
}) => {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  useEffect(() => {
    if (focusItem && focusItem.latitude && focusItem.longitude) {
      map.setView([focusItem.latitude, focusItem.longitude], 15, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [focusItem, map]);

  return null;
};

const SimpleMap = forwardRef<SimpleMapRef, SimpleMapProps>(
  ({ 
    items, 
    selectedItem, 
    onItemSelect, 
    loading, 
    focusItem,
    markerColor = "#3B82F6",
    getItemLabel = (item) => item.name,
    getItemDetails = (item) => (
      <div>
        <p className="font-semibold">{item.name}</p>
        {item.address && <p className="text-sm text-muted-foreground">{item.address}</p>}
      </div>
    )
  }, ref) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Barcelona Metropolitan Area center coordinates (fallback)
  const defaultCenter: [number, number] = [41.3851, 2.1734];
  const defaultZoom = 12;

  // Filter items with valid coordinates
  const mappableItems = items.filter(item => item.latitude && item.longitude);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focusOnItem: (item: MapItem) => {
      if (item.latitude && item.longitude && mapInstanceRef.current) {
        mapInstanceRef.current.setView([item.latitude, item.longitude], 15, {
          animate: true,
          duration: 0.5,
        });
      }
    },
  }));

  // Handle user location
  const handleGetUserLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15, {
            animate: true,
            duration: 0.5,
          });
        }
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLocating(false);
      }
    );
  };

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
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          padding: 0;
        }
        .leaflet-popup-content {
          margin: 0;
          min-width: 200px;
        }
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
        style={{ height: '100%', width: '100%', minHeight: '500px' }}
        ref={(map) => {
          mapRef.current = map;
          mapInstanceRef.current = map;
        }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater focusItem={focusItem} mapRef={mapInstanceRef} />

        {/* Markers for items */}
        {mappableItems.map((item) => (
          <Marker
            key={item.id}
            position={[item.latitude!, item.longitude!]}
            icon={createMarkerIcon(markerColor)}
            eventHandlers={{
              click: () => {
                onItemSelect(item);
              },
            }}
          >
            <Popup>
              <div className="p-2">
                {getItemDetails(item)}
              </div>
            </Popup>
          </Marker>
        ))}
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
      
      {mappableItems.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[500]">
          <div className="text-center">
            <p className="text-muted-foreground">No hay elementos con ubicación</p>
          </div>
        </div>
      )}
    </div>
  );
});

SimpleMap.displayName = "SimpleMap";

export default SimpleMap;
