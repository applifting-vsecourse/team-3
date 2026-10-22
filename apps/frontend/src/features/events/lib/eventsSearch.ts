import { z } from "zod"

import type { ActivityCategory, Locality } from "@/features/events/api/catalogSchemas"
import type { EventFilters } from "@/features/events/api/eventSchemas"

/** /akce without ?lokalita= shows Praha; Praha is the default, not an active filter. */
export const DEFAULT_LOCALITY_SLUG = "praha"

const SLUG = /^[a-z0-9-]+$/
const SLUG_LIST = /^[a-z0-9-]+(,[a-z0-9-]+)*$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Filters of /akce in the URL, so a link can be shared and survives a reload:
 * `?lokalita=praha-8&od=2026-10-24&do=2026-10-25&kategorie=hry&aktivita=volejbal,tenis&chybi=1`.
 * Slugs, not ids, so the link stays readable. A malformed value is dropped
 * rather than failing the page (`.catch`).
 */
export const eventsSearchSchema = z.object({
  lokalita: z.string().regex(SLUG).optional().catch(undefined),
  od: z.string().regex(DAY).optional().catch(undefined),
  do: z.string().regex(DAY).optional().catch(undefined),
  // comma-separated slugs; the router would otherwise put a JSON array in the URL
  kategorie: z.string().regex(SLUG_LIST).optional().catch(undefined),
  aktivita: z.string().regex(SLUG_LIST).optional().catch(undefined),
  // the router parses "1" in the URL as the number 1
  chybi: z.literal(1).optional().catch(undefined),
})

export type EventsSearch = z.infer<typeof eventsSearchSchema>

export const splitSlugs = (value: string | undefined): string[] => (value ? value.split(",") : [])

/** Empty list → undefined, so the parameter disappears from the URL. */
export const joinSlugs = (slugs: string[]): string | undefined =>
  slugs.length > 0 ? slugs.join(",") : undefined

/** Whether „Zrušit vše“ has anything to clear. Praha is the default, not a filter. */
export const hasActiveFilters = (search: EventsSearch): boolean =>
  (search.lokalita !== undefined && search.lokalita !== DEFAULT_LOCALITY_SLUG) ||
  search.od !== undefined ||
  search.do !== undefined ||
  search.kategorie !== undefined ||
  search.aktivita !== undefined ||
  search.chybi !== undefined

/**
 * Turns the URL's slugs into the API's ids. Slugs the catalog doesn't know
 * (an old link, a typo) are left out instead of matching nothing.
 */
export function toEventFilters(
  search: EventsSearch,
  catalog: { localities: Locality[]; categories: ActivityCategory[] },
): EventFilters {
  const localitySlug = search.lokalita ?? DEFAULT_LOCALITY_SLUG
  const locality = catalog.localities.find((l) => l.slug === localitySlug)

  const categorySlugs = new Set(splitSlugs(search.kategorie))
  const activitySlugs = new Set(splitSlugs(search.aktivita))
  const categoryIds = catalog.categories.filter((c) => categorySlugs.has(c.slug)).map((c) => c.id)
  const activityIds = catalog.categories
    .flatMap((c) => c.activities)
    .filter((a) => activitySlugs.has(a.slug))
    .map((a) => a.id)

  // An inverted range in a hand-edited URL would be a 400; keep just the start.
  const dateTo = search.od && search.do && search.do < search.od ? undefined : search.do

  return {
    localityId: locality?.id,
    dateFrom: search.od,
    dateTo,
    activityIds,
    categoryIds,
    missingOnly: search.chybi === 1,
  }
}
