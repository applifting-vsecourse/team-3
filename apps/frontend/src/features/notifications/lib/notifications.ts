const PRAGUE_TZ = "Europe/Prague"
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

const pragueDayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: PRAGUE_TZ })
const pragueDay = (date: Date): number => Date.parse(pragueDayFormat.format(date))
const dateFormat = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: PRAGUE_TZ,
  weekday: "short",
  day: "numeric",
  month: "numeric",
})

/**
 * When an upozornění came (Figma C-07): „teď“, „před 5 min“, „před 2 h“ the same Prague day,
 * „včera“, then the day „pá 20. 11.“.
 */
export function notificationTime(createdAt: Date, now: Date): string {
  const ago = now.getTime() - createdAt.getTime()
  if (ago < MINUTE_MS) return "teď"
  if (ago < HOUR_MS) return `před ${Math.floor(ago / MINUTE_MS)} min`
  const days = Math.round((pragueDay(now) - pragueDay(createdAt)) / (24 * HOUR_MS))
  if (days <= 0) return `před ${Math.floor(ago / HOUR_MS)} h`
  if (days === 1) return "včera"
  const parts = dateFormat.formatToParts(createdAt)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `${get("weekday")} ${get("day")}. ${get("month")}.`
}

/** The bell's badge (Figma Zvonek): the number, over 9 „9+“; nothing without unread. */
export const unreadBadge = (count: number): string | null =>
  count <= 0 ? null : count > 9 ? "9+" : String(count)

/** The bell's name for a screen reader: „Upozornění, 3 nepřečtená“. */
export function bellLabel(count: number): string {
  if (count <= 0) return "Upozornění"
  const word = count === 1 ? "nepřečtené" : count < 5 ? "nepřečtená" : "nepřečtených"
  return `Upozornění, ${count} ${word}`
}
