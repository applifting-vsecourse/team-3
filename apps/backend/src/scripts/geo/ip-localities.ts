export type Town = { slug: string; name: string; lat: number; lng: number };

/** One row of DB-IP's „IP to City Lite“ CSV. */
export type DbIpRow = {
  start: string;
  end: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
};

export type SlugRange = { start: string; end: string; slug: string };

/** A town named like the row's city further than this is another place of the same name. */
const SAME_NAME_MAX_KM = 30;

/**
 * `1.0.0.0,1.0.0.255,OC,AU,Queensland,"South Brisbane",-27.4767,153.017`.
 * Names may be quoted and contain commas.
 */
export function parseDbIpLine(line: string): DbIpRow | null {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  if (fields.length !== 8) return null;
  const [start, end, , country, , city, lat, lng] = fields;
  return { start, end, country, city, lat: Number(lat), lng: Number(lng) };
}

const normalize = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** Great-circle distance in km. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const nearest = (towns: readonly Town[], row: DbIpRow): Town =>
  towns.reduce((best, town) =>
    distanceKm(town, row) < distanceKm(best, row) ? town : best,
  );

/**
 * The catalog town for a row: Prague and its parts („Jinonice (Prague)“,
 * „Stodůlky (Praha 5)“) are Praha, a row named like a town is that town,
 * anything else the nearest town. By name first, because Prague's outskirts
 * lie closer to the centre of a neighbouring town than to Prague's.
 */
export function townFor(row: DbIpRow, towns: readonly Town[]): Town {
  if (/\b(prague|praha)\b/i.test(row.city)) {
    const praha = towns.find((town) => town.slug === 'praha');
    if (praha) return praha;
  }
  const name = normalize(row.city);
  const named = towns.filter((town) => normalize(town.name) === name);
  if (named.length > 0) {
    const best = nearest(named, row);
    if (distanceKm(best, row) <= SAME_NAME_MAX_KM) return best;
  }
  return nearest(towns, row);
}

const nextHex = (hex: string): string =>
  (BigInt(`0x${hex}`) + BigInt(1)).toString(16).padStart(hex.length, '0');

/** Neighbouring ranges of the same town as one; the input is sorted. */
export function mergeRanges(ranges: SlugRange[]): SlugRange[] {
  const merged: SlugRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.slug === range.slug &&
      last.end.length === range.start.length &&
      nextHex(last.end) === range.start
    ) {
      last.end = range.end;
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}
