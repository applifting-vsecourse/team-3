import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { z } from "zod"

import { HTTPError } from "@/lib/api-client"

import { eventDetailQueryOptions } from "@/features/events/api/eventsQueryOptions"

/** What the API says about a members-only event to someone outside the group (B-026). */
const membersOnlySchema = z.object({ code: z.literal("MEMBERS_ONLY"), groupId: z.string() })

/**
 * One event for its detail page, in the variant for the viewer: pass the
 * signed-in user's id, null for a visitor, undefined while the session loads.
 * `isLive` keeps it fresh while the page is open (the management page).
 */
export function useEventDetail(
  eventId: string,
  viewerId: string | null | undefined,
  options: { isLive?: boolean } = {},
) {
  const query = useQuery(eventDetailQueryOptions(eventId, viewerId, options))
  const { refetch } = query
  // stable, so a page can ask again from an effect (MembersOnlyEvent's onMember)
  const retry = useCallback(() => void refetch(), [refetch])
  const status = query.error instanceof HTTPError ? query.error.response.status : undefined
  const isNotFound = status === 404
  // a members-only event: 401 for a visitor, 403 with the group for anyone outside it (#70)
  const isSignInRequired = status === 401
  const membersOnly =
    status === 403 && query.error instanceof HTTPError
      ? membersOnlySchema.safeParse(query.error.data)
      : undefined
  const membersOnlyGroupId = membersOnly?.success ? membersOnly.data.groupId : undefined
  const isExplained = isNotFound || isSignInRequired || membersOnlyGroupId !== undefined
  return {
    event: query.data,
    isPending: query.isPending,
    /** Unknown, hidden or deleted. */
    isNotFound,
    /** A members-only event and no session: the visitor signs in and comes back. */
    isSignInRequired,
    /** A members-only event of this group, and the viewer isn't its member (A-05i). */
    membersOnlyGroupId,
    error: isExplained ? undefined : (query.error ?? undefined),
    retry,
  }
}
