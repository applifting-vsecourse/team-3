import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/events/api/eventsQueryOptions"

const adminEventPath = (eventId: string, action: "hide" | "unhide") =>
  `admin/events/${encodeURIComponent(eventId)}/${action}`

/**
 * The superadmin deactivates or restores an event (#308). The API answers
 * 204: the detail is read again, and every list of events (/akce, the map,
 * the landing page, Moje akce, a group's events) with it, as it leaves or
 * comes back to all of them.
 */
function useRefreshAfterModeration(eventId: string, viewerId: string) {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId, viewerId) })
    void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
  }
}

/** POST /api/admin/events/:id/hide — with the required reason (#308). */
export function useHideEvent(eventId: string, viewerId: string) {
  const refresh = useRefreshAfterModeration(eventId, viewerId)
  return useMutation({
    mutationFn: async (reason: string) => {
      await api.post(adminEventPath(eventId, "hide"), { json: { reason } })
    },
    // a refusal (deactivated or cancelled meanwhile) means the detail is out of date too
    onSettled: refresh,
  })
}

/** POST /api/admin/events/:id/unhide (#308). */
export function useUnhideEvent(eventId: string, viewerId: string) {
  const refresh = useRefreshAfterModeration(eventId, viewerId)
  return useMutation({
    mutationFn: async () => {
      await api.post(adminEventPath(eventId, "unhide"))
    },
    onSettled: refresh,
  })
}
