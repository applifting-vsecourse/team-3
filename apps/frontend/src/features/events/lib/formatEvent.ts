import type { CapacityStatus } from "@/components/StatusBadge/StatusBadge"

import type { GroupEvent, PublicEvent } from "@/features/events/api/eventSchemas"

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

/**
 * The parts of a start, in Prague time — every format below is built from them, so the
 * code splitting a date exists once.
 */
function startParts(date: Date): { weekday: string; day: string; month: string; time: string } {
  const parts = startFormat.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return {
    weekday: get("weekday"),
    day: get("day"),
    month: get("month"),
    time: `${get("hour")}:${get("minute")}`,
  }
}

const capitalize = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

/** A past event's day on its card (Karta akce/Proběhlá řádek): „Po 19. 10.“ */
export function formatEventDay(date: Date): string {
  const { weekday, day, month } = startParts(date)
  return `${capitalize(weekday)} ${day}. ${month}.`
}

/** "Pá 23. 10. · 17:30" */
export function formatEventStart(date: Date): string {
  return `${formatEventDay(date)} · ${startParts(date).time}`
}

const timeFormat = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: PRAGUE_TZ,
  hour: "numeric",
  minute: "2-digit",
})

/** The date tile on a card (Figma Karta akce › Datum): „Pá“, „23“, „18:30“. */
export function eventDateParts(date: Date): { weekday: string; day: string; time: string } {
  const { weekday, day, time } = startParts(date)
  return { weekday: capitalize(weekday), day, time }
}

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

const dayMonthFormat = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: PRAGUE_TZ,
  day: "numeric",
  month: "numeric",
})

/** When a request was sent, on the management page (#53): "Žádost z 23. 10. v 17:30". */
export function formatRequestTime(date: Date): string {
  const parts = dayMonthFormat.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `Žádost z ${get("day")}. ${get("month")}. v ${timeFormat.format(date)}`
}

/** When the organizer wrote to the participants (#176, Figma A-05c): "pá 23. 10. v 16:20", Prague time. */
export function formatMessageTime(date: Date): string {
  const { weekday, day, month, time } = startParts(date)
  return `${weekday} ${day}. ${month}. v ${time}`
}

/** When an event starts, inside a sentence of the request dialog (#175): "pá 23. 10. v 17:30". */
export function formatRequestEventStart(date: Date): string {
  const { weekday, day, month, time } = startParts(date)
  return `${weekday} ${day}. ${month}. v ${time}`
}

const DAY_MS = 24 * 60 * 60 * 1000
const pragueDayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: PRAGUE_TZ })
const pragueDay = (date: Date): number => Date.parse(pragueDayFormat.format(date))

const offsetFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: PRAGUE_TZ,
  timeZoneName: "longOffset",
})

/** Prague's offset from UTC at that moment, in minutes (60 in winter, 120 in summer). */
function pragueOffsetMinutes(date: Date): number {
  const name = offsetFormat.formatToParts(date).find((part) => part.type === "timeZoneName")
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name?.value ?? "")
  if (!match) return 0
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]))
}

/** Midnight at the end of the Prague day the moment falls on. */
export function endOfPragueDay(date: Date): Date {
  const nextDayUtc = pragueDay(date) + DAY_MS
  return new Date(nextDayUtc - pragueOffsetMinutes(new Date(nextDayUtc)) * 60 * 1000)
}

/**
 * Whether an event is over: past its end, or — without one — past the end of its day. An
 * 18:00 event with no end time is still going at 18:05 (review #269), so it doesn't read
 * „Akce proběhla“ while people are there.
 */
export const isEventOver = (event: { startsAt: Date; endsAt: Date | null }, now: Date): boolean =>
  (event.endsAt ?? endOfPragueDay(event.startsAt)) <= now
// „v pondělí“… with the preposition each day takes
const ON_WEEKDAY = [
  "v neděli",
  "v pondělí",
  "v úterý",
  "ve středu",
  "ve čtvrtek",
  "v pátek",
  "v sobotu",
]

/**
 * When an event starts, said as in a sentence (Figma C-01d: „Nejbližší: florbal v sobotu
 * v 19:00“): „dnes v 19:00“, „zítra v 19:00“, the weekday within a week, else „23. 10. v 19:00“.
 */
export function formatStartInSentence(date: Date, now: Date): string {
  const days = Math.round((pragueDay(date) - pragueDay(now)) / DAY_MS)
  const time = timeFormat.format(date)
  if (days === 0) return `dnes v ${time}`
  if (days === 1) return `zítra v ${time}`
  if (days > 1 && days < 7) {
    return `${ON_WEEKDAY[new Date(pragueDay(date)).getUTCDay()]} v ${time}`
  }
  const parts = dayMonthFormat.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `${get("day")}. ${get("month")}. v ${time}`
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
  return { kind: "free", freeSpots: event.freeSpots }
}

/**
 * The row card's line on the group's page (A-08e) after the time: a members-only event says
 * so after its place; others keep the card's own „místo · městská část“.
 */
export const groupEventTail = (event: GroupEvent): string | undefined =>
  event.visibility === "members"
    ? `${placeName(event.address)} · ${event.locality.name} · jen pro členy`
    : undefined

/**
 * A past event on the group's page (A-08e), who came: „sešlo se 6“,
 * „sešli se 3“, „sešel se 1“; members-only says so as upcoming ones do.
 */
export function pastEventFacts(event: GroupEvent): string {
  const count = event.approvedCount
  const came =
    count === 1
      ? "sešel se 1"
      : count >= 2 && count <= 4
        ? `sešli se ${count}`
        : `sešlo se ${count}`
  return event.visibility === "members" ? `${came} · jen pro členy` : came
}

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
