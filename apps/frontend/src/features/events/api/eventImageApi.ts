import { api } from "@/lib/api-client"

import { eventDetailSchema, type EventDetail } from "@/features/events/api/eventSchemas"

/** What the form wants done with the event's own image (#77). */
export type EventImageChange = { kind: "keep" } | { kind: "set"; file: File } | { kind: "remove" }

const imagePath = (eventId: string) => `events/${encodeURIComponent(eventId)}/image`

/** PUT /api/events/:id/image — sets or replaces it; answers with the detail. */
export async function uploadEventImage(eventId: string, file: File): Promise<EventDetail> {
  const body = new FormData()
  body.append("image", file)
  return eventDetailSchema.parse(await api.put(imagePath(eventId), { body }).json())
}

/** DELETE /api/events/:id/image — the activity's photo shows again. */
export async function removeEventImage(eventId: string): Promise<EventDetail> {
  return eventDetailSchema.parse(await api.delete(imagePath(eventId)).json())
}

/** Carries the change out; null when there was nothing to do. */
export async function applyEventImageChange(
  eventId: string,
  change: EventImageChange,
): Promise<EventDetail | null> {
  switch (change.kind) {
    case "set":
      return uploadEventImage(eventId, change.file)
    case "remove":
      return removeEventImage(eventId)
    case "keep":
      return null
  }
}
