import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { activityTreeSchema, localitiesSchema } from "@/lib/catalog/catalogSchemas"

export const catalogKeys = {
  all: () => ["catalog"] as const,
  localities: () => [...catalogKeys.all(), "localities"] as const,
  activities: () => [...catalogKeys.all(), "activities"] as const,
}

// The catalog changes with a deploy, not while someone browses.
const CATALOG_STALE_TIME = 60 * 60 * 1000

/**
 * All localities: without a query the API returns the whole catalog (only a
 * search is capped at 50), so filters can resolve slugs and list them locally.
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
