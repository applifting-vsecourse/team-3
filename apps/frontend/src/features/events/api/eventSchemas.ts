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

/** Query parameters of GET /api/events, already resolved to ids. */
export type EventFilters = {
  localityId?: string
  dateFrom?: string
  dateTo?: string
  activityIds: string[]
  categoryIds: string[]
  missingOnly: boolean
}
