import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  eventDetailSchema,
  eventParticipantsSchema,
  publicEventsSchema,
  type EventFilters,
} from "@/features/events/api/eventSchemas"

export const eventKeys = {
  all: () => ["events"] as const,
  lists: () => [...eventKeys.all(), "list"] as const,
  list: (filters: EventFilters | undefined) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all(), "detail"] as const,
  // The viewer is part of the key: a signed-in user gets the participants'
  // names, a visitor only their count.
  detail: (eventId: string, viewerId: string | null) =>
    [...eventKeys.details(), eventId, viewerId] as const,
  // the organizer's list (#43); with the viewer, so nobody else gets it from the cache
  participants: (eventId: string, viewerId: string | null) =>
    [...eventKeys.all(), "participants", eventId, viewerId] as const,
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

/** `viewerId` is undefined until the session is known, so the right variant is fetched. */
export const eventDetailQueryOptions = (eventId: string, viewerId: string | null | undefined) =>
  queryOptions({
    queryKey: eventKeys.detail(eventId, viewerId ?? null),
    queryFn:
      viewerId === undefined
        ? skipToken
        : async () =>
            eventDetailSchema.parse(await api.get(`events/${encodeURIComponent(eventId)}`).json()),
  })

/**
 * Who is in and who is waiting, for the management page (#43, #53). Only the
 * organizer may ask (the API answers anyone else 403), so the page asks once
 * the detail says so.
 */
export const eventParticipantsQueryOptions = (
  eventId: string,
  viewerId: string | null | undefined,
  isOrganizer: boolean,
) =>
  queryOptions({
    queryKey: eventKeys.participants(eventId, viewerId ?? null),
    queryFn: isOrganizer
      ? async () =>
          eventParticipantsSchema.parse(
            await api.get(`events/${encodeURIComponent(eventId)}/participants`).json(),
          )
      : skipToken,
  })
