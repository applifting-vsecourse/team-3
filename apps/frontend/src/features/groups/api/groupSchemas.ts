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

export const membershipSchema = z.object({
  role: z.enum(["admin", "member"]),
  // blocked: set by an admin (#63), the user can't join again
  status: z.enum(["pending", "active", "blocked"]),
})

export const groupDetailSchema = groupSchema.extend({
  description: z.string().nullable(),
  status: z.enum(["active", "inactive"]),
  admins: z.array(z.object({ id: z.string(), name: z.string() })),
  /** The signed-in viewer's own membership; null for a visitor or a non-member. */
  viewerMembership: membershipSchema.nullable(),
})

const memberEntrySchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: z.enum(["admin", "member"]),
  since: z.coerce.date(),
})

/** GET /api/groups/:id/members, only for an admin (Figma D-07). */
export const groupMembersSchema = z.object({
  requests: z.array(memberEntrySchema),
  members: z.array(memberEntrySchema),
})

/** GET /api/me/groups (B-056): a group with my own membership. */
export const myGroupSchema = groupSchema.extend({
  membership: z.object({
    role: z.enum(["admin", "member"]),
    status: z.enum(["active", "pending"]),
  }),
})

export const myGroupsSchema = z.array(myGroupSchema)

export type Group = z.infer<typeof groupSchema>
export type MyGroup = z.infer<typeof myGroupSchema>
export type GroupDetail = z.infer<typeof groupDetailSchema>
export type Membership = z.infer<typeof membershipSchema>
export type GroupMemberEntry = z.infer<typeof memberEntrySchema>
export type GroupMembers = z.infer<typeof groupMembersSchema>

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
