import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { publicEventsSchema, type EventFilters } from "@/features/events/api/eventSchemas"

export const eventKeys = {
  all: () => ["events"] as const,
  lists: () => [...eventKeys.all(), "list"] as const,
  list: (filters: EventFilters | undefined) => [...eventKeys.lists(), filters] as const,
}

// Repeated keys (activityId=a&activityId=b) — the API doesn't take activityId[].
export const toSearchParams = (filters: EventFilters): URLSearchParams => {
  const params = new URLSearchParams()
  if (filters.localityId) params.set("localityId", filters.localityId)
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
  if (filters.dateTo) params.set("dateTo", filters.dateTo)
  for (const id of filters.activityIds) params.append("activityId", id)
  for (const id of filters.categoryIds) params.append("categoryId", id)
  if (filters.capacity) params.set("capacity", filters.capacity)
  return params
}

/** `filters` is undefined until the catalog has resolved the URL's slugs to ids. */
export const eventsQueryOptions = (filters: EventFilters | undefined) =>
  queryOptions({
    queryKey: eventKeys.list(filters),
    queryFn: filters
      ? async () =>
          publicEventsSchema.parse(
            await api.get("events", { searchParams: toSearchParams(filters) }).json(),
          )
      : skipToken,
    // Keep the current list on screen while a changed filter loads.
    placeholderData: keepPreviousData,
  })
