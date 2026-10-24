import { z } from "zod"

export const GROUP_TYPES = ["public", "closed"] as const
export type GroupType = (typeof GROUP_TYPES)[number]

// Same limits as the API (CreateGroupDto), so the form says so before the server does.
export const GROUP_NAME_MAX_LENGTH = 80
export const GROUP_DESCRIPTION_MAX_LENGTH = 2000

export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(GROUP_TYPES),
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
  /** Approved members incl. admins; pending requests are not counted. */
  memberCount: z.number(),
})

export const groupsSchema = z.array(groupSchema)

export const groupDetailSchema = groupSchema.extend({
  description: z.string().nullable(),
  status: z.enum(["active", "inactive"]),
  admins: z.array(z.object({ id: z.string(), name: z.string() })),
})

export type Group = z.infer<typeof groupSchema>
export type GroupDetail = z.infer<typeof groupDetailSchema>

/** Query parameters of GET /api/groups, already resolved to ids. */
export type GroupFilters = {
  localityId?: string
  activityIds: string[]
  categoryIds: string[]
}

/** Body of POST /api/groups and PATCH /api/groups/:id (Figma D-06). */
export type GroupInput = {
  name: string
  description: string | null
  activityId: string
  localityId: string
  type: GroupType
}
