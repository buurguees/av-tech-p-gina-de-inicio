import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Bounding box aproximado de España peninsular + Baleares + Canarias
const SPAIN_BOUNDS: L.LatLngBoundsExpression = [
  [27.5, -18.2], // SW — incluye Canarias
  [43.8, 4.5],   // NE — incluye Baleares
];

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
  markerColor?: string;
  getMarkerColor?: (item: MapItem) => string;
  renderTooltip: (item: MapItem) => React.ReactNode;
  loading?: boolean;
}

/** Llama a invalidateSize() al montar y cada vez que el contenedor cambia de tamaño.
 *  Necesario para que Leaflet rellene correctamente el contenedor flex/tab. */
function MapAutoResize() {
  const map = useMap();
  useEffect(() => {
    // Invalidación inicial (el contenedor puede estar recién visible)
    const t = setTimeout(() => map.invalidateSize(), 50);

    // Invalidar si el contenedor cambia de dimensiones (resize del panel o cambio de tab)
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);

    return () => {
      clearTimeout(t);
      observer.disconnect();
    };
  }, [map]);
  return null;
}

/** Ajusta la vista al conjunto de markers. Si no hay markers, muestra España. */
function FitMapToItems({ items }: { items: MapItem[] }) {
  const map = useMap();

  useEffect(() => {
    if (items.length === 0) {
      map.fitBounds(SPAIN_BOUNDS, { animate: false, padding: [0, 0] });
      return;
    }

    if (items.length === 1) {
      map.setView([items[0].latitude, items[0].longitude], 12, {
        animate: true,
        duration: 0.4,
      });
      return;
    }

    const bounds = L.latLngBounds(
      items.map((item) => [item.latitude, item.longitude] as [number, number]),
    );
    map.fitBounds(bounds, {
      padding: [48, 48],
      maxZoom: 13,
      animate: true,
      duration: 0.4,
    });
  }, [items, map]);

  return null;
}

export default function MapWithMarkers({
  items,
  markerColor = "#3B82F6",
  getMarkerColor,
  renderTooltip,
  loading = false,
}: MapWithMarkersProps) {
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/20">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <style>{`
        .custom-marker { background: transparent; border: none; }
        .leaflet-tooltip {
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          max-width: 280px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          border: 1px solid rgba(0,0,0,0.08);
        }
        .leaflet-container {
          z-index: 1;
          font-family: inherit;
          height: 100% !important;
          width: 100% !important;
          border-radius: inherit;
        }
      `}</style>
      <MapContainer
        bounds={SPAIN_BOUNDS}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapAutoResize />
        <FitMapToItems items={items} />
        {items.map((item) => {
          const color = getMarkerColor
            ? getMarkerColor(item)
            : (markerColor ?? "#3B82F6");
          return (
            <Marker
              key={item.id}
              position={[item.latitude, item.longitude]}
              icon={createMarkerIcon(color)}
            >
              <Tooltip
                direction="top"
                offset={[0, -14]}
                opacity={1}
                permanent={false}
                interactive
              >
                {renderTooltip(item)}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
