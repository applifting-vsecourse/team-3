import { z } from "zod"

import { publicEventSchema } from "@/features/events/api/eventSchemas"

/**
 * Sections of GET /api/home (#182) in the order of the page; the API leaves
 * out a section with nothing in it. `highlight` is the panel „Teď chybí
 * jeden“; a visitor gets `popular`, a signed-in user `interests` instead.
 */
export const HOME_EVENT_SECTION_KEYS = [
  "highlight",
  "missing",
  "weekend",
  "interests",
  "nearby",
  "popular",
  "wellRated",
] as const
export type HomeEventSectionKey = (typeof HOME_EVENT_SECTION_KEYS)[number]

const eventSectionSchema = z.object({
  key: z.enum(HOME_EVENT_SECTION_KEYS),
  events: z.array(publicEventSchema),
})

// The groups are the groups feature's (GET /api/groups' shape): it checks and shows them, the
// page passes them on (features import only themselves, the route puts them together).
const groupsSectionSchema = z.object({
  key: z.literal("groups"),
  groups: z.array(z.unknown()),
})

export const homeSchema = z.object({
  /** The locality the sections are for; null = all of Czechia. */
  locality: z
    .object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      source: z.enum(["query", "profile"]),
    })
    .nullable(),
  sections: z.array(z.union([groupsSectionSchema, eventSectionSchema])),
})

export type Home = z.infer<typeof homeSchema>
export type HomeLocality = NonNullable<Home["locality"]>
export type HomeEventSection = z.infer<typeof eventSectionSchema>
export type HomeGroupsSection = z.infer<typeof groupsSectionSchema>
