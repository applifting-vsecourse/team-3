import { z } from "zod"

import type { ActivitySelection } from "@/lib/catalog/activitySelection"
import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"
import { DEFAULT_LOCALITY_SLUG } from "@/lib/catalog/localityOptions"

const SLUG = /^[a-z0-9-]+$/
const SLUG_LIST = /^[a-z0-9-]+(,[a-z0-9-]+)*$/

/**
 * The catalog filters a list keeps in its URL (/akce, /skupiny):
 * `?lokalita=praha-8&kategorie=hry&aktivita=volejbal,tenis`. Slugs, not ids,
 * so the link stays readable. A malformed value is dropped rather than
 * failing the page (`.catch`).
 */
export const catalogSearchShape = {
  lokalita: z.string().regex(SLUG).optional().catch(undefined),
  // comma-separated slugs; the router would otherwise put a JSON array in the URL
  kategorie: z.string().regex(SLUG_LIST).optional().catch(undefined),
  aktivita: z.string().regex(SLUG_LIST).optional().catch(undefined),
}

export type CatalogSearch = {
  lokalita?: string
  kategorie?: string
  aktivita?: string
}

export type Catalog = { localities: Locality[]; categories: ActivityCategory[] }

export const splitSlugs = (value: string | undefined): string[] => (value ? value.split(",") : [])

/** Empty list → undefined, so the parameter disappears from the URL. */
export const joinSlugs = (slugs: string[]): string | undefined =>
  slugs.length > 0 ? slugs.join(",") : undefined

export const toActivitySelection = (search: CatalogSearch): ActivitySelection => ({
  categories: splitSlugs(search.kategorie),
  activities: splitSlugs(search.aktivita),
})

export const toActivitySearch = (
  selection: ActivitySelection,
): Pick<CatalogSearch, "kategorie" | "aktivita"> => ({
  kategorie: joinSlugs(selection.categories),
  aktivita: joinSlugs(selection.activities),
})

/** Whether any catalog filter is set. Praha is the default, not a filter. */
export const hasCatalogFilters = (search: CatalogSearch): boolean =>
  (search.lokalita !== undefined && search.lokalita !== DEFAULT_LOCALITY_SLUG) ||
  search.kategorie !== undefined ||
  search.aktivita !== undefined

/**
 * Turns the URL's slugs into the API's ids. Slugs the catalog doesn't know
 * (an old link, a typo) are left out instead of matching nothing.
 */
export function toCatalogFilters(
  search: CatalogSearch,
  catalog: Catalog,
): { localityId?: string; activityIds: string[]; categoryIds: string[] } {
  const localitySlug = search.lokalita ?? DEFAULT_LOCALITY_SLUG
  const locality = catalog.localities.find((l) => l.slug === localitySlug)

  const categorySlugs = new Set(splitSlugs(search.kategorie))
  const activitySlugs = new Set(splitSlugs(search.aktivita))
  const categoryIds = catalog.categories.filter((c) => categorySlugs.has(c.slug)).map((c) => c.id)
  const activityIds = catalog.categories
    .flatMap((c) => c.activities)
    .filter((a) => activitySlugs.has(a.slug))
    .map((a) => a.id)

  return { localityId: locality?.id, activityIds, categoryIds }
}
