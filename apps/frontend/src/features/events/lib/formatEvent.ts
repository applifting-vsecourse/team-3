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

const timeFormat = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: PRAGUE_TZ,
  hour: "numeric",
  minute: "2-digit",
})

const dayFormat = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: PRAGUE_TZ,
  dateStyle: "short",
})

/**
 * When an event happens, on its detail: "Pá 23. 10. · 17:30–19:30", with the
 * end's day when it ends on another day ("Pá 23. 10. · 22:00 – So 24. 10. · 2:00").
 */
export function formatEventTime(startsAt: Date, endsAt: Date | null): string {
  const start = formatEventStart(startsAt)
  if (!endsAt) return start
  if (dayFormat.format(startsAt) === dayFormat.format(endsAt)) {
    return `${start}–${timeFormat.format(endsAt)}`
  }
  return `${start} – ${formatEventStart(endsAt)}`
}

// a Prague day `YYYY-MM-DD` is read as a UTC date, so the time zone can't move it
const formDayFormat = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "numeric",
  year: "numeric",
})

/** "Po 2. 11. 2026", a day in the event form (Figma D-01: Datum). */
export function formatDay(day: string): string {
  const [year = 0, month = 1, date = 1] = day.split("-").map(Number)
  const label = formDayFormat.format(new Date(Date.UTC(year, month - 1, date)))
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
}

export const approvalModeLabel = (mode: "open" | "approval"): string =>
  mode === "open" ? "Bez schválení" : "Se schválením organizátora"

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

/**
 * Button of a filter panel: "Zobrazit 1 akci", "Zobrazit 3 akce", "Zobrazit 24 akcí";
 * "Zobrazit akce" until the count for the current choice is known.
 */
export function showEventsLabel(count: number | undefined): string {
  if (count === undefined) return "Zobrazit akce"
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
