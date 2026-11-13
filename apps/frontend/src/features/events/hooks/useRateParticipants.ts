import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { ratingKeys } from "@/features/events/api/ratingQueryOptions"
import {
  participantRatingsSchema,
  type ParticipantRatingInput,
  type ParticipantRatings,
} from "@/features/events/api/ratingSchemas"

/**
 * PUT /api/events/:id/participant-ratings (#66, D-05): the whole list at once, all or nothing. The
 * answer is the page's new state; the participants' public profiles show the ratings, so the route
 * refreshes them through `onSaved`.
 */
export function useRateParticipants(
  eventId: string,
  viewerId: string,
  onSaved?: () => Promise<void>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ratings: ParticipantRatingInput[]): Promise<ParticipantRatings> =>
      participantRatingsSchema.parse(
        await api
          .put(`events/${encodeURIComponent(eventId)}/participant-ratings`, { json: { ratings } })
          .json(),
      ),
    onSuccess: (view) => {
      queryClient.setQueryData(ratingKeys.participants(eventId, viewerId), view)
      void onSaved?.()
    },
    // refused (e.g. the window closed meanwhile): the page shows why from a fresh read
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ratingKeys.participants(eventId, viewerId) })
    },
  })
}
