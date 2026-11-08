import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventMessageSchema, type EventMessageInput } from "@/features/events/api/eventSchemas"
import { eventKeys } from "@/features/events/api/eventsQueryOptions"

/**
 * „Napsat účastníkům“ (#176, Figma D-04): only the organizer; the approved
 * participants get it by e-mail. The event's messages refetch, with what is
 * left of today's limit.
 */
export function useSendEventMessage(eventId: string, viewerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: EventMessageInput) =>
      eventMessageSchema.parse(
        await api.post(`events/${encodeURIComponent(eventId)}/messages`, { json: input }).json(),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: eventKeys.messages(eventId, viewerId) }),
    // a refusal (cancelled elsewhere, the limit reached in another tab) means the
    // cached event and count are out of date: refetch both (messages sit under the detail)
    onError: () => queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId, viewerId) }),
  })
}
