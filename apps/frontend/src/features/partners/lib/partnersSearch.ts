import { z } from "zod"

import { PARTNER_RADII, type PartnerRadius } from "@/features/partners/api/partnersSchemas"

/** The deck starts at +10 km around the home locality and widens on request (#84). */
export const DEFAULT_PARTNER_RADIUS: PartnerRadius = 10

/** `/partaci?okoli=25`: the radius in the URL, as /akce has it; anything else is the default. */
export const partnersSearchSchema = z.object({
  // a typed-in ?okoli=25 arrives as a number, the app's own links as the string "25"
  okoli: z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(z.enum(["10", "25", "50"]))
    .optional()
    .catch(undefined),
})
export type PartnersSearch = z.infer<typeof partnersSearchSchema>

export const radiusFromSearch = ({ okoli }: PartnersSearch): PartnerRadius =>
  PARTNER_RADII.find((radius) => String(radius) === okoli) ?? DEFAULT_PARTNER_RADIUS

/** „Hledat do 25 km“: the next step out, none after the last. */
export const widerRadius = (radius: PartnerRadius): PartnerRadius | undefined =>
  PARTNER_RADII[PARTNER_RADII.indexOf(radius) + 1]
