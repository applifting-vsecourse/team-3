import { z } from "zod"

export const localitySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  // null for a city, the city's id for a district
  parentId: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
})

export const localitiesSchema = z.array(localitySchema)

export const activitySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  keywords: z.array(z.string()),
})

export const activityCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  icon: z.string(),
  activities: z.array(activitySchema),
})

export const activityTreeSchema = z.array(activityCategorySchema)

export type Locality = z.infer<typeof localitySchema>
export type Activity = z.infer<typeof activitySchema>
export type ActivityCategory = z.infer<typeof activityCategorySchema>
