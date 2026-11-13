import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { myEventRatingSchema } from "./ratingSchemas"

// The user's own rating: keyed by who is signed in, as other private data (profileKeys).
export const ratingKeys = {
  all: () => ["ratings"] as const,
  mine: (eventId: string, viewerId: string) => [...ratingKeys.all(), eventId, viewerId] as const,
}

/** GET /api/events/:id/rating — the rating, the event as the page shows it, and until when. */
export const myEventRatingQueryOptions = (eventId: string, viewerId: string) =>
  queryOptions({
    queryKey: ratingKeys.mine(eventId, viewerId),
    queryFn: async () =>
      myEventRatingSchema.parse(
        await api.get(`events/${encodeURIComponent(eventId)}/rating`).json(),
      ),
    // 403 and 404 are answers (not the participant, no such event), not hiccups to retry
    retry: false,
  })
