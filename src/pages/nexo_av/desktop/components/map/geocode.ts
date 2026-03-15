/**
 * Geocoding helpers backed by Nominatim (OpenStreetMap).
 * The preferred input is always a full address. Locality geocoding is only
 * used as an approximate fallback so projects and technicians do not disappear
 * from the map when they only have city/province data.
 */

const CACHE = new Map<string, { lat: number; lon: number }>();
const MIN_DELAY_MS = 1100; // Nominatim: 1 request/second
let lastRequestTime = 0;

export interface GeocodeOptions {
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  province?: string | null;
}

async function runGeocodeQuery(
  query: string,
): Promise<{ lat: number; lon: number } | null> {
  const normalized = (query && String(query).trim()) || "";
  if (!normalized) return null;

  const key = normalized.toLowerCase();
  const cached = CACHE.get(key);
  if (cached) return cached;

  const now = Date.now();
  const wait = Math.max(0, MIN_DELAY_MS - (now - lastRequestTime));
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestTime = Date.now();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(normalized)}&format=json&countrycodes=es&limit=1&addressdetails=1`,
      { headers: { "Accept-Language": "es" } },
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
 * Full address geocoding. Requires street + number for precise placement.
 */
export async function geocodeAddress(
  address: string,
  city?: string | null,
  options?: { postalCode?: string | null; province?: string | null },
): Promise<{ lat: number; lon: number } | null> {
  const addressPart = (address && String(address).trim()) || "";
  const cityPart = (city && String(city).trim()) || "";
  const postalCode = options?.postalCode && String(options.postalCode).trim();
  const province = options?.province && String(options.province).trim();

  if (!addressPart) return null;

  const locality = [postalCode, cityPart].filter(Boolean).join(" ");
  const full = [addressPart, locality, province, "Espana"]
    .filter(Boolean)
    .join(", ");
  return runGeocodeQuery(full);
}

/**
 * Full address geocoding when the backend already returns a single string.
 */
export async function geocodeFullAddress(
  fullAddress: string,
): Promise<{ lat: number; lon: number } | null> {
  const raw = (fullAddress && String(fullAddress).trim()) || "";
  if (!raw) return null;

  const full =
    raw.endsWith("Espana") || raw.endsWith("Spain") ? raw : `${raw}, Espana`;
  return runGeocodeQuery(full);
}

/**
 * Approximate fallback by locality. Used only when there is no precise address.
 */
export async function geocodeLocality(
  city?: string | null,
  province?: string | null,
  postalCode?: string | null,
): Promise<{ lat: number; lon: number } | null> {
  const cityPart = (city && String(city).trim()) || "";
  const provincePart = (province && String(province).trim()) || "";
  const postalPart = (postalCode && String(postalCode).trim()) || "";
  if (!cityPart && !provincePart) return null;

  const locality = [postalPart, cityPart].filter(Boolean).join(" ");
  const full = [locality, provincePart, "Espana"].filter(Boolean).join(", ");
  return runGeocodeQuery(full);
}

export function clearGeocodeCache() {
  CACHE.clear();
}
