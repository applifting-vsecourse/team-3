import { queryOptions, skipToken } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/events/api/eventsQueryOptions"
import { homeSchema } from "@/features/events/api/homeSchemas"

/**
 * A signed-in user's „Podle tvých zájmů“ is a random pick when there is nothing
 * to go by (B-027), drawn anew on every request: without this, coming back to
 * the window would reshuffle the cards under the user's hands (review #263).
 * Joining or leaving an event still refreshes it (the key is under the event
 * lists, which every participation change invalidates).
 */
export const HOME_SIGNED_IN_STALE_TIME = 15 * 60 * 1000

/**
 * While the page's locality is still being resolved (the localities or the session load),
 * the query waits under its own key, so it never shows the cached sections of the default.
 */
export const HOME_LOCALITY_PENDING = "pending"

/**
 * All of Czechia picked on purpose (#299): `?wholeCountry=true`, so the API doesn't put the
 * signed-in user's home locality in its place. Null instead lets the API decide.
 */
export const HOME_WHOLE_COUNTRY = "whole-country"

export const homeKeys = {
  // under the event lists: joining, leaving, creating or cancelling changes the sections too;
  // the groups feature invalidates ["events", "list", "home"] on joining or leaving a group
  all: () => [...eventKeys.lists(), "home"] as const,
  // localityId: an id, null (the API decides), HOME_WHOLE_COUNTRY or HOME_LOCALITY_PENDING
  // (still resolving)
  home: (localityId: string | null, viewerId: string | null) =>
    [...homeKeys.all(), localityId, viewerId] as const,
}

/**
 * GET /api/home (#182): the sections of the landing page, chosen and ordered by
 * the API. `localityId` null lets the API decide (the profile's home locality,
 * else all of Czechia); undefined waits — the page's locality is still being
 * resolved. The viewer is part of the key: a signed-in user gets other
 * sections than a visitor, and never someone else's.
 */
export const homeQueryOptions = (localityId: string | null | undefined, viewerId: string | null) =>
  queryOptions({
    queryKey: homeKeys.home(
      localityId === undefined ? HOME_LOCALITY_PENDING : localityId,
      viewerId,
    ),
    queryFn:
      localityId === undefined
        ? skipToken
        : async () =>
            homeSchema.parse(
              await api.get("home", { searchParams: homeSearchParams(localityId) }).json(),
            ),
    staleTime: viewerId ? HOME_SIGNED_IN_STALE_TIME : 0,
  })

const homeSearchParams = (localityId: string | null): Record<string, string> | undefined =>
  localityId === HOME_WHOLE_COUNTRY
    ? { wholeCountry: "true" }
    : localityId
      ? { localityId }
      : undefined
