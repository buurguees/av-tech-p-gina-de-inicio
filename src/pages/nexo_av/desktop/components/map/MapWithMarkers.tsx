import { useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const createMarkerIcon = (color = "#3B82F6") => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28"><path fill="${color}" stroke="#fff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
  return L.divIcon({
    html: svg,
    className: "custom-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    tooltipAnchor: [14, -14],
  });
};

export interface MapItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  [key: string]: unknown;
}

interface MapWithMarkersProps {
  items: MapItem[];
  center?: [number, number];
  zoom?: number;
  markerColor?: string;
  /** Si se define, cada marcador usa este color según el ítem (p. ej. por estado) */
  getMarkerColor?: (item: MapItem) => string;
  renderTooltip: (item: MapItem) => React.ReactNode;
  loading?: boolean;
}

function MapContent({ items, center, zoom, markerColor, getMarkerColor, renderTooltip }: MapWithMarkersProps) {
  const map = useMap();
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    if (!centerRef.current || items.length === 0) return;
    map.setView(centerRef.current, zoomRef.current ?? 12, { animate: true, duration: 0.3 });
  }, [map, items.length]);

  return (
    <>
      {items.map((item) => {
        const color = getMarkerColor ? getMarkerColor(item) : (markerColor ?? "#3B82F6");
        return (
          <Marker
            key={item.id}
            position={[item.latitude, item.longitude]}
            icon={createMarkerIcon(color)}
            eventHandlers={{ click: () => {} }}
          >
            <Tooltip direction="top" offset={[0, -14]} opacity={1} permanent={false} interactive>
              {renderTooltip(item)}
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

/** Centro de España (vista país al completo) */
const DEFAULT_CENTER: [number, number] = [40.2, -3.5];
const DEFAULT_ZOOM = 6;

export default function MapWithMarkers({
  items,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  markerColor = "#3B82F6",
  getMarkerColor,
  renderTooltip,
  loading = false,
}: MapWithMarkersProps) {
  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="h-full w-full relative" style={{ minHeight: 280 }}>
      <style>{`
        .custom-marker { background: transparent; border: none; }
        .leaflet-tooltip { padding: 6px 10px; border-radius: 6px; font-size: 12px; max-width: 280px; }
        .leaflet-container { z-index: 1; font-family: inherit; height: 100% !important; width: 100% !important; }
      `}</style>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        style={{ height: "100%", width: "100%", minHeight: "280px" }}
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapContent
          items={items}
          center={center}
          zoom={zoom}
          markerColor={markerColor}
          getMarkerColor={getMarkerColor}
          renderTooltip={renderTooltip}
        />
      </MapContainer>
    </div>
  );
}
