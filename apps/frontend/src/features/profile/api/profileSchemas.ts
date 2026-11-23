import { z } from "zod"

import { localitySchema } from "@/lib/catalog/catalogSchemas"
import { nameSchema } from "@/lib/validation/name"

/** As the database's VarChar(500) (B-013, #64). */
export const BIO_MAX_LENGTH = 500

/**
 * Who sees the photo, the bio and the visited events (B-014, #64). Nested:
 * everyone ⊃ friends (friends and organizers of events I apply to) ⊃
 * organizers ⊃ nobody (just me).
 */
export const PROFILE_VISIBILITIES = ["everyone", "friends", "organizers", "nobody"] as const
export const profileVisibilitySchema = z.enum(PROFILE_VISIBILITIES)
export type ProfileVisibility = z.infer<typeof profileVisibilitySchema>

export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  hasPassword: z.boolean(),
  bio: z.string().nullable(),
  // the uploaded photo (#64) at GET /api/images/:key; null = initials
  photoKey: z.string().nullable(),
  visibility: z.object({
    photo: profileVisibilitySchema,
    bio: profileVisibilitySchema,
    pastEvents: profileVisibilitySchema,
  }),
  homeLocality: localitySchema.nullable(),
  interests: z.array(z.object({ id: z.string(), name: z.string() })),
})
export type SelfProfile = z.infer<typeof profileSchema>
export const profileInputSchema = z.object({
  name: nameSchema,
  bio: z
    .string()
    .max(BIO_MAX_LENGTH, `Napiš o sobě nejvýš ${BIO_MAX_LENGTH} znaků.`)
    .nullable()
    .optional(),
  photoVisibility: profileVisibilitySchema.optional(),
  bioVisibility: profileVisibilitySchema.optional(),
  pastEventsVisibility: profileVisibilitySchema.optional(),
  homeLocalityId: z.string().nullable(),
  interestIds: z.array(z.string()).max(50, "Vyber nejvýš 50 zájmů."),
})
export type ProfileInput = z.infer<typeof profileInputSchema>
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
// The latest few ratings only; the summaries count all of them (#178). My events are in Moje (#367).
export const profileOverviewSchema = z.object({
  participantRatings: z.array(ratingSchema),
  organizerRatings: z.array(ratingSchema),
  participantSummary: summarySchema,
  organizerSummary: summarySchema,
})
export type ProfileOverviewData = z.infer<typeof profileOverviewSchema>
