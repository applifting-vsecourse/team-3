import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventDetailSchema, type EventDetail } from "@/features/events/api/eventSchemas"
import { eventKeys } from "@/features/events/api/eventsQueryOptions"

/**
 * Joining and leaving an event (B-032). Both answer with the detail as the
 * user now sees it; it replaces the cached one, and the list and map refetch
 * so their „Chybí X“ follows.
 */
function useParticipationMutation<Variables = void>(
  eventId: string,
  viewerId: string,
  send: (variables: Variables) => Promise<unknown>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (variables: Variables): Promise<EventDetail> =>
      eventDetailSchema.parse(await send(variables)),
    onSuccess: async (event) => {
      // a waiting request asks for the detail every few seconds: an answer
      // still on its way may be from before this change and mustn't replace it
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(eventId, viewerId) })
      queryClient.setQueryData(eventKeys.detail(eventId, viewerId), event)
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
      // the organizer joining their own event shows up on the management page
      void queryClient.invalidateQueries({ queryKey: eventKeys.participants(eventId, viewerId) })
    },
    // A refusal (e.g. someone else took the last place) means the cached
    // detail is out of date: refetch it, so „Přijdu“ turns into „Plno“.
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId, viewerId) })
    },
  })
}

/**
 * POST /api/events/:id/participation; a request may carry a message for
 * the organizer (#175), joining at once sends none.
 */
export const useJoinEvent = (eventId: string, viewerId: string) =>
  useParticipationMutation(eventId, viewerId, (message?: string | null) =>
    api
      .post(`events/${encodeURIComponent(eventId)}/participation`, {
        json: message ? { message } : {},
      })
      .json(),
  )

/** DELETE /api/events/:id/participation */
export const useLeaveEvent = (eventId: string, viewerId: string) =>
  useParticipationMutation(eventId, viewerId, () =>
    api.delete(`events/${encodeURIComponent(eventId)}/participation`).json(),
  )
