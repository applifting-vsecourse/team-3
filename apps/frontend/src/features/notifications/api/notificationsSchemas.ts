import { z } from "zod"

/** One upozornění (#86): its short line, where it leads and whether it is read. */
const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  /** The first line of the matching e-mail, as the API stored it. */
  text: z.string(),
  /** Where a click leads, a path in this app (`/akce/…/sprava`, `/profil/pratele?tab=zadosti`). */
  path: z.string(),
  createdAt: z.coerce.date(),
  /** null = unread. */
  readAt: z.coerce.date().nullable(),
})
export type AppNotification = z.infer<typeof notificationSchema>

/** GET /api/notifications: the newest 50 and how many of all of them are unread. */
export const notificationListSchema = z.object({
  items: z.array(notificationSchema),
  unreadCount: z.number().int().nonnegative(),
})
export type NotificationList = z.infer<typeof notificationListSchema>

/** GET /api/notifications/unread-count: the bell's number. */
export const unreadCountSchema = z.object({ count: z.number().int().nonnegative() })
