import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import type { MyEventsTab } from "@/features/events/api/eventSchemas"
import { myEventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { attendingSections, organizingSections } from "@/features/events/lib/myEvents"

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

/**
 * Přihlášen split into its sections (C-01) — once, for the tab's count in the band and for
 * the tab itself (review #269).
 */
export function useAttendingEvents(viewerId: string) {
  const result = useMyEvents("attending", viewerId)
  const sections = useMemo(
    () => (result.events ? attendingSections(result.events) : undefined),
    [result.events],
  )
  return { ...result, sections }
}

/** Pořádám split into Nadcházející and Zrušené (C-02) — once, as Přihlášen. */
export function useOrganizingEvents(viewerId: string) {
  const result = useMyEvents("organizing", viewerId)
  const sections = useMemo(
    () => (result.events ? organizingSections(result.events) : undefined),
    [result.events],
  )
  return { ...result, sections }
}
