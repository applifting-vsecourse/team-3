import { z } from "zod"

import { splitSlugs, type Catalog } from "@/lib/catalog/catalogSearch"
import { ALL_LOCALITIES_SLUG, DEFAULT_LOCALITY_SLUG } from "@/lib/catalog/localityOptions"

import type { GroupInput } from "@/features/groups/api/groupSchemas"

const SLUG = /^[a-z0-9-]+$/

/**
 * /skupiny/nova?aktivita=komunitni-zahrada&lokalita=novy-bor: the form starts with what the
 * list didn't find (Figma A-07e, UX audit U3). A malformed value is dropped (`.catch`).
 */
export const newGroupSearchSchema = z.object({
  aktivita: z.string().regex(SLUG).optional().catch(undefined),
  lokalita: z.string().regex(SLUG).optional().catch(undefined),
})

export type NewGroupSearch = z.infer<typeof newGroupSearchSchema>

/** The form's starting activity and locality; slugs the catalog doesn't know are left out. */
export function newGroupPrefill(search: NewGroupSearch, catalog: Catalog): Partial<GroupInput> {
  const activity = catalog.categories
    .flatMap((category) => category.activities)
    .find((a) => a.slug === search.aktivita)
  const locality = catalog.localities.find((l) => l.slug === search.lokalita)
  return {
    ...(activity ? { activityId: activity.id } : {}),
    ...(locality ? { localityId: locality.id } : {}),
  }
}

/**
 * Where „Založit skupinu“ in an empty list leads: the one activity and the locality picked,
 * so the form starts with them. Without a locality in the URL the list shows the default one,
 * so that is the one filled in (review #269). Several activities, a whole category or the
 * whole country leave that field to choose.
 */
export function newGroupSearchFrom(search: {
  aktivita?: string
  lokalita?: string
}): NewGroupSearch {
  const activities = splitSlugs(search.aktivita)
  const lokalita = search.lokalita ?? DEFAULT_LOCALITY_SLUG
  return {
    ...(activities.length === 1 ? { aktivita: activities[0] } : {}),
    ...(lokalita !== ALL_LOCALITIES_SLUG ? { lokalita } : {}),
  }
}
