/** A point on the map, as a locality or a geocoded place has it. */
export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const DEGREE = Math.PI / 180;
// about 1 cm: an event exactly on the circle stays in the box despite rounding
const MARGIN_DEGREES = 1e-7;

/**
 * Great-circle (haversine) distance in km. One formula for the whole backend:
 * the catalog's „same place“ check, the IP table's nearest town (#55) and the
 * events' okolí (#57).
 */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = DEGREE;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * The rectangle around a circle: what the database can filter by before the
 * exact distance is checked (#57). Never smaller than the circle.
 */
export function boxAround(
  center: LatLng,
  radiusKm: number,
): { west: number; south: number; east: number; north: number } {
  // on the haversine's sphere: the circle's angle, and how far east and west it
  // reaches, which is a little more than the angle over cos(latitude)
  const angle = radiusKm / EARTH_RADIUS_KM;
  const dLat = angle / DEGREE + MARGIN_DEGREES;
  const dLng =
    Math.asin(Math.min(1, Math.sin(angle) / Math.cos(center.lat * DEGREE))) /
      DEGREE +
    MARGIN_DEGREES;
  return {
    west: center.lng - dLng,
    south: center.lat - dLat,
    east: center.lng + dLng,
    north: center.lat + dLat,
  };
}
