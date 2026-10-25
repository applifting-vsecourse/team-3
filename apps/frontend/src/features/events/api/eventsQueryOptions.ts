import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  eventDetailSchema,
  eventParticipantsSchema,
  myEventsSchema,
  publicEventsSchema,
  type EventFilters,
  type MyEventsTab,
} from "@/features/events/api/eventSchemas"

export const eventKeys = {
  all: () => ["events"] as const,
  lists: () => [...eventKeys.all(), "list"] as const,
  list: (filters: EventFilters | undefined) => [...eventKeys.lists(), filters] as const,
  // under lists(), so joining, leaving, creating, editing and cancelling refresh it too
  mine: (tab: MyEventsTab, viewerId: string) =>
    [...eventKeys.lists(), "mine", tab, viewerId] as const,
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

/**
 * How often a page asks again while it waits for someone else's decision
 * (#53): the organizer's management page for new requests, the requester's
 * detail for the answer. Focus and coming back to the tab refresh too, but two
 * windows side by side never lose sight, so without this neither would move.
 * Only while the tab is visible (TanStack's default).
 */
export const LIVE_REFRESH_MS = 10_000

/**
 * `viewerId` is undefined until the session is known, so the right variant is
 * fetched. Asks again every LIVE_REFRESH_MS while the viewer's own request
 * waits for the organizer, and with `isLive` (the management page) all the
 * time for the organizer, for the capacity. Not for a missing or cancelled event.
 */
export const eventDetailQueryOptions = (
  eventId: string,
  viewerId: string | null | undefined,
  { isLive = false }: { isLive?: boolean } = {},
) =>
  queryOptions({
    queryKey: eventKeys.detail(eventId, viewerId ?? null),
    queryFn:
      viewerId === undefined
        ? skipToken
        : async () =>
            eventDetailSchema.parse(await api.get(`events/${encodeURIComponent(eventId)}`).json()),
    refetchInterval: ({ state }) => {
      // a missing or cancelled event has nothing left to wait for
      if (state.status === "error" || state.data?.status === "cancelled") return false
      const isOrganizer = state.data !== undefined && state.data.organizer.id === viewerId
      return (isLive && isOrganizer) || state.data?.myParticipation === "pending"
        ? LIVE_REFRESH_MS
        : false
    },
  })

/**
 * Who is in and who is waiting, for the management page (#43, #53). Only the
 * organizer may ask (the API answers anyone else 403), so the page asks once
 * the detail says so. While it is open, new requests show up by themselves.
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
    refetchInterval: LIVE_REFRESH_MS,
  })

/** A tab of „Moje akce“ (B-035), soonest first; with the viewer, so nobody else gets it from the cache. */
export const myEventsQueryOptions = (tab: MyEventsTab, viewerId: string) =>
  queryOptions({
    queryKey: eventKeys.mine(tab, viewerId),
    queryFn: async () =>
      myEventsSchema.parse(await api.get("me/events", { searchParams: { tab } }).json()),
  })
