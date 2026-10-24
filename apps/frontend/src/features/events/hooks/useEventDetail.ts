import { useQuery } from "@tanstack/react-query"

import { HTTPError } from "@/lib/api-client"

import { eventDetailQueryOptions } from "@/features/events/api/eventsQueryOptions"

/**
 * One event for its detail page, in the variant for the viewer: pass the
 * signed-in user's id, null for a visitor, undefined while the session loads.
 */
export function useEventDetail(eventId: string, viewerId: string | null | undefined) {
  const query = useQuery(eventDetailQueryOptions(eventId, viewerId))
  const isNotFound = query.error instanceof HTTPError && query.error.response.status === 404
  return {
    event: query.data,
    isPending: query.isPending,
    /** Unknown, hidden, or members-only and the viewer is outside the group. */
    isNotFound,
    error: isNotFound ? undefined : (query.error ?? undefined),
    retry: () => void query.refetch(),
  }
}
