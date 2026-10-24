import { z } from "zod"

import type { BadgeStatus } from "@/components/StatusBadge/StatusBadge"

import type { MyEvent } from "@/features/events/api/eventSchemas"
import { capacityStatus, eventFacts } from "@/features/events/lib/formatEvent"

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

/** "1 žádost", "2 žádosti", "5 žádostí" */
export function requestCountLabel(count: number): string {
  if (count === 1) return "1 žádost"
  if (count >= 2 && count <= 4) return `${count} žádosti`
  return `${count} žádostí`
}

/** Requests waiting on an event that still happens; on a cancelled one they no longer matter. */
const waitingRequests = (event: MyEvent): number =>
  event.status === "cancelled" ? 0 : (event.pendingRequests ?? 0)

/** Pořádám (C-02): the occupancy, or „Zrušeno“ for a cancelled event. */
export function organizingStatus(event: MyEvent): BadgeStatus {
  return event.status === "cancelled" ? { kind: "cancelled" } : capacityStatus(event)
}

/**
 * What the organizer needs next to the occupancy (C-02): the requests to
 * decide, else the minimum still missing, else the district —
 * „4/5 · 2 žádosti“, „3/12 · min. 4“, „8/8 · Praha 7“.
 */
export function organizingFacts(event: MyEvent): string {
  const requests = waitingRequests(event)
  const occupancy = `${event.approvedCount}/${event.maxParticipants}`
  if (requests > 0) return `${occupancy} · ${requestCountLabel(requests)}`
  if (event.status !== "cancelled" && event.missingToMin > 0) {
    return `${occupancy} · min. ${event.minParticipants}`
  }
  return eventFacts(event)
}

/**
 * The strip above Pořádám (C-02): „4 žádosti čekají na schválení“ and the
 * events they wait on, „Deskovky (2), Kooperativní deskovky (2)“. Null with none.
 */
export function pendingRequestsSummary(
  events: MyEvent[],
): { title: string; events: string } | null {
  const waiting = events.filter((event) => waitingRequests(event) > 0)
  const total = waiting.reduce((sum, event) => sum + waitingRequests(event), 0)
  if (total === 0) return null
  return {
    title: `${requestCountLabel(total)} ${total >= 2 && total <= 4 ? "čekají" : "čeká"} na schválení`,
    events: waiting.map((event) => `${event.title} (${waitingRequests(event)})`).join(", "),
  }
}
