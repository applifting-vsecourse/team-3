import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { notificationKeys } from "@/features/notifications/api/notificationsQueryOptions"

/**
 * Opening an upozornění marks it read (#86). The click goes on to the detail at once; the list
 * and the bell catch up afterwards, also when the request fails (it is only marked again later).
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`notifications/${encodeURIComponent(id)}/read`).then(() => undefined),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all() }),
  })
}

/** „Označit vše jako přečtené“ (Figma C-07, C-07d). */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post("notifications/read-all").then(() => undefined),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all() }),
  })
}
