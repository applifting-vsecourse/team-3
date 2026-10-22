import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { activityTreeSchema, localitiesSchema } from "@/features/events/api/catalogSchemas"

export const catalogKeys = {
  all: () => ["catalog"] as const,
  localities: () => [...catalogKeys.all(), "localities"] as const,
  activities: () => [...catalogKeys.all(), "activities"] as const,
}

// The catalog changes with a deploy, not while someone browses.
const CATALOG_STALE_TIME = 60 * 60 * 1000

/**
 * All localities. An empty query returns up to 50, which covers the whole
 * catalog today (cities + Praha 1–22), so filters can resolve slugs locally.
 */
export const localitiesQueryOptions = () =>
  queryOptions({
    queryKey: catalogKeys.localities(),
    queryFn: async () => localitiesSchema.parse(await api.get("localities").json()),
    staleTime: CATALOG_STALE_TIME,
  })

export const activityTreeQueryOptions = () =>
  queryOptions({
    queryKey: catalogKeys.activities(),
    queryFn: async () => activityTreeSchema.parse(await api.get("activities").json()),
    staleTime: CATALOG_STALE_TIME,
  })
