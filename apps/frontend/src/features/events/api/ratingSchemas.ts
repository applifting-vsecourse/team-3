import { z } from "zod"

// Same limits as the API (RateEventDto, rating-window.ts; B-060).
export const RATING_STARS_MAX = 5
export const RATING_COMMENT_MAX_LENGTH = 500
export const RATING_WINDOW_DAYS = 14

/** Why rating is not possible now; the API answers the others (who asks) with 403. */
export const eventRatingRefusalSchema = z.enum([
  "EVENT_NOT_PUBLISHED",
  "EVENT_NOT_ENDED",
  "EVENT_NOT_HELD",
  "RATING_DELETED",
  "RATING_WINDOW_CLOSED",
])

export type EventRatingRefusal = z.infer<typeof eventRatingRefusalSchema>

/**
 * What the rating page shows of the event: the API sends it with the rating, so the page
 * never reads the event's detail — a former member of the group no longer gets the detail of
 * a members-only event they went to, and still rates it (#66).
 */
const ratedEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable(),
  address: z.string(),
  status: z.enum(["published", "cancelled"]),
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
  /** Who created the event. */
  organizer: z.object({ id: z.string(), name: z.string() }),
  /** For an event of a group the organizer stars count to the group. */
  group: z.object({ id: z.string(), name: z.string() }).nullable(),
  approvedCount: z.number(),
})

export type RatedEvent = z.infer<typeof ratedEventSchema>

/** GET and PUT /api/events/:id/rating (#66). */
export const myEventRatingSchema = z.object({
  event: ratedEventSchema,
  /** Null before rating, and after a superadmin deleted it. */
  rating: z
    .object({
      eventStars: z.number(),
      organizerStars: z.number(),
      comment: z.string().nullable(),
      updatedAt: z.coerce.date(),
    })
    .nullable(),
  /** The last moment to give or change the rating, as the API counts it (B-060). */
  ratableUntil: z.coerce.date(),
  refusal: eventRatingRefusalSchema.nullable(),
})

export type MyEventRating = z.infer<typeof myEventRatingSchema>

export type EventRatingInput = {
  eventStars: number
  organizerStars: number
  comment: string | null
}
