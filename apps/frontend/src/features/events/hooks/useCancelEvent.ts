import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventDetailSchema } from "@/features/events/api/eventSchemas"
import { eventKeys } from "@/features/events/api/eventsQueryOptions"

/** POST /api/events/:id/cancel — the event leaves the list and the map (#52). */
export function useCancelEvent(eventId: string, viewerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (reason: string) =>
      eventDetailSchema.parse(
        await api.post(`events/${encodeURIComponent(eventId)}/cancel`, { json: { reason } }).json(),
      ),
    onSuccess: (event) => {
      queryClient.setQueryData(eventKeys.detail(eventId, viewerId), event)
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
  })
}
