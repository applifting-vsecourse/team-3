import type { CapacityStatus } from "@/components/StatusBadge/StatusBadge"

import type { PublicEvent } from "@/features/events/api/eventSchemas"

// Events happen in Prague, so their time is Prague time wherever the browser is.
const PRAGUE_TZ = "Europe/Prague"

const startFormat = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: PRAGUE_TZ,
  weekday: "short",
  day: "numeric",
  month: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

/** "Pá 23. 10. · 17:30" */
export function formatEventStart(date: Date): string {
  const parts = startFormat.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  const weekday = get("weekday")
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${get("day")}. ${get("month")}. · ${get("hour")}:${get("minute")}`
}

/**
 * The place's name is the address up to the first comma
 * („Kavárna Pražírna, Dělnická 12, Praha 7“ → „Kavárna Pražírna“).
 * A separate placeName field may come with the event form (#40).
 */
export const placeName = (address: string): string => address.split(",")[0]?.trim() ?? address

export function capacityStatus(event: PublicEvent): CapacityStatus {
  if (event.isFull) return { kind: "full" }
  if (event.missingToMin > 0) return { kind: "missing", missing: event.missingToMin }
  return { kind: "free" }
}

/** "4/12 · Praha 8" — approved of maximum, and the district. */
export const eventFacts = (event: PublicEvent): string =>
  `${event.approvedCount}/${event.maxParticipants} · ${event.locality.name}`

/** Button of a filter panel: "Zobrazit 1 akci", "Zobrazit 3 akce", "Zobrazit 24 akcí" */
export function showEventsLabel(count: number): string {
  if (count === 1) return "Zobrazit 1 akci"
  if (count >= 2 && count <= 4) return `Zobrazit ${count} akce`
  return `Zobrazit ${count} akcí`
}

/** "1 akce", "3 akce", "24 akcí" */
export function eventCountLabel(count: number): string {
  if (count === 1) return "1 akce"
  if (count >= 2 && count <= 4) return `${count} akce`
  return `${count} akcí`
}
