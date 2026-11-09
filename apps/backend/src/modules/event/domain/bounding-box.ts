/** The map's visible area („Hledat v této oblasti“, #56): degrees, west/south ≤ east/north. */
export type BoundingBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

const NUMBER = String.raw`-?\d{1,3}(?:\.\d{1,8})?`;
/** `bbox=west,south,east,north`, the GeoJSON order. */
export const BBOX_PATTERN = new RegExp(
  `^${NUMBER},${NUMBER},${NUMBER},${NUMBER}$`,
);

/**
 * `"14.3,50.0,14.6,50.15"` → the box; undefined for anything that is not a
 * box on Earth with its corners in order (no wrapping over the antimeridian:
 * the app is Czech).
 */
export function parseBoundingBox(value: string): BoundingBox | undefined {
  if (!BBOX_PATTERN.test(value)) return undefined;
  const [west, south, east, north] = value.split(',').map(Number);
  const isOnEarth =
    [west, east].every((lng) => lng >= -180 && lng <= 180) &&
    [south, north].every((lat) => lat >= -90 && lat <= 90);
  return isOnEarth && west < east && south < north
    ? { west, south, east, north }
    : undefined;
}
