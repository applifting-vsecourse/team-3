import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { uploadEventImage } from "@/features/events/api/eventImageApi"
import { createdEventSchema, type EventInput } from "@/features/events/api/eventSchemas"
import { eventKeys } from "@/features/events/api/eventsQueryOptions"

type CreateEventVariables = { input: EventInput; image?: File | null }

/**
 * POST /api/events. The new event is at once in the list and on the map (#40).
 * An image picked in the form (#77) is uploaded after it: the event is already
 * published when that fails, so the failure comes back as `imageError`, not as
 * the form's error — sending the form again would publish it twice.
 */
export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, image }: CreateEventVariables) => {
      const created = createdEventSchema.parse(await api.post("events", { json: input }).json())
      if (!image) return { event: created, imageError: null }
      try {
        const detail = await uploadEventImage(created.id, image)
        return { event: { ...created, ...detail }, imageError: null }
      } catch (error) {
        return {
          event: created,
          imageError: error instanceof Error ? error.message : String(error),
        }
      }
    },
    onSuccess: ({ event }) => {
      // the organizer opens the detail next; it is what they would fetch
      queryClient.setQueryData(eventKeys.detail(event.id, event.organizer.id), event)
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
  })
}
