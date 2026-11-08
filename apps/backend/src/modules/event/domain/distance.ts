import { BoundingBox } from './bounding-box';

export type GeoPoint = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE = 111.32;

/** Great-circle distance in km (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * The rectangle around a circle: what the database can filter by before the
 * exact distance is checked (#57). A little larger than the circle, never smaller.
 */
export function boxAround(center: GeoPoint, radiusKm: number): BoundingBox {
  const dLat = radiusKm / KM_PER_DEGREE;
  const dLng =
    radiusKm / (KM_PER_DEGREE * Math.cos((center.lat * Math.PI) / 180));
  return {
    west: center.lng - dLng,
    south: center.lat - dLat,
    east: center.lng + dLng,
    north: center.lat + dLat,
  };
}
