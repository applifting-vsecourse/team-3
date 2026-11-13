import { z } from "zod"

import type { MapArea } from "@/components/map/MapView"
import {
  catalogSearchShape,
  hasCatalogFilters,
  toCatalogFilters,
  type Catalog,
} from "@/lib/catalog/catalogSearch"
import { ALL_LOCALITIES_SLUG } from "@/lib/catalog/localityOptions"

import type { EventFilters } from "@/features/events/api/eventSchemas"
import { isoDay, weekendDays } from "@/features/events/lib/homeCopy"

const DAY = /^\d{4}-\d{2}-\d{2}$/
// ?oblast=west,south,east,north — the map's area after „Hledat v této oblasti“ (#56).
// The same shape and limits as the API's `bbox` (backend domain/bounding-box.ts): keep them in step.
const NUMBER = String.raw`-?\d{1,3}(?:\.\d{1,8})?`
const AREA = new RegExp(`^${NUMBER},${NUMBER},${NUMBER},${NUMBER}$`)

/** ?obsazenost= values; Czech in the URL like the other filters, English in the API. */
export const OCCUPANCY = ["volna", "chybi"] as const
export type Occupancy = (typeof OCCUPANCY)[number]
const CAPACITY_OF = { volna: "free", chybi: "missing" } as const

/** ?okoli= km around the chosen locality's centre (#57, Figma A-02gd); none = just the locality. */
export const RADII = ["10", "25", "50"] as const
export type Radius = (typeof RADII)[number]

/**
 * ?vyber= — the quick picks in the band of /akce (#250, Figma A-02d; DESIGN.md › Quick picks).
 * None is „Všechny akce“: the locality, with okolí when it is on.
 */
export const PICKS = [
  "tady-chybis",
  "tento-vikend",
  "podle-zajmu",
  "kousek-od-tebe",
  "od-hodnocenych",
] as const
export type QuickPick = (typeof PICKS)[number]

/** ?razeni= (#57, Figma A-02j); without it soonest first, or nearest first with okolí. */
export const SORTS = ["termin", "vzdalenost"] as const
export type Sort = (typeof SORTS)[number]

/**
 * Filters of /akce in the URL, so a link can be shared and survives a reload:
 * `?lokalita=praha-8&od=2026-10-24&do=2026-10-25&kategorie=hry&aktivita=volejbal,tenis&obsazenost=chybi`.
 * Slugs, not ids, so the link stays readable. A malformed value is dropped
 * rather than failing the page (`.catch`).
 */
export const eventsSearchSchema = z.object({
  ...catalogSearchShape,
  od: z.string().regex(DAY).optional().catch(undefined),
  do: z.string().regex(DAY).optional().catch(undefined),
  // volna = not full yet, chybi = still missing people (a subset of volna)
  obsazenost: z.enum(OCCUPANCY).optional().catch(undefined),
  // a hand-edited area the API would refuse (corners swapped, off the Earth) is dropped, not a 400
  oblast: z
    .string()
    .regex(AREA)
    .refine((oblast) => toMapArea(oblast) !== undefined)
    .optional()
    .catch(undefined),
  // the search (#57); an empty one is no search, the API takes 100 characters
  q: z
    .string()
    .trim()
    .max(100)
    .transform((q) => q || undefined)
    .optional()
    .catch(undefined),
  okoli: z.enum(RADII).optional().catch(undefined),
  razeni: z.enum(SORTS).optional().catch(undefined),
  vyber: z.enum(PICKS).optional().catch(undefined),
})

export type EventsSearch = z.infer<typeof eventsSearchSchema>

/** Whether the URL has a filter for „Zrušit vše“ to clear; a remembered locality is the page's to add (useLocality). */
export const hasActiveFilters = (search: EventsSearch): boolean =>
  hasCatalogFilters(search) ||
  search.od !== undefined ||
  search.do !== undefined ||
  search.obsazenost !== undefined ||
  search.oblast !== undefined ||
  search.q !== undefined ||
  search.okoli !== undefined

/**
 * Turns the URL's slugs into the API's ids. Slugs the catalog doesn't know
 * (an old link, a typo) are left out instead of matching nothing.
 */
export function toEventFilters(search: EventsSearch, catalog: Catalog): EventFilters {
  // An inverted range in a hand-edited URL would be a 400; keep just the start.
  const dateTo = search.od && search.do && search.do < search.od ? undefined : search.do

  const filters = toCatalogFilters(search, catalog)
  const center = localityCenter(search, catalog)
  const radiusKm = search.okoli && center ? Number(search.okoli) : undefined
  const sort = effectiveSort(search, catalog)
  return {
    ...filters,
    // the area replaces the locality: moving the map from Praha to Brno would otherwise find nothing;
    // okolí replaces it too: „do 10 km od středu Prahy 8“ (Figma A-02gd)
    localityId: search.oblast || radiusKm ? undefined : filters.localityId,
    dateFrom: search.od,
    dateTo,
    capacity: search.obsazenost && CAPACITY_OF[search.obsazenost],
    bbox: search.oblast,
    q: search.q,
    // the centre only when something needs it: the circle, or the distance order
    ...(center && (radiusKm || sort === "vzdalenost") ? { lat: center.lat, lng: center.lng } : {}),
    radiusKm,
    sort: sort === "vzdalenost" ? "distance" : undefined,
    ...(search.vyber ? PICK_FLAGS[search.vyber] : {}),
  }
}

/** What a pick asks GET /api/home/events for besides the filters (#250). */
const PICK_FLAGS: Record<
  QuickPick,
  Partial<Record<"interests" | "wellRated" | "notJoined", true>>
> = {
  // Figma A-02d: chybí lidé + okolí + Moje zájmy, without events one already goes to
  "tady-chybis": { interests: true, notJoined: true },
  "tento-vikend": {},
  "podle-zajmu": { interests: true },
  "kousek-od-tebe": {},
  "od-hodnocenych": { wellRated: true },
}

// okolí a pick turns on when none is (Figma A-02gd: „Praha 8 · +10 km“)
const DEFAULT_RADIUS: Radius = "10"

/**
 * The filters a pick sets (Figma A-02d: „Výběr jen nastaví stávající filtry“); its personal
 * parts come with `vyber` itself. `okoli` keeps the one already on.
 */
export function pickPreset(
  pick: QuickPick,
  okoli: Radius | undefined,
  now: Date,
): Partial<EventsSearch> {
  switch (pick) {
    case "tady-chybis":
      return { obsazenost: "chybi", okoli: okoli ?? DEFAULT_RADIUS }
    case "tento-vikend": {
      const { from, to } = weekendDays(now)
      return { od: isoDay(from), do: isoDay(to) }
    }
    case "kousek-od-tebe":
      return { okoli: okoli ?? DEFAULT_RADIUS }
    case "podle-zajmu":
    case "od-hodnocenych":
      return {}
  }
}

const PICK_FILTER_KEYS = [
  "od",
  "do",
  "kategorie",
  "aktivita",
  "obsazenost",
  "oblast",
  "q",
  "okoli",
] as const

/**
 * The URL a pick leads to: the locality and okolí stay, the other filters give way to the
 * pick's. Without a pick „Všechny akce“.
 */
export function pickSearch(
  pick: QuickPick | undefined,
  search: EventsSearch,
  now: Date,
): EventsSearch {
  const base = { lokalita: search.lokalita, okoli: search.okoli }
  return pick ? { ...base, ...pickPreset(pick, search.okoli, now), vyber: pick } : base
}

/** Whether a change touches what the pick set; then the pick no longer holds (Figma A-02d). */
export function changesPick(
  search: EventsSearch,
  patch: Partial<EventsSearch>,
  now: Date,
): boolean {
  if (!search.vyber) return false
  const preset = pickPreset(search.vyber, search.okoli, now)
  return Object.keys(patch).some(
    (key) =>
      key in preset && patch[key as keyof EventsSearch] !== preset[key as keyof EventsSearch],
  )
}

/**
 * „Všechny akce“ is the active tab: no pick and no filter but the locality and its okolí,
 * which hold for every tab (team 4. 11.).
 */
export const isAllEvents = (search: EventsSearch): boolean =>
  !search.vyber && PICK_FILTER_KEYS.every((key) => key === "okoli" || search[key] === undefined)

/** Filters set by hand beyond the pick's: then „Zrušit vše“ has something to clear (#250). */
export function hasFiltersBeyondPick(search: EventsSearch, now: Date): boolean {
  if (!search.vyber) return hasActiveFilters(search)
  const preset = pickPreset(search.vyber, search.okoli, now)
  return PICK_FILTER_KEYS.some((key) => search[key] !== undefined && search[key] !== preset[key])
}

/**
 * The chosen locality's centre, where distances are measured from (#57). None for Celé Česko
 * or a searched map area: then there is no okolí and no distance order (Figma A-02j).
 */
export function localityCenter(
  search: EventsSearch,
  catalog: Catalog,
): { lat: number; lng: number } | undefined {
  if (search.oblast || !search.lokalita || search.lokalita === ALL_LOCALITIES_SLUG) return undefined
  const locality = catalog.localities.find((l) => l.slug === search.lokalita)
  return locality ? { lat: locality.lat, lng: locality.lng } : undefined
}

/**
 * The same filters without the locality and its okolí, nearest to the locality's centre first
 * (#299): what an empty list shows instead of nothing — „V lokalitě … teď nic není, nejbližší
 * akce“. None without a centre (Celé Česko, a searched map area): there is no „nearest“ there.
 */
export function nearestFilters(
  search: EventsSearch,
  catalog: Catalog,
  limit: number,
): EventFilters | undefined {
  const center = localityCenter(search, catalog)
  if (!center) return undefined
  return {
    ...toEventFilters(search, catalog),
    localityId: undefined,
    radiusKm: undefined,
    lat: center.lat,
    lng: center.lng,
    sort: "distance",
    // only what is shown: the API cuts after ordering by distance (review #321)
    limit,
  }
}

/** The order in effect: as picked, else nearest first with okolí; soonest first without a centre. */
export function effectiveSort(search: EventsSearch, catalog: Catalog): Sort {
  if (!localityCenter(search, catalog)) return "termin"
  return search.razeni ?? (search.okoli ? "vzdalenost" : "termin")
}

/** `?oblast=` as the map's area; undefined without one, with corners out of order or off the Earth. */
export function toMapArea(oblast: string | undefined): MapArea | undefined {
  if (!oblast) return undefined
  const [west, south, east, north] = oblast.split(",").map(Number) as [
    number,
    number,
    number,
    number,
  ]
  const isOnEarth =
    [west, east].every((lng) => lng >= -180 && lng <= 180) &&
    [south, north].every((lat) => lat >= -90 && lat <= 90)
  return isOnEarth && west < east && south < north ? { west, south, east, north } : undefined
}

export const toOblast = (area: MapArea): string =>
  [area.west, area.south, area.east, area.north].join(",")
