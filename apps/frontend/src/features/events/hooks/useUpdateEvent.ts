import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { sendImageChange, type ImageChange } from "@/lib/image"

import { eventDetailSchema, type EventInput } from "@/features/events/api/eventSchemas"
import { eventKeys } from "@/features/events/api/eventsQueryOptions"

/** What an edit sends: not the activity nor the way of joining (#41, D-02). */
export type EventChangesInput = Omit<EventInput, "activityId" | "approvalMode">

type UpdateEventVariables = { changes: EventChangesInput; image?: ImageChange }

/**
 * PATCH /api/events/:id, then the image's change (#77) — the detail and the
 * list show the new values at once. When the image fails, the other changes
 * are saved already; saving again only repeats them.
 */
export function useUpdateEvent(eventId: string, viewerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ changes, image = { kind: "keep" } }: UpdateEventVariables) => {
      const updated = eventDetailSchema.parse(
        await api.patch(`events/${encodeURIComponent(eventId)}`, { json: changes }).json(),
      )
      const answer = await sendImageChange(`events/${encodeURIComponent(eventId)}/image`, image)
      return answer === null ? updated : eventDetailSchema.parse(answer)
    },
    onSuccess: (event) => {
      queryClient.setQueryData(eventKeys.detail(eventId, viewerId), event)
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
    // a refusal (cancelled elsewhere, started, someone joined meanwhile) means
    // the cached detail is out of date: refetch it, so the form knows
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId, viewerId) })
    },
  })
}
