import { z } from "zod"

/** „+10 / +25 / +50 km“ around my home locality, as the okolí on /akce (#84). */
export const PARTNER_RADII = [10, 25, 50] as const
export type PartnerRadius = (typeof PARTNER_RADII)[number]

const activitySchema = z.object({ id: z.string(), name: z.string(), slug: z.string() })
export type PartnerActivity = z.infer<typeof activitySchema>

/** One card: only what the public profile shows anyway, plus the distance band (#84). */
export const partnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Rounded up to the band: do 2 km, asi 5 / 10 / 25 km, do 50 km. Never the locality. */
  distanceBandKm: z.number().int().positive(),
  /** „Oba vás baví“, in Czech order. */
  sharedInterests: z.array(activitySchema),
  otherInterests: z.array(activitySchema),
  /** „Posílá ti žádost“: „Přidat“ is then the match. */
  hasRequestedMe: z.boolean(),
  /** „3 společní přátelé“: only how many, null below two (#473). Never who. */
  mutualFriendsCount: z.number().int().nonnegative().nullable(),
})
export type Partner = z.infer<typeof partnerSchema>

/** Today's limit of new friendship requests (#84, #473); the plan raises it, never removes it. */
export const requestLimitSchema = z.object({
  /** „Přidat“ left today. */
  left: z.number().int().nonnegative(),
  perDay: z.number().int().positive(),
  /** The next Prague midnight, when `left` is `perDay` again. */
  resetsAt: z.string().datetime({ offset: true }),
  plan: z.enum(["free", "plus"]),
})
export type RequestLimit = z.infer<typeof requestLimitSchema>

/** GET /api/partners/suggestions: one page of the deck, who already asks me first. */
export const partnerPageSchema = z.object({
  items: z.array(partnerSchema),
  /** Null once nobody else is in the radius. */
  nextCursor: z.string().nullable(),
  radiusKm: z.number().int(),
  /** What I still have to do before anyone can be suggested. */
  missing: z.array(z.enum(["onboarding", "locality", "interests"])),
  /** „Ukazovat mě v Najdi parťáka“ is off: who isn't seen sees nobody either. */
  hidden: z.boolean(),
  limit: requestLimitSchema,
})
export type PartnerPage = z.infer<typeof partnerPageSchema>

/** POST /api/partners/:userId/request: `friends` = Je to shoda!, `outgoing` = the request waits. */
export const partnerRequestSchema = z.object({
  state: z.enum(["none", "outgoing", "incoming", "friends", "self"]),
  limit: requestLimitSchema,
})
export type PartnerRequestResult = z.infer<typeof partnerRequestSchema>
