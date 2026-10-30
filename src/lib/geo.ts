// Built-in coordinates for common Indian cities. Used when a user types a city
// instead of sharing GPS. Swap for a geocoding API (Google/Mapbox) in production.
export const CITIES: Record<string, { lat: number; lng: number; aliases?: string[] }> = {
  Delhi: { lat: 28.6139, lng: 77.209, aliases: ["new delhi", "dilli"] },
  Gurgaon: { lat: 28.4595, lng: 77.0266, aliases: ["gurugram", "ggn"] },
  Noida: { lat: 28.5355, lng: 77.391, aliases: ["greater noida"] },
  Ghaziabad: { lat: 28.6692, lng: 77.4538 },
  Faridabad: { lat: 28.4089, lng: 77.3178 },
  Mumbai: { lat: 19.076, lng: 72.8777, aliases: ["bombay"] },
  "Navi Mumbai": { lat: 19.033, lng: 73.0297 },
  Thane: { lat: 19.2183, lng: 72.9781 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Bengaluru: { lat: 12.9716, lng: 77.5946, aliases: ["bangalore", "blr"] },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Chennai: { lat: 13.0827, lng: 80.2707, aliases: ["madras"] },
  Kolkata: { lat: 22.5726, lng: 88.3639, aliases: ["calcutta"] },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Surat: { lat: 21.1702, lng: 72.8311 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Kanpur: { lat: 26.4499, lng: 80.3319 },
  Indore: { lat: 22.7196, lng: 75.8577 },
  Bhopal: { lat: 23.2599, lng: 77.4126 },
  Chandigarh: { lat: 30.7333, lng: 76.7794 },
  Ludhiana: { lat: 30.901, lng: 75.8573 },
  Patna: { lat: 25.5941, lng: 85.1376 },
  Nagpur: { lat: 21.1458, lng: 79.0882 },
  Kochi: { lat: 9.9312, lng: 76.2673, aliases: ["cochin"] },
  Coimbatore: { lat: 11.0168, lng: 76.9558 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185, aliases: ["vizag"] },
  Dehradun: { lat: 30.3165, lng: 78.0322 },
  Agra: { lat: 27.1767, lng: 78.0081 },
  Varanasi: { lat: 25.3176, lng: 82.9739, aliases: ["banaras"] },
  Meerut: { lat: 28.9845, lng: 77.7064 },
  Vadodara: { lat: 22.3072, lng: 73.1812, aliases: ["baroda"] },
  Rajkot: { lat: 22.3039, lng: 70.8022 },
  Guwahati: { lat: 26.1445, lng: 91.7362 },
  Bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  Ranchi: { lat: 23.3441, lng: 85.3096 },
  Raipur: { lat: 21.2514, lng: 81.6296 },
  Mysuru: { lat: 12.2958, lng: 76.6394, aliases: ["mysore"] },
};

export const CITY_NAMES = Object.keys(CITIES).sort();

export function resolveCity(input?: string | null): { name: string; lat: number; lng: number } | null {
  if (!input) return null;
  const q = input.toLowerCase().trim();
  for (const [name, c] of Object.entries(CITIES)) {
    if (name.toLowerCase() === q || c.aliases?.includes(q)) return { name, lat: c.lat, lng: c.lng };
  }
  return null;
}

/** Find a known city mentioned anywhere in free text. */
export function findCityInText(text: string) {
  const t = ` ${text.toLowerCase()} `;
  for (const [name, c] of Object.entries(CITIES)) {
    for (const k of [name.toLowerCase(), ...(c.aliases ?? [])]) {
      if (new RegExp(`[^a-z]${k.replace(/ /g, "\\s+")}[^a-z]`).test(t)) return { name, lat: c.lat, lng: c.lng };
    }
  }
  return null;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
