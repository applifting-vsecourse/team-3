import { z } from "zod"

import { localitySchema } from "@/lib/catalog/catalogSchemas"
import { nameSchema } from "@/lib/validation/name"

export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  hasPassword: z.boolean(),
  homeLocality: localitySchema.nullable(),
  interests: z.array(z.object({ id: z.string(), name: z.string() })),
})
export type SelfProfile = z.infer<typeof profileSchema>
export const profileInputSchema = z.object({
  name: nameSchema,
  homeLocalityId: z.string().nullable(),
  interestIds: z.array(z.string()).max(50, "Vyber nejvýš 50 zájmů."),
})
export type ProfileInput = z.infer<typeof profileInputSchema>
const profileEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullable(),
  status: z.enum(["published", "cancelled"]),
  localityName: z.string(),
  participation: z.enum(["approved", "pending"]).nullable(),
})
export type ProfileEvent = z.infer<typeof profileEventSchema>
const ratingSchema = z.object({
  id: z.string(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  createdAt: z.coerce.date(),
  event: z.object({ id: z.string(), title: z.string() }),
  author: z.object({ id: z.string(), name: z.string() }),
})
export type ProfileRating = z.infer<typeof ratingSchema>
const summarySchema = z.object({
  average: z.number().nullable(),
  count: z.number().int().nonnegative(),
})
export type RatingSummary = z.infer<typeof summarySchema>
// Each list is the first few items only; the totals count all of them (#178).
export const profileOverviewSchema = z.object({
  organizing: z.array(profileEventSchema),
  organizingTotal: z.number().int().nonnegative(),
  upcoming: z.array(profileEventSchema),
  upcomingTotal: z.number().int().nonnegative(),
  past: z.array(profileEventSchema),
  pastTotal: z.number().int().nonnegative(),
  participantRatings: z.array(ratingSchema),
  organizerRatings: z.array(ratingSchema),
  participantSummary: summarySchema,
  organizerSummary: summarySchema,
})
export type ProfileOverviewData = z.infer<typeof profileOverviewSchema>
