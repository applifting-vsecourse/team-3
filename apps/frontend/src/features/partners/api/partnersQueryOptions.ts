import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { partnerPageSchema, type PartnerRadius } from "./partnersSchemas"

// private data: keyed by its owner, so nobody else gets it from the cache
export const partnersKeys = {
  all: () => ["partners"] as const,
  deck: (viewerId: string, radiusKm: PartnerRadius) =>
    [...partnersKeys.all(), "deck", viewerId, radiusKm] as const,
}

/**
 * The deck (#84), page by page: the next one is asked for while five cards are still left, so
 * nobody waits between cards. A page ends where its last card is in the order, not at an offset.
 */
export const partnerDeckQueryOptions = (viewerId: string, radiusKm: PartnerRadius) =>
  infiniteQueryOptions({
    queryKey: partnersKeys.deck(viewerId, radiusKm),
    queryFn: async ({ pageParam }) =>
      partnerPageSchema.parse(
        await api
          .get("partners/suggestions", {
            searchParams: { radiusKm, ...(pageParam ? { cursor: pageParam } : {}) },
          })
          .json(),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
