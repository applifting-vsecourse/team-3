import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/events/api/eventsQueryOptions"
import { ratingKeys } from "@/features/events/api/ratingQueryOptions"
import {
  participantRatingsSchema,
  type ParticipantRatingInput,
  type ParticipantRatings,
} from "@/features/events/api/ratingSchemas"

/**
 * PUT /api/events/:id/participant-ratings (#66, D-05): the whole list at once, all or nothing. The
 * answer is the page's new state, or null when it was saved but the answer can't be read — then
 * the list is read again instead of reporting a failure that didn't happen (review #322). The
 * participants' public profiles show the ratings, so the route refreshes them through `onSaved`.
 */
export function useRateParticipants(
  eventId: string,
  viewerId: string,
  onSaved?: () => Promise<void>,
) {
  const queryClient = useQueryClient()
  const participants = ratingKeys.participants(eventId, viewerId)
  return useMutation({
    mutationFn: async (ratings: ParticipantRatingInput[]): Promise<ParticipantRatings | null> => {
      const answer: unknown = await api
        .put(`events/${encodeURIComponent(eventId)}/participant-ratings`, { json: { ratings } })
        .json()
      const view = participantRatingsSchema.safeParse(answer)
      if (!view.success) console.error("Unexpected answer to saving the ratings", view.error)
      return view.success ? view.data : null
    },
    onSuccess: (view) => {
      if (view) queryClient.setQueryData(participants, view)
      else void queryClient.invalidateQueries({ queryKey: participants })
      // what shows how the event went and who came, as after the participant's rating
      void queryClient.invalidateQueries({ queryKey: eventKeys.all() })
      void onSaved?.()
    },
    // refused (e.g. the window closed meanwhile): the page shows why from a fresh read
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: participants })
    },
  })
}
