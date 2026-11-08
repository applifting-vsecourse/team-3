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
  // the start of the description for the map preview (#56); null without one
  summary: z.string().nullable(),
  // km from the chosen locality's centre when the request gave it (okolí, distance order; #57)
  distanceKm: z.number().nullable(),
})

export const publicEventsSchema = z.array(publicEventSchema)

export type PublicEvent = z.infer<typeof publicEventSchema>

const eventParticipantSchema = z.object({ id: z.string(), name: z.string() })

export type EventParticipant = z.infer<typeof eventParticipantSchema>

/** GET /api/events/:id */
export const eventDetailSchema = publicEventSchema.extend({
  description: z.string().nullable(),
  approvalMode: z.enum(["open", "approval"]),
  /** `private`: through its link only; `members`: only the group's members (B-055). */
  visibility: z.enum(["public", "private", "members"]),
  status: z.enum(["published", "cancelled"]),
  cancelReason: z.string().nullable(),
  /** Approved participants, only for those taking part (#174); null for anyone else, who gets only the occupancy. */
  participants: z.array(eventParticipantSchema).nullable(),
  /** The signed-in user's own participation; null for a visitor or someone not in. */
  myParticipation: z.enum(["pending", "approved", "rejected", "removed"]).nullable(),
  /** Whether the API saw a valid session; false with a cached user = the session expired. */
  viewerSignedIn: z.boolean(),
  /** The organizer or, for a group's event, any of the group's admins (B-055). */
  canManage: z.boolean(),
})

export type EventDetail = z.infer<typeof eventDetailSchema>

// Same limits as the API (CreateEventMessageDto, #176).
export const MESSAGE_SUBJECT_MAX_LENGTH = 120
export const MESSAGE_BODY_MAX_LENGTH = 2000

export const eventMessageSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  createdAt: z.coerce.date(),
  sender: z.object({ id: z.string(), name: z.string() }),
})

/** GET /api/events/:id/messages, only for those who see „Kdo jde“ (#174, #176). */
export const eventMessagesSchema = z.object({
  /** Newest first. */
  messages: z.array(eventMessageSchema),
  /** All the event's messages; the list holds only the latest 50. */
  total: z.number(),
  /** How many more the viewer may send today; null unless they are the organizer of a published event. */
  remainingToday: z.number().nullable(),
})

export type EventMessage = z.infer<typeof eventMessageSchema>
export type EventMessages = z.infer<typeof eventMessagesSchema>

/** Body of POST /api/events/:id/messages (Figma D-04). */
export type EventMessageInput = { subject: string; body: string }

const eventRequestSchema = eventParticipantSchema.extend({
  requestedAt: z.coerce.date(),
  /** The applicant's message to the organizer (#175); only the organizer gets it. */
  message: z.string().nullable(),
})

export type EventRequest = z.infer<typeof eventRequestSchema>

/** GET /api/events/:id/participants — only for the organizer: who is in and who is waiting (#43, #53). */
export const eventParticipantsSchema = z.object({
  participants: z.array(eventParticipantSchema),
  /** Requests waiting for the organizer, oldest first; always empty without approval. */
  requests: z.array(eventRequestSchema),
})

/**
 * Tabs of „Moje akce“ in the API (B-035); `organizing` has the events of the
 * groups I run too (#70). Proběhlé comes with #61.
 */
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

/** An event on its group's page (B-055): members-only ones are marked. */
export const groupEventSchema = publicEventSchema.extend({
  visibility: z.enum(["public", "members"]),
})

export type GroupEvent = z.infer<typeof groupEventSchema>

/** GET /api/groups/:id/events — upcoming soonest first, past the latest first (Figma A-08e). */
export const groupEventsSchema = z.object({
  upcoming: z.array(groupEventSchema),
  past: z.array(groupEventSchema),
})

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
  /** A group's event (B-055), created by one of its admins; only when creating. */
  groupId?: string
  /** `members`: only the group's members see it and join it; only with `groupId`. */
  visibility?: "public" | "members"
}

/**
 * GET /api/events returns at most this many (backend PUBLIC_EVENTS_LIMIT): a list this long
 * may have more, so it says „Víc než 200 akcí“ (Figma A-02 · celé Česko, comment in #55).
 */
export const PUBLIC_EVENTS_LIMIT = 200

/** Query parameters of GET /api/events, already resolved to ids. */
export type EventFilters = {
  localityId?: string
  dateFrom?: string
  dateTo?: string
  activityIds: string[]
  categoryIds: string[]
  /** free: not full yet; missing: still missing people to reach the minimum */
  capacity?: "free" | "missing"
  /** „Hledat v této oblasti“ (#56): west,south,east,north */
  bbox?: string
  /** Words in the title or the activity's keywords, without diacritics (#57). */
  q?: string
  /** The point distances are measured from: the chosen locality's centre (#57). */
  lat?: number
  lng?: number
  /** „Okolí +10 km“: at most this far from lat,lng (#57). */
  radiusKm?: number
  /** Nearest to lat,lng first (#57); soonest first without it. */
  sort?: "distance"
}
