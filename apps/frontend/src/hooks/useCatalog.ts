import { useQuery } from "@tanstack/react-query"

import { activityTreeQueryOptions, localitiesQueryOptions } from "@/lib/catalog/catalogQueryOptions"

/** Localities and the activity tree that filters and forms resolve their slugs and ids with. */
export function useCatalog() {
  const localitiesQuery = useQuery(localitiesQueryOptions())
  const activitiesQuery = useQuery(activityTreeQueryOptions())
  const catalog =
    localitiesQuery.data && activitiesQuery.data
      ? { localities: localitiesQuery.data, categories: activitiesQuery.data }
      : undefined
  return { catalog, queries: [localitiesQuery, activitiesQuery] as const }
}
