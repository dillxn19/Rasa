export interface Coords {
  lat: number;
  lng: number;
}

/** Great-circle distance in kilometres between two lat/lng points (haversine). */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371; // earth radius km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Human-friendly distance label, e.g. "450 m" / "2.3 km". Null coords → null. */
export function formatDistance(
  from: Coords | null,
  toLat: number | null | undefined,
  toLng: number | null | undefined,
): string | null {
  if (!from || toLat == null || toLng == null) return null;
  const km = distanceKm(from, { lat: toLat, lng: toLng });
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
