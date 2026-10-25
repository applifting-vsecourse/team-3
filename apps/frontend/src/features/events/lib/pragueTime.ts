import { addDays } from "@/features/events/lib/dateRange"

// Events happen in Prague: their times are entered and shown as Prague wall
// time, whatever time zone the device is in.
const PRAGUE_TZ = "Europe/Prague"

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: PRAGUE_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

const pragueParts = (date: Date) => {
  const parts = partsFormat.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00"
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  }
}

/** How far Prague's wall clock is ahead of UTC at `timestamp`, in ms. */
const pragueOffset = (timestamp: number) => {
  const p = pragueParts(new Date(timestamp))
  const wallAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return wallAsUtc - Math.floor(timestamp / 1000) * 1000
}

/** `YYYY-MM-DDTHH:mm` (a datetime-local value) read as Prague wall time → the instant. */
export function fromPragueWallTime(value: string): Date {
  const [date = "", time = ""] = value.split("T")
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number)
  const [hour = 0, minute = 0] = time.split(":").map(Number)
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute)
  // the offset depends on the instant itself (DST): refine once
  const first = wallAsUtc - pragueOffset(wallAsUtc)
  return new Date(wallAsUtc - pragueOffset(first))
}

/** The instant as Prague wall time, `YYYY-MM-DDTHH:mm`, as datetime-local takes it. */
export function toPragueWallTime(date: Date): string {
  const p = pragueParts(date)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

/**
 * The start and the end of an event from the form (Figma D-01): a Prague day
 * `YYYY-MM-DD`, a start `HH:mm` and an optional end `HH:mm`. An end earlier
 * than the start is the next day, for an evening that runs past midnight.
 */
export function eventTimes(
  day: string,
  start: string,
  end: string,
): { startsAt: Date; endsAt: Date | null } {
  const startsAt = fromPragueWallTime(`${day}T${start}`)
  if (!end) return { startsAt, endsAt: null }
  const endDay = end < start ? addDays(day, 1) : day
  return { startsAt, endsAt: fromPragueWallTime(`${endDay}T${end}`) }
}
