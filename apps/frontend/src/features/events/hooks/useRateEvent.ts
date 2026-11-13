import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/events/api/eventsQueryOptions"
import { ratingKeys } from "@/features/events/api/ratingQueryOptions"
import {
  myEventRatingSchema,
  type EventRatingInput,
  type MyEventRating,
} from "@/features/events/api/ratingSchemas"

/**
 * PUT /api/events/:id/rating (#66): gives the rating or replaces it. The answer is the page's
 * new state. `onSaved` lets the route refresh what else shows the averages (the profiles):
 * a feature doesn't reach into another one.
 */
export function useRateEvent(eventId: string, viewerId: string, onSaved?: () => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: EventRatingInput): Promise<MyEventRating> =>
      myEventRatingSchema.parse(
        await api.put(`events/${encodeURIComponent(eventId)}/rating`, { json: input }).json(),
      ),
    onSuccess: (rating) => {
      queryClient.setQueryData(ratingKeys.mine(eventId, viewerId), rating)
      // the organizer's or the group's average on the event and the profiles
      void queryClient.invalidateQueries({ queryKey: eventKeys.all() })
      void onSaved?.()
    },
    // refused (e.g. the window closed meanwhile): the page shows why from a fresh read
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ratingKeys.mine(eventId, viewerId) })
    },
  })
}
