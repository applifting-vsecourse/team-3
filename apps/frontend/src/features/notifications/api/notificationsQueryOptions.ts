import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { notificationListSchema, unreadCountSchema } from "./notificationsSchemas"

// private data: keyed by its owner, so nobody else gets it from the cache
export const notificationKeys = {
  all: () => ["notifications"] as const,
  list: (viewerId: string) => [...notificationKeys.all(), "list", viewerId] as const,
  unreadCount: (viewerId: string) => [...notificationKeys.all(), "unread", viewerId] as const,
}

/** How often the bell asks while the tab is open; a return to the tab asks at once too. */
export const UNREAD_REFRESH_MS = 60_000

/** The centre (#86, Figma C-07, C-07d): the newest 50, newest first. */
export const notificationListQueryOptions = (viewerId: string) =>
  queryOptions({
    queryKey: notificationKeys.list(viewerId),
    queryFn: async () => notificationListSchema.parse(await api.get("notifications").json()),
  })

/** The bell's number (Figma Zvonek): a count, no list, asked for every minute. */
export const unreadCountQueryOptions = (viewerId: string) =>
  queryOptions({
    queryKey: notificationKeys.unreadCount(viewerId),
    queryFn: async () =>
      unreadCountSchema.parse(await api.get("notifications/unread-count").json()).count,
    refetchInterval: UNREAD_REFRESH_MS,
  })
