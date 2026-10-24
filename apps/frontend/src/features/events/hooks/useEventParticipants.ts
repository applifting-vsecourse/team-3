import { useQuery } from "@tanstack/react-query"

import { eventParticipantsQueryOptions } from "@/features/events/api/eventsQueryOptions"

/** The approved participants for the organizer's management page (#43). */
export function useEventParticipants(
  eventId: string,
  viewerId: string | null | undefined,
  isOrganizer: boolean,
) {
  const query = useQuery(eventParticipantsQueryOptions(eventId, viewerId, isOrganizer))
  return {
    participants: query.data,
    isPending: query.isPending,
    error: query.error ?? undefined,
    retry: () => void query.refetch(),
  }
}
