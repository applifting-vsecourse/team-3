import { z } from "zod"

/** GET /api/invites/me: my link to share and how many joined through it (#406). */
export const myInviteSchema = z.object({
  code: z.string(),
  url: z.string(),
  joinedCount: z.number().int().nonnegative(),
})
export type MyInvite = z.infer<typeof myInviteSchema>

/** GET /api/invites/:code: who invites, as their public profile shows them. */
export const inviterSchema = z.object({
  id: z.string(),
  name: z.string(),
  interests: z.array(z.string()),
})
export type Inviter = z.infer<typeof inviterSchema>

/** POST /api/invites/:code/accept: how I stand to the inviter afterwards. */
export const inviteAnswerSchema = z.object({
  state: z.enum(["none", "outgoing", "incoming", "friends", "self"]),
})
