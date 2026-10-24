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
  const refreshEvent = () => {
    void queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId, viewerId) })
    void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
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
    onSuccess: (lists) => {
      queryClient.setQueryData(eventKeys.participants(eventId, viewerId), lists)
      refreshEvent()
    },
    // a refusal (full meanwhile, withdrawn, decided in another tab) means the
    // lists on screen are out of date: refetch them
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.participants(eventId, viewerId) })
      refreshEvent()
    },
  })
}
