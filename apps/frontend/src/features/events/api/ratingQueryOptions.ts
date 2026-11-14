import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  myEventRatingSchema,
  participantRatingsSchema,
  receivedRatingsSchema,
} from "./ratingSchemas"

// Keyed by who is signed in, as other private data (profileKeys). Each kind has its own segment,
// so invalidating one never reaches the others by prefix (review #322).
export const ratingKeys = {
  all: () => ["ratings"] as const,
  mine: (eventId: string, viewerId: string) =>
    [...ratingKeys.all(), "mine", eventId, viewerId] as const,
  participants: (eventId: string, viewerId: string) =>
    [...ratingKeys.all(), "participants", eventId, viewerId] as const,
  received: (eventId: string, viewerId: string) =>
    [...ratingKeys.all(), "received", eventId, viewerId] as const,
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

/** GET /api/events/:id/participant-ratings — the organizer rates the participants (D-05). */
export const participantRatingsQueryOptions = (eventId: string, viewerId: string) =>
  queryOptions({
    queryKey: ratingKeys.participants(eventId, viewerId),
    queryFn: async () =>
      participantRatingsSchema.parse(
        await api.get(`events/${encodeURIComponent(eventId)}/participant-ratings`).json(),
      ),
    retry: false,
  })

/** GET /api/events/:id/ratings — what the event got, for who manages it (B-060). */
export const receivedRatingsQueryOptions = (eventId: string, viewerId: string) =>
  queryOptions({
    queryKey: ratingKeys.received(eventId, viewerId),
    queryFn: async () =>
      receivedRatingsSchema.parse(
        await api.get(`events/${encodeURIComponent(eventId)}/ratings`).json(),
      ),
    retry: false,
  })
