import { useQuery } from "@tanstack/react-query"

import { eventParticipantsQueryOptions } from "@/features/events/api/eventsQueryOptions"

/** Who is in and who is waiting, for the organizer's management page (#43, #53). */
export function useEventParticipants(
  eventId: string,
  viewerId: string | null | undefined,
  isOrganizer: boolean,
) {
  const query = useQuery(eventParticipantsQueryOptions(eventId, viewerId, isOrganizer))
  return {
    participants: query.data?.participants,
    requests: query.data?.requests,
    isPending: query.isPending,
    error: query.error ?? undefined,
    retry: () => void query.refetch(),
  }
}
