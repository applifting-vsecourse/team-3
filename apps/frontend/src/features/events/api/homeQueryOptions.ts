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

export const homeKeys = {
  // under the event lists: joining, leaving, creating or cancelling changes the sections too
  home: (localityId: string | null, viewerId: string | null) =>
    [...eventKeys.lists(), "home", localityId, viewerId] as const,
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
    queryKey: homeKeys.home(localityId ?? null, viewerId),
    queryFn:
      localityId === undefined
        ? skipToken
        : async () =>
            homeSchema.parse(
              await api
                .get("home", { searchParams: localityId ? { localityId } : undefined })
                .json(),
            ),
    staleTime: viewerId ? HOME_SIGNED_IN_STALE_TIME : 0,
  })
