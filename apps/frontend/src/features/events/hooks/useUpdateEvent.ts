import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventDetailSchema, type EventInput } from "@/features/events/api/eventSchemas"
import { eventKeys } from "@/features/events/api/eventsQueryOptions"

/** What an edit sends: not the activity nor the way of joining (#41, D-02). */
export type EventChangesInput = Omit<EventInput, "activityId" | "approvalMode">

/** PATCH /api/events/:id — the detail and the list show the new values at once. */
export function useUpdateEvent(eventId: string, viewerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (changes: EventChangesInput) =>
      eventDetailSchema.parse(
        await api.patch(`events/${encodeURIComponent(eventId)}`, { json: changes }).json(),
      ),
    onSuccess: (event) => {
      queryClient.setQueryData(eventKeys.detail(eventId, viewerId), event)
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
  })
}
