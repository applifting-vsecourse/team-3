import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const person = z.object({ id: z.string(), name: z.string() })
const summary = z.object({
  average: z.number().min(1).max(5).nullable(),
  count: z.number().int().nonnegative(),
})
/**
 * An event of „Kam jde“ (#307) as GET /api/events sends it — what the event cards show. The
 * events feature's schema can't be imported here (one feature imports only itself); the route
 * hands these to its EventCard, so the compiler keeps the two shapes in step.
 */
const upcomingEventSchema = z.object({
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
    category: z.object({ id: z.string(), slug: z.string(), name: z.string(), icon: z.string() }),
  }),
  locality: z.object({ id: z.string(), slug: z.string(), name: z.string() }),
  organizer: person,
  group: person.nullable(),
  minParticipants: z.number(),
  maxParticipants: z.number(),
  approvedCount: z.number(),
  missingToMin: z.number(),
  freeSpots: z.number(),
  isFull: z.boolean(),
  isPromoted: z.boolean(),
  summary: z.string().nullable(),
  distanceKm: z.number().nullable(),
  imageKey: z.string().nullish(),
})
export type PublicUpcomingEvent = z.infer<typeof upcomingEventSchema>

/** A past event as its card shows it (#179): organised by the person, or one they went to (#64). */
const pastEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable(),
  localityName: z.string(),
  activityName: z.string(),
  // what the past event card shows (#179): the photo by the activity, the place
  address: z.string(),
  locality: z.object({ id: z.string(), slug: z.string(), name: z.string() }),
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
  approvedCount: z.number().int().nonnegative(),
  // above 0 it didn't take place: „Nekonalo se“ on the card, as on its detail (review #323)
  missingToMin: z.number().int().nonnegative(),
  rating: summary,
})

export const publicProfileSchema = person.extend({
  interests: z.array(person),
  participantSummary: summary,
  organizerSummary: summary,
  eventSummary: summary,
  participantRatings: z.array(
    z.object({
      id: z.string(),
      stars: z.number().int().min(1).max(5),
      comment: z.string().nullable(),
      createdAt: z.coerce.date(),
      author: person.nullable(),
      event: z.object({ id: z.string(), title: z.string() }),
    }),
  ),
  organizedEvents: z.array(pastEventSchema),
  /**
   * What the person shows to whom (B-014, #64): about me, the uploaded photo at
   * GET /api/images/:key and the events they went to. Null = empty or not for this viewer.
   */
  bio: z.string().nullable(),
  photoKey: z.string().nullable(),
  pastEvents: z.array(pastEventSchema).nullable(),
  /**
   * How the signed-in viewer stands to the person (#307): friends; outgoing — my request waits,
   * also after a silent rejection; incoming — theirs waits for me; none; self. Null for a visitor.
   */
  friendship: z.enum(["none", "outgoing", "incoming", "friends", "self"]).nullable(),
  /** „Kam jde“, for a friend only (at most 3 they could see themselves); null for anyone else. */
  upcomingEvents: z.array(upcomingEventSchema).nullable(),
})
export type PublicProfile = z.infer<typeof publicProfileSchema>
export type PublicSummary = PublicProfile["participantSummary"]
export type PublicOrganizedEvent = PublicProfile["organizedEvents"][number]
export type PublicFriendship = PublicProfile["friendship"]

export const publicUserKeys = {
  all: () => ["public-users"] as const,
  person: (userId: string) => [...publicUserKeys.all(), userId] as const,
  // the viewer is in the key (#307): the friendship and Kam jde are theirs, a visitor gets neither
  profile: (userId: string, viewerId: string | null) =>
    [...publicUserKeys.person(userId), viewerId ?? "visitor"] as const,
}

/** The same public projection for everyone, and for a signed-in viewer their friendship (#307). */
export const publicProfileQueryOptions = (userId: string, viewerId: string | null) =>
  queryOptions({
    queryKey: publicUserKeys.profile(userId, viewerId),
    queryFn: async () =>
      publicProfileSchema.parse(await api.get(`users/${encodeURIComponent(userId)}`).json()),
    retry: false,
  })
