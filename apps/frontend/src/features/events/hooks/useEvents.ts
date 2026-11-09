import { createContext, useContext } from "react"
import { useQuery } from "@tanstack/react-query"

import { useCatalog } from "@/hooks/useCatalog"

import { eventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { toEventFilters, type EventsSearch } from "@/features/events/lib/eventsSearch"

/**
 * Who is looking (the session's user id, null for a visitor), set by /akce: a quick pick's
 * personal parts differ per user, so it is part of every events query key (#250). The
 * events feature can't read the session itself (features don't import each other).
 */
export const EventsViewerContext = createContext<string | null>(null)

/**
 * Events for the given URL filters. The list and a filter panel's
 * „Zobrazit N akcí“ preview both use it, so they share the cache.
 * `isEnabled: false` (a closed panel) fetches nothing.
 */
export function useEvents(search: EventsSearch, { isEnabled = true } = {}) {
  const { catalog, queries } = useCatalog()
  const viewerId = useContext(EventsViewerContext)
  const eventsQuery = useQuery(
    eventsQueryOptions(
      catalog && isEnabled ? { ...toEventFilters(search, catalog), viewerId } : undefined,
    ),
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
