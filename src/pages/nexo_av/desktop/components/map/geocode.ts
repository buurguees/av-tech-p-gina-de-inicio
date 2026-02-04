/**
 * Geocodificación con Nominatim (OpenStreetMap).
 * Cache en memoria y throttling para no superar límites de uso.
 *
 * En todos los mapas se deben usar direcciones completas: calle, número,
 * código postal, población, provincia. No se usa solo ciudad o población.
 */

const CACHE = new Map<string, { lat: number; lon: number }>();
const MIN_DELAY_MS = 1100; // Nominatim: 1 request/second
let lastRequestTime = 0;

export interface GeocodeOptions {
  /** Calle y número (obligatorio para precisión en mapa) */
  address?: string | null;
  /** Código postal */
  postalCode?: string | null;
  /** Población / ciudad */
  city?: string | null;
  /** Provincia */
  province?: string | null;
}

/**
 * Geocodifica una dirección completa (calle, número, CP, población, provincia).
 * Se construye la cadena: "dirección, CP población, provincia, España".
 * No se usa solo ciudad: se requiere al menos dirección (calle/número) para un pin preciso.
 */
export async function geocodeAddress(
  address: string,
  city?: string | null,
  options?: { postalCode?: string | null; province?: string | null }
): Promise<{ lat: number; lon: number } | null> {
  const addressPart = (address && String(address).trim()) || "";
  const cityPart = (city && String(city).trim()) || "";
  const postalCode = options?.postalCode && String(options.postalCode).trim();
  const province = options?.province && String(options.province).trim();

  // Se requiere al menos calle/número: no se geocodifica solo ciudad o población.
  if (!addressPart) return null;

  // Construir "dirección, [CP] población, provincia, España"
  const locality = [postalCode, cityPart].filter(Boolean).join(" ");
  const parts = [addressPart, locality, province].filter(Boolean);
  const full = parts.concat("España").join(", ");

  const key = full.toLowerCase();
  const cached = CACHE.get(key);
  if (cached) return cached;

  const now = Date.now();
  const wait = Math.max(0, MIN_DELAY_MS - (now - lastRequestTime));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestTime = Date.now();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(full)}&format=json&countrycodes=es&limit=1&addressdetails=1`,
      { headers: { "Accept-Language": "es" } }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const { lat, lon } = data[0];
    const result = { lat: parseFloat(lat), lon: parseFloat(lon) };
    CACHE.set(key, result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Geocodifica una dirección completa en una sola cadena (ej. "C/Marina, 30-32, 08940, Cornellà de Llobregat").
 * Útil cuando el backend devuelve full_address pero no lat/lon. Añade ", España" si no está.
 */
export async function geocodeFullAddress(
  fullAddress: string
): Promise<{ lat: number; lon: number } | null> {
  const raw = (fullAddress && String(fullAddress).trim()) || "";
  if (!raw) return null;
  const full = raw.endsWith("España") || raw.endsWith("Spain") ? raw : `${raw}, España`;

  const key = full.toLowerCase();
  const cached = CACHE.get(key);
  if (cached) return cached;

  const now = Date.now();
  const wait = Math.max(0, MIN_DELAY_MS - (now - lastRequestTime));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestTime = Date.now();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(full)}&format=json&countrycodes=es&limit=1&addressdetails=1`,
      { headers: { "Accept-Language": "es" } }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const { lat, lon } = data[0];
    const result = { lat: parseFloat(lat), lon: parseFloat(lon) };
    CACHE.set(key, result);
    return result;
  } catch {
    return null;
  }
}

export function clearGeocodeCache() {
  CACHE.clear();
}
