import { useContext } from "react"
import { useQueries } from "@tanstack/react-query"

import { useCatalog } from "@/hooks/useCatalog"

import { PUBLIC_EVENTS_LIMIT } from "@/features/events/api/eventSchemas"
import { eventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { EventsViewerContext } from "@/features/events/hooks/useEvents"
import { toEventFilters, type EventsSearch } from "@/features/events/lib/eventsSearch"

/**
 * The count on each quick pick's tab (#250): what the tab would show, so a count always
 * matches its list (okolí included). The same queries as the list, so the active tab's count
 * costs nothing. „200+“ at the API's limit; undefined while it loads.
 */
export function usePickCounts(
  searches: EventsSearch[],
  { isEnabled = true } = {},
): (number | string | undefined)[] {
  const { catalog } = useCatalog()
  const viewerId = useContext(EventsViewerContext)
  const results = useQueries({
    queries: searches.map((search) =>
      eventsQueryOptions(
        catalog && isEnabled ? { ...toEventFilters(search, catalog), viewerId } : undefined,
      ),
    ),
  })
  return results.map((result) => {
    const count = result.isPlaceholderData ? undefined : result.data?.length
    if (count === undefined) return undefined
    return count >= PUBLIC_EVENTS_LIMIT ? `${PUBLIC_EVENTS_LIMIT}+` : count
  })
}
