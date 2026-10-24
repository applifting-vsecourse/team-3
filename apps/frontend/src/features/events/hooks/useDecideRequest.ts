import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventParticipantsSchema } from "@/features/events/api/eventSchemas"
import { eventKeys } from "@/features/events/api/eventsQueryOptions"

export type RequestDecision = { userId: string; decision: "approve" | "reject" }

/**
 * POST /api/events/:id/participants/approve | reject (#53), one request at a
 * time. The answer replaces the management lists; the detail and the list
 * refetch, as an approval takes a place.
 */
export function useDecideRequest(eventId: string, viewerId: string) {
  const queryClient = useQueryClient()
  // The mutation stays pending until the detail is back: it says whether the
  // event is full, and until then „Schválit“ would stay clickable after the
  // last place went. The lists (Moje akce, /akce) needn't hold the buttons.
  const refreshEvent = () => {
    void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    return queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId, viewerId) })
  }
  return useMutation({
    mutationFn: async ({ userId, decision }: RequestDecision) =>
      eventParticipantsSchema.parse(
        await api
          .post(`events/${encodeURIComponent(eventId)}/participants/${decision}`, {
            json: { userIds: [userId] },
          })
          .json(),
      ),
    onSuccess: async (lists) => {
      queryClient.setQueryData(eventKeys.participants(eventId, viewerId), lists)
      await refreshEvent()
    },
    // a refusal (full meanwhile, withdrawn, decided in another tab) means the
    // lists on screen are out of date: refetch them
    onError: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.participants(eventId, viewerId) }),
        refreshEvent(),
      ])
    },
  })
}
