const PRAGUE_TZ = "Europe/Prague"

const dayMonthFormat = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: PRAGUE_TZ,
  day: "numeric",
  month: "numeric",
})

const timeFormat = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: PRAGUE_TZ,
  hour: "numeric",
  minute: "2-digit",
})

/**
 * When a request was sent, in the management of an event (#53) and of a group (#304):
 * "Žádost z 23. 10. v 17:30", Prague time.
 */
export function formatRequestTime(date: Date): string {
  const parts = dayMonthFormat.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `Žádost z ${get("day")}. ${get("month")}. v ${timeFormat.format(date)}`
}
