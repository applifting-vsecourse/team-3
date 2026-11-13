import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import type { MyEvent, MyEventsTab } from "@/features/events/api/eventSchemas"
import { myEventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import {
  attendingSections,
  initialMyEventsTab,
  organizingSections,
  type MyEventsTabName,
} from "@/features/events/lib/myEvents"

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

/**
 * Z mých skupin under Přihlášen (Figma C-01, #304): upcoming events of the groups I am a member
 * of that I can still ask to join (no place, no request, not rejected or removed). Not counted on
 * the chip or the tab: they aren't mine.
 */
export function useGroupsEvents(viewerId: string) {
  return useMyEvents("groups", viewerId)
}

type TabData = { events?: MyEvent[]; isPending: boolean }

/**
 * The tab Moje akce shows (#188): the one in the URL, else the one picked for this visit by
 * `initialMyEventsTab`. It is picked once, when the data first tell: a refetch or a live
 * refresh that changes the requests doesn't move the user to the other tab. Undefined until
 * then, so Přihlášen never flashes before Pořádám.
 */
export function useMyEventsTab(
  urlTab: MyEventsTabName | undefined,
  attending: TabData,
  organizing: TabData,
): MyEventsTabName | undefined {
  const [picked, setPicked] = useState<MyEventsTabName>()
  const candidate = picked ?? initialMyEventsTab(attending, organizing)
  // React's „storing information from previous renders“: set once, during the render
  if (picked === undefined && candidate !== undefined) setPicked(candidate)
  return urlTab ?? candidate
}
