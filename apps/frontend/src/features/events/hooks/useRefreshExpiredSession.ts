import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"

import type { EventDetail } from "@/features/events/api/eventSchemas"

/**
 * The cached session says signed in, yet the API answered the (public) detail
 * as to a visitor: the cookie has expired. Refresh the session so the header
 * and the login link (which would otherwise bounce to /akce) agree with the page.
 *
 * Decided by `viewerSignedIn`, not by missing names: since #174 most signed-in
 * users get `participants: null` too.
 */
export function useRefreshExpiredSession(
  viewerId: string | null | undefined,
  event: Pick<EventDetail, "viewerSignedIn"> | undefined,
) {
  const queryClient = useQueryClient()
  const isExpired = Boolean(viewerId) && event !== undefined && !event.viewerSignedIn
  useEffect(() => {
    if (isExpired) void queryClient.invalidateQueries({ queryKey: authKeys.session() })
  }, [isExpired, queryClient])
}
