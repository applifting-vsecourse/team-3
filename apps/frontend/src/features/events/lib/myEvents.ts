import { z } from "zod"

import type { BadgeStatus } from "@/components/StatusBadge/StatusBadge"
import { inSentence } from "@/lib/inSentence"
import {
  missingLabel,
  occupancyBesideBadge,
  occupancyCount,
  occupancySummary,
} from "@/lib/occupancy"
import { requestCountLabel, requestsWaitingLabel, waitVerb } from "@/lib/requestCount"

import type { MyEvent } from "@/features/events/api/eventSchemas"
import { capacityStatus, formatStartInSentence } from "@/features/events/lib/formatEvent"

/**
 * Přihlášen (C-01): requests waiting for approval on top, apart from the
 * places I have. A cancelled event is neither (#183): it goes to its own
 * section at the end, whether I had a place or only asked for one.
 */
export function attendingSections(events: MyEvent[]): {
  pending: MyEvent[]
  approved: MyEvent[]
  cancelled: MyEvent[]
} {
  const happening = events.filter((event) => event.status !== "cancelled")
  return {
    pending: happening.filter((event) => event.myParticipation === "pending"),
    approved: happening.filter((event) => event.myParticipation === "approved"),
    cancelled: events.filter((event) => event.status === "cancelled"),
  }
}

/** „Jdu“ / „Čeká na schválení“; a cancelled event says so instead (D-02a). */
export function attendingStatus(event: MyEvent): BadgeStatus {
  if (event.status === "cancelled") return { kind: "cancelled" }
  return event.myParticipation === "pending" ? { kind: "pending" } : { kind: "going" }
}

/**
 * The numbers on a grid card in Přihlášen (Figma C-01d). Its badge is the user's place
 * („Jdu“, „Čeká na schválení“), not the occupancy, so they say how many are missing
 * themselves: „chybí 1 · 8 z 14 · min. 9“, else „5 z 5 · min. 3“; cancelled, just the count.
 */
export function attendingNumbers(event: MyEvent): string {
  return event.status === "cancelled" ? occupancyCount(event) : occupancySummary(event)
}

/** A row card in Přihlášen starts its line with how many are missing: „chybí 1 · 18:00 · …“ (C-01). */
export function attendingRowLead(event: MyEvent): string | undefined {
  return event.status !== "cancelled" && event.missingToMin > 0
    ? missingLabel(event.missingToMin)
    : undefined
}

/**
 * The tab in the URL, as Figma names it: `?tab=prihlasen` is Přihlášen, `?tab=poradam`
 * Pořádám. Without one (or with anything else) the page picks the tab itself (#188).
 */
export const myEventsSearchSchema = z.object({
  tab: z.enum(["prihlasen", "poradam"]).optional().catch(undefined),
})

export type MyEventsSearch = z.infer<typeof myEventsSearchSchema>
export type MyEventsTabName = NonNullable<MyEventsSearch["tab"]>

/** A tab's events as far as they are known: still loading, or loaded (`events`), or failed. */
type TabData = { events?: MyEvent[]; isPending: boolean }

/**
 * The chip `/moje/akce` opens on without `?tab` (#188, #304): Pořádám while requests wait there —
 * known as soon as Pořádám is, without waiting for Přihlášen — or when there is nothing to go
 * to and something to run; otherwise Přihlášen. Undefined while it can't be told yet. The
 * „nothing“ and „something“ are what the tabs count (cancelled events left out); a tab that
 * failed to load counts as unknown, so it never sends anyone to Pořádám.
 */
export function initialMyEventsTab(
  attending: TabData,
  organizing: TabData,
): MyEventsTabName | undefined {
  if (organizing.events && pendingRequestsSummary(organizing.events)) return "poradam"
  if (attending.isPending || organizing.isPending) return undefined
  const going = attending.events && attendingSections(attending.events)
  const isAttendingNothing =
    going !== undefined && going.pending.length + going.approved.length === 0
  const isOrganizingSomething =
    organizing.events !== undefined && organizingSections(organizing.events).upcoming.length > 0
  return isAttendingNothing && isOrganizingSomething ? "poradam" : "prihlasen"
}

/** Requests waiting on an event that still happens; on a cancelled one they no longer matter. */
const waitingRequests = (event: MyEvent): number =>
  event.status === "cancelled" ? 0 : (event.pendingRequests ?? 0)

/** Pořádám (C-02): the occupancy, or „Zrušeno“ for a cancelled event. */
export function organizingStatus(event: MyEvent): BadgeStatus {
  return event.status === "cancelled" ? { kind: "cancelled" } : capacityStatus(event)
}

/**
 * What the organizer needs next to the occupancy badge on a grid card (Figma C-02d): the
 * occupancy with the minimum and the requests to decide — „4 z 5 · min. 3 · 2 žádosti“,
 * „3 z 12 · min. 4“, „8 z 8 · min. 6“. The badge says „Chybí 1“, so the line doesn't.
 */
export function organizingNumbers(event: MyEvent): string {
  if (event.status === "cancelled") return occupancyCount(event)
  const requests = waitingRequests(event)
  const occupancy = occupancyBesideBadge(event)
  return requests > 0 ? `${occupancy} · ${requestCountLabel(requests)}` : occupancy
}

/** A row card in Pořádám ends with the requests instead of the place: „18:00 · 2 žádosti čekají“ (C-02). */
export function organizingRowTail(event: MyEvent): string | undefined {
  const requests = waitingRequests(event)
  return requests > 0 ? requestsWaitingLabel(requests) : undefined
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
    title: `${requestsWaitingLabel(total)} na schválení`,
    events: waiting.map((event) => `${event.title} (${waitingRequests(event)})`).join(", "),
  }
}

/** Pořádám (C-02, decided 4. 11.): Nadcházející, then Zrušené, each soonest first as the API sends them. */
export function organizingSections(events: MyEvent[]): {
  upcoming: MyEvent[]
  cancelled: MyEvent[]
} {
  return {
    upcoming: events.filter((event) => event.status !== "cancelled"),
    cancelled: events.filter((event) => event.status === "cancelled"),
  }
}

/**
 * The band's line in Přihlášen (Figma C-01d): what the tab holds, and the nearest event I go
 * to or wait for — „Nejbližší: florbal v sobotu v 19:00.“ Cancelled ones don't count.
 */
export function attendingLine(events: MyEvent[] | undefined, now: Date): string {
  const line = "Akce, kam jdeš, a ty, kde čekáš na schválení."
  const nearest = events
    ?.filter((event) => event.status !== "cancelled" && event.startsAt > now)
    .toSorted((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0]
  if (!nearest) return line
  return `${line} Nejbližší: ${inSentence(nearest.activity.name)} ${formatStartInSentence(nearest.startsAt, now)}.`
}

/** The band's line in Pořádám (Figma C-02d): „… Na schválení čekají 4 žádosti.“ when any wait. */
export function organizingLine(events: MyEvent[] | undefined): string {
  const line = "Akce, které pořádáš, od nejbližší."
  const total = (events ?? []).reduce((sum, event) => sum + waitingRequests(event), 0)
  if (total === 0) return line
  return `${line} Na schválení ${waitVerb(total)} ${requestCountLabel(total)}.`
}
