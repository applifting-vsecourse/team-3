import { useQuery } from "@tanstack/react-query"

import type { MyEventsTab } from "@/features/events/api/eventSchemas"
import { myEventsQueryOptions } from "@/features/events/api/eventsQueryOptions"

/** A tab of „Moje akce“ for the signed-in user (B-035). */
export function useMyEvents(tab: MyEventsTab, viewerId: string) {
  // no request under an empty viewer: it would cache the user's events under the wrong key
  const query = useQuery({ ...myEventsQueryOptions(tab, viewerId), enabled: viewerId !== "" })
  return {
    events: query.data,
    isPending: query.isPending,
    error: query.error ?? undefined,
    retry: () => void query.refetch(),
  }
}
