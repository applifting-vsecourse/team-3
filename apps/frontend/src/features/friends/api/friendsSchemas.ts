import { z } from "zod"

/**
 * How the viewer stands to someone (#307), as GET /api/users/:id and every change answer:
 * `friends`; `outgoing` — my request waits, also after a silent rejection; `incoming` — theirs
 * waits for me; `none`; `self`.
 */
export const friendshipStateSchema = z.enum(["none", "outgoing", "incoming", "friends", "self"])
export type FriendshipState = z.infer<typeof friendshipStateSchema>

export const friendshipChangeSchema = z.object({ state: friendshipStateSchema })

const friendPersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  interests: z.array(z.object({ id: z.string(), name: z.string() })),
})
export type FriendPerson = z.infer<typeof friendPersonSchema>

const friendRequestSchema = z.object({
  person: friendPersonSchema,
  requestedAt: z.coerce.date(),
})
export type FriendRequest = z.infer<typeof friendRequestSchema>

/** GET /api/friends: everything at once, no paging (#307). */
export const friendListsSchema = z.object({
  /** By name, in Czech order. */
  friends: z.array(friendPersonSchema),
  /** Requests waiting for me, the newest first. */
  incoming: z.array(friendRequestSchema),
  /** My requests, the newest first; a quietly rejected one looks the same. */
  outgoing: z.array(friendRequestSchema),
})
export type FriendLists = z.infer<typeof friendListsSchema>
