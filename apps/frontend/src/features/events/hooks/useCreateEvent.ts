import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { createdEventSchema, type EventInput } from "@/features/events/api/eventSchemas"
import { eventKeys } from "@/features/events/api/eventsQueryOptions"

/** POST /api/events. The new event is at once in the list and on the map (#40). */
export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: EventInput) =>
      createdEventSchema.parse(await api.post("events", { json: input }).json()),
    onSuccess: (event) => {
      // the organizer opens the detail next; it is what they would fetch
      queryClient.setQueryData(eventKeys.detail(event.id, event.organizer.id), event)
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
  })
}
