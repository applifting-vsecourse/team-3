/** A point on the map, as a locality or a geocoded place has it. */
export type LatLng = { lat: number; lng: number };

/**
 * Great-circle (haversine) distance in km. One formula for the whole backend:
 * the catalog's „same place“ check and the IP table's nearest town (#55).
 */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
