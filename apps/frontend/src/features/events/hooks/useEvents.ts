import { useQuery } from "@tanstack/react-query"

import {
  activityTreeQueryOptions,
  localitiesQueryOptions,
} from "@/features/events/api/catalogQueryOptions"
import { eventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { toEventFilters, type EventsSearch } from "@/features/events/lib/eventsSearch"

/** Localities and the activity tree the filters resolve their slugs with. */
export function useEventsCatalog() {
  const localitiesQuery = useQuery(localitiesQueryOptions())
  const activitiesQuery = useQuery(activityTreeQueryOptions())
  const catalog =
    localitiesQuery.data && activitiesQuery.data
      ? { localities: localitiesQuery.data, categories: activitiesQuery.data }
      : undefined
  return { catalog, queries: [localitiesQuery, activitiesQuery] as const }
}

/**
 * Events for the given URL filters. The list and a filter panel's
 * „Zobrazit N akcí“ preview both use it, so they share the cache.
 */
export function useEvents(search: EventsSearch) {
  const { catalog, queries } = useEventsCatalog()
  const eventsQuery = useQuery(
    eventsQueryOptions(catalog ? toEventFilters(search, catalog) : undefined),
  )
  const all = [...queries, eventsQuery]
  return {
    events: eventsQuery.data,
    catalog,
    isPending: all.some((query) => query.isPending),
    error: all.find((query) => query.error)?.error ?? undefined,
    // Only what failed: a working catalog doesn't need to be fetched again.
    retry: () => {
      for (const query of all) if (query.error) void query.refetch()
    },
  }
}
