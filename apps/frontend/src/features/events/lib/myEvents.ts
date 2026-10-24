import { z } from "zod"

import type { BadgeStatus } from "@/components/StatusBadge/StatusBadge"

import type { MyEvent } from "@/features/events/api/eventSchemas"

/** Přihlášen (C-01): requests waiting for approval on top, apart from the places I have. */
export function attendingSections(events: MyEvent[]): { pending: MyEvent[]; approved: MyEvent[] } {
  return {
    pending: events.filter((event) => event.myParticipation === "pending"),
    approved: events.filter((event) => event.myParticipation === "approved"),
  }
}

/** „Jdu“ / „Čeká na schválení“; a cancelled event says so instead (D-02a). */
export function attendingStatus(event: MyEvent): BadgeStatus {
  if (event.status === "cancelled") return { kind: "cancelled" }
  return event.myParticipation === "pending" ? { kind: "pending" } : { kind: "going" }
}

/**
 * The tab in the URL, as Figma names it: `/moje-akce` is Přihlášen,
 * `/moje-akce?tab=poradam` Pořádám. Anything else falls back to Přihlášen.
 */
export const myEventsSearchSchema = z.object({
  tab: z.enum(["poradam"]).optional().catch(undefined),
})

export type MyEventsSearch = z.infer<typeof myEventsSearchSchema>
