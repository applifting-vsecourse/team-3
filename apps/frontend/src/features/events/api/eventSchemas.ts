import { z } from "zod"

export const publicEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  activity: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    category: z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      icon: z.string(),
    }),
  }),
  locality: z.object({ id: z.string(), slug: z.string(), name: z.string() }),
  organizer: z.object({ id: z.string(), name: z.string() }),
  group: z.object({ id: z.string(), name: z.string() }).nullable(),
  minParticipants: z.number(),
  maxParticipants: z.number(),
  approvedCount: z.number(),
  missingToMin: z.number(),
  freeSpots: z.number(),
  isFull: z.boolean(),
  isPromoted: z.boolean(),
})

export const publicEventsSchema = z.array(publicEventSchema)

export type PublicEvent = z.infer<typeof publicEventSchema>

const eventParticipantSchema = z.object({ id: z.string(), name: z.string() })

export type EventParticipant = z.infer<typeof eventParticipantSchema>

/** GET /api/events/:id */
export const eventDetailSchema = publicEventSchema.extend({
  description: z.string().nullable(),
  approvalMode: z.enum(["open", "approval"]),
  status: z.enum(["published", "cancelled"]),
  cancelReason: z.string().nullable(),
  /** Approved participants; null for a visitor, who gets only `approvedCount`. */
  participants: z.array(eventParticipantSchema).nullable(),
  /** The signed-in user's own participation; null for a visitor or someone not in. */
  myParticipation: z.enum(["pending", "approved", "rejected", "removed"]).nullable(),
})

export type EventDetail = z.infer<typeof eventDetailSchema>

const eventRequestSchema = eventParticipantSchema.extend({ requestedAt: z.coerce.date() })

export type EventRequest = z.infer<typeof eventRequestSchema>

/** GET /api/events/:id/participants — only for the organizer: who is in and who is waiting (#43, #53). */
export const eventParticipantsSchema = z.object({
  participants: z.array(eventParticipantSchema),
  /** Requests waiting for the organizer, oldest first; always empty without approval. */
  requests: z.array(eventRequestSchema),
})

/** Tabs of „Moje akce“ in the API (B-035); Proběhlé comes with #61. */
export type MyEventsTab = "attending" | "organizing"

/** GET /api/me/events?tab= — an event with the user's place in it. */
export const myEventSchema = publicEventSchema.extend({
  status: z.enum(["published", "cancelled"]),
  myParticipation: z.enum(["approved", "pending"]).nullable(),
  /** Requests waiting for approval; only under `organizing`. */
  pendingRequests: z.number().nullable(),
})

export const myEventsSchema = z.array(myEventSchema)

export type MyEvent = z.infer<typeof myEventSchema>

/** POST /api/events answers with the detail and the link to share (B-021). */
export const createdEventSchema = eventDetailSchema.extend({ shareUrl: z.string() })

// The same limits as the API's CreateEventDto.
export const EVENT_TITLE_MAX_LENGTH = 120
export const EVENT_DESCRIPTION_MAX_LENGTH = 2000
export const EVENT_ADDRESS_MAX_LENGTH = 200
export const EVENT_MAX_PARTICIPANTS = 500

/** The body of POST /api/events. The organizer is the signed-in user, never sent. */
export type EventInput = {
  title: string
  description: string | null
  activityId: string
  localityId: string
  lat: number
  lng: number
  address: string
  startsAt: string
  /** Optional (B-021); null clears it when editing. */
  endsAt: string | null
  minParticipants: number
  maxParticipants: number
  approvalMode: "open" | "approval"
}

/** Query parameters of GET /api/events, already resolved to ids. */
export type EventFilters = {
  localityId?: string
  dateFrom?: string
  dateTo?: string
  activityIds: string[]
  categoryIds: string[]
  /** free: not full yet; missing: still missing people to reach the minimum */
  capacity?: "free" | "missing"
}
