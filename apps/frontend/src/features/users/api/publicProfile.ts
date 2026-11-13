import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

const person = z.object({ id: z.string(), name: z.string() })
const summary = z.object({
  average: z.number().min(1).max(5).nullable(),
  count: z.number().int().nonnegative(),
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
  organizedEvents: z.array(
    z.object({
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
      rating: summary,
    }),
  ),
})
export type PublicProfile = z.infer<typeof publicProfileSchema>
export type PublicSummary = PublicProfile["participantSummary"]
export type PublicOrganizedEvent = PublicProfile["organizedEvents"][number]

export const publicUserKeys = {
  all: () => ["public-users"] as const,
  profile: (userId: string) => [...publicUserKeys.all(), userId] as const,
}

/** The API returns the same public projection to every visitor. */
export const publicProfileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: publicUserKeys.profile(userId),
    queryFn: async () =>
      publicProfileSchema.parse(await api.get(`users/${encodeURIComponent(userId)}`).json()),
    retry: false,
  })
