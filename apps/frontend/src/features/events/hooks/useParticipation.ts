import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventDetailSchema, type EventDetail } from "@/features/events/api/eventSchemas"
import { eventKeys } from "@/features/events/api/eventsQueryOptions"

/**
 * Joining and leaving an event (B-032). Both answer with the detail as the
 * user now sees it; it replaces the cached one, and the list and map refetch
 * so their „Chybí X“ follows.
 */
function useParticipationMutation(eventId: string, viewerId: string, send: () => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<EventDetail> => eventDetailSchema.parse(await send()),
    onSuccess: (event) => {
      queryClient.setQueryData(eventKeys.detail(eventId, viewerId), event)
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
    // A refusal (e.g. someone else took the last place) means the cached
    // detail is out of date: refetch it, so „Přijdu“ turns into „Plno“.
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId, viewerId) })
    },
  })
}

/** POST /api/events/:id/participation */
export const useJoinEvent = (eventId: string, viewerId: string) =>
  useParticipationMutation(eventId, viewerId, () =>
    api.post(`events/${encodeURIComponent(eventId)}/participation`).json(),
  )

/** DELETE /api/events/:id/participation */
export const useLeaveEvent = (eventId: string, viewerId: string) =>
  useParticipationMutation(eventId, viewerId, () =>
    api.delete(`events/${encodeURIComponent(eventId)}/participation`).json(),
  )
