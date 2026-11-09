import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  eventDetailSchema,
  eventMessagesSchema,
  eventParticipantsSchema,
  groupEventsSchema,
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
  // members-only events depend on the viewer's membership (#70): joining or
  // leaving the group changes `membership`, and so the answer
  group: (groupId: string, viewerId: string | null, membership: string | null) =>
    [...eventKeys.lists(), "group", groupId, viewerId, membership] as const,
  details: () => [...eventKeys.all(), "detail"] as const,
  // The viewer is part of the key, and it must stay the user, not just
  // signed-in vs. visitor: whether the names come depends on the viewer's
  // role in this event (organizer, approved, group member; #174), so two
  // signed-in users can get different answers for the same event.
  detail: (eventId: string, viewerId: string | null) =>
    [...eventKeys.details(), eventId, viewerId] as const,
  // under detail(): joining, leaving and cancelling refresh them with the event (#176)
  messages: (eventId: string, viewerId: string | null) =>
    [...eventKeys.detail(eventId, viewerId), "messages"] as const,
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
  if (filters.bbox) params.set("bbox", filters.bbox)
  if (filters.q) params.set("q", filters.q)
  if (filters.lat !== undefined && filters.lng !== undefined) {
    params.set("lat", String(filters.lat))
    params.set("lng", String(filters.lng))
  }
  if (filters.radiusKm) params.set("radiusKm", String(filters.radiusKm))
  if (filters.sort) params.set("sort", filters.sort)
  if (filters.interests) params.set("interests", "true")
  if (filters.wellRated) params.set("wellRated", "true")
  if (filters.notJoined) params.set("notJoined", "true")
  return params
}

/** A quick pick's personal parts need the session: GET /api/home/events (#250). */
export const eventsPath = (filters: EventFilters): string =>
  filters.interests || filters.wellRated || filters.notJoined ? "home/events" : "events"

/** `filters` is undefined until the catalog has resolved the URL's slugs to ids. */
export const eventsQueryOptions = (filters: EventFilters | undefined) =>
  queryOptions({
    queryKey: eventKeys.list(filters),
    queryFn: filters
      ? async () =>
          publicEventsSchema.parse(
            await api.get(eventsPath(filters), { searchParams: toSearchParams(filters) }).json(),
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
      return (isLive && state.data?.canManage) || state.data?.myParticipation === "pending"
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

/**
 * The organizer's messages to the participants (#176). The API answers 403
 * to anyone who doesn't see „Kdo jde“ (#174), so the page asks only when the
 * detail brought the names. The viewer is in the key: the organizer's answer
 * also carries what is left of today's limit.
 */
export const eventMessagesQueryOptions = (
  eventId: string,
  viewerId: string | null | undefined,
  { isEnabled = true } = {},
) =>
  queryOptions({
    queryKey: eventKeys.messages(eventId, viewerId ?? null),
    queryFn:
      isEnabled && viewerId
        ? async () =>
            eventMessagesSchema.parse(
              await api.get(`events/${encodeURIComponent(eventId)}/messages`).json(),
            )
        : skipToken,
  })

/** A tab of „Moje akce“ (B-035), soonest first; with the viewer, so nobody else gets it from the cache. */
export const myEventsQueryOptions = (tab: MyEventsTab, viewerId: string) =>
  queryOptions({
    queryKey: eventKeys.mine(tab, viewerId),
    queryFn: async () =>
      myEventsSchema.parse(await api.get("me/events", { searchParams: { tab } }).json()),
  })

/**
 * A group's upcoming and past events for its page (#70, Figma A-08e).
 * Members-only events come only to its members, so the viewer and their
 * membership's status are in the key; `viewerId` is undefined while the
 * session loads.
 */
export const groupEventsQueryOptions = (
  groupId: string,
  viewerId: string | null | undefined,
  membership: string | null = null,
) =>
  queryOptions({
    queryKey: eventKeys.group(groupId, viewerId ?? null, membership),
    queryFn:
      viewerId === undefined
        ? skipToken
        : async () =>
            groupEventsSchema.parse(
              await api.get(`groups/${encodeURIComponent(groupId)}/events`).json(),
            ),
  })
