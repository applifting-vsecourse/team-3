import { z } from "zod"

import {
  catalogSearchShape,
  hasCatalogFilters,
  toCatalogFilters,
  type Catalog,
} from "@/lib/catalog/catalogSearch"

import type { EventFilters } from "@/features/events/api/eventSchemas"

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** ?obsazenost= values; Czech in the URL like the other filters, English in the API. */
export const OCCUPANCY = ["volna", "chybi"] as const
export type Occupancy = (typeof OCCUPANCY)[number]
const CAPACITY_OF = { volna: "free", chybi: "missing" } as const

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
})

export type EventsSearch = z.infer<typeof eventsSearchSchema>

/** Whether „Zrušit vše“ has anything to clear. Praha is the default, not a filter. */
export const hasActiveFilters = (search: EventsSearch): boolean =>
  hasCatalogFilters(search) ||
  search.od !== undefined ||
  search.do !== undefined ||
  search.obsazenost !== undefined

/**
 * Turns the URL's slugs into the API's ids. Slugs the catalog doesn't know
 * (an old link, a typo) are left out instead of matching nothing.
 */
export function toEventFilters(search: EventsSearch, catalog: Catalog): EventFilters {
  // An inverted range in a hand-edited URL would be a 400; keep just the start.
  const dateTo = search.od && search.do && search.do < search.od ? undefined : search.do

  return {
    ...toCatalogFilters(search, catalog),
    dateFrom: search.od,
    dateTo,
    capacity: search.obsazenost && CAPACITY_OF[search.obsazenost],
  }
}
