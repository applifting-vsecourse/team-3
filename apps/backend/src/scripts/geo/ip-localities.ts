import { distanceKm } from '@/shared/geo/distance';
import { foldText } from '@/shared/text/fold-text';

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

const nearest = (towns: readonly Town[], row: DbIpRow): Town =>
  towns.reduce((best, town) =>
    distanceKm(town, row) < distanceKm(best, row) ? town : best,
  );

/**
 * Prague or a part of it („Jinonice (Prague)“, „Stodůlky (Praha 5)“), not
 * the districts around it: „Černošice (Praha-západ)“ and „Brandýs nad Labem
 * (Praha-východ)“ lie outside Prague (review #274).
 */
const PRAGUE = /\b(prague|praha)\b(?![-\s]*(z[aá]pad|v[yý]chod|west|east))/iu;

/**
 * The catalog town for a row: Prague and its parts are Praha, a row named
 * like a town is that town, anything else the nearest town. By name first,
 * because Prague's outskirts lie closer to the centre of a neighbouring town
 * than to Prague's.
 */
export function townFor(row: DbIpRow, towns: readonly Town[]): Town {
  if (PRAGUE.test(row.city)) {
    const praha = towns.find((town) => town.slug === 'praha');
    if (praha) return praha;
  }
  const name = foldText(row.city.trim());
  const named = towns.filter((town) => foldText(town.name.trim()) === name);
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

/**
 * Widest ranges still guessed (#299): an IPv6 range wider than a /40 (a
 * provider's allocation or a big part of it) or an IPv4 range wider than a /16. DB-IP Lite places such a
 * range at one point — usually the provider's seat — so every customer of a
 * provider landed in one town (Police nad Metují for nearly all of
 * 2a07:bc0::/29). Too coarse to start a list in: no guess,
 * all of Czechia. Judged on DB-IP's own rows, before merging (review #321):
 * neighbouring fine rows of one town merge into a wide range that is still
 * right — Prague's /48s add up to far more than a /40.
 */
const WIDEST_PREFIX = { v4: 16, v6: 40 } as const;

/**
 * Whether a range (fixed-width hex, `ipToHex`) is too wide to say a town: wider
 * than the widest prefix still guessed, a /16 in IPv4 and a /40 in IPv6.
 */
export function isCoarseRange(range: { start: string; end: string }): boolean {
  const isV4 = range.start.length === 8;
  const hostBits = isV4 ? 32 - WIDEST_PREFIX.v4 : 128 - WIDEST_PREFIX.v6;
  const size =
    BigInt(`0x${range.end}`) - BigInt(`0x${range.start}`) + BigInt(1);
  return size > BigInt(2) ** BigInt(hostBits);
}

/**
 * The table's ranges from DB-IP's rows (each with its town): the rows too wide
 * to say a town left out first, then sorted (IPv4 before IPv6, by address) and
 * neighbours of one town merged. Leaving out after merging would drop a city's
 * fine rows together with a provider's wide one (review #321).
 */
export function tableRanges(rows: SlugRange[]): SlugRange[] {
  return mergeRanges(rows.filter((row) => !isCoarseRange(row)).sort(byStart));
}

// IPv4 (8 digits) before IPv6 (32), then by address
const byStart = (a: SlugRange, b: SlugRange): number =>
  a.start.length - b.start.length || (a.start < b.start ? -1 : 1);
