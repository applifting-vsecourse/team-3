import { useQuery } from "@tanstack/react-query"

import { useCatalog } from "@/hooks/useCatalog"

import { eventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { toEventFilters, type EventsSearch } from "@/features/events/lib/eventsSearch"

/**
 * Events for the given URL filters. The list and a filter panel's
 * „Zobrazit N akcí“ preview both use it, so they share the cache.
 * `isEnabled: false` (a closed panel) fetches nothing.
 */
export function useEvents(search: EventsSearch, { isEnabled = true } = {}) {
  const { catalog, queries } = useCatalog()
  const eventsQuery = useQuery(
    eventsQueryOptions(catalog && isEnabled ? toEventFilters(search, catalog) : undefined),
  )
  const all = [...queries, eventsQuery]
  return {
    events: eventsQuery.data,
    /** The shown events belong to the previous filters while the new ones load. */
    isPlaceholderData: eventsQuery.isPlaceholderData,
    catalog,
    isPending: all.some((query) => query.isPending),
    error: all.find((query) => query.error)?.error ?? undefined,
    // Only what failed: a working catalog doesn't need to be fetched again.
    retry: () => {
      for (const query of all) if (query.error) void query.refetch()
    },
  }
}
