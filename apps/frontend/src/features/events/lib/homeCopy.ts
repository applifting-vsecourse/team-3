import { occupancyCount } from "@/lib/occupancy"

const DAY_MS = 24 * 60 * 60 * 1000

// the Prague calendar day of an instant, as a UTC midnight (so arithmetic ignores time zones)
const pragueDayParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Prague",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const pragueDay = (instant: Date): Date => new Date(`${pragueDayParts.format(instant)}T00:00:00Z`)

const WEEKDAY_SHORT = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"]

/**
 * „Tento víkend“ under its heading (Figma A-01d: „So 24. – Ne 25. 10.“): the same days the
 * API picks (`pragueWeekendOf`) — Saturday and Sunday of this week, on Sunday just today.
 */
export function weekendDays(now: Date): { from: Date; to: Date } {
  const today = pragueDay(now)
  const weekday = today.getUTCDay()
  if (weekday === 0) return { from: today, to: today }
  const saturday = new Date(today.getTime() + (6 - weekday) * DAY_MS)
  return { from: saturday, to: new Date(saturday.getTime() + DAY_MS) }
}

/** `YYYY-MM-DD` of a day from `weekendDays`, for the /akce filter. */
export const isoDay = (day: Date): string => day.toISOString().slice(0, 10)

const dayAndMonth = (day: Date) => `${day.getUTCDate()}. ${day.getUTCMonth() + 1}.`

/** „So 14. – Ne 15. 11.“, across months „So 31. 10. – Ne 1. 11.“, on Sunday „Ne 8. 11.“. */
export function weekendLabel(now: Date): string {
  const { from, to } = weekendDays(now)
  const start = `${WEEKDAY_SHORT[from.getUTCDay()]} ${from.getUTCDate()}.`
  if (from.getTime() === to.getTime()) return `${start} ${from.getUTCMonth() + 1}.`
  const isSameMonth = from.getUTCMonth() === to.getUTCMonth()
  return `${isSameMonth ? start : `${WEEKDAY_SHORT[from.getUTCDay()]} ${dayAndMonth(from)}`} – ${WEEKDAY_SHORT[to.getUTCDay()]} ${dayAndMonth(to)}`
}

/** When the panel's event starts, after „Teď chybí jeden“: „dnes“, „zítra“, „za 2 dny“, „za 5 dní“. */
export function startsIn(startsAt: Date, now: Date): string {
  const days = Math.round((pragueDay(startsAt).getTime() - pragueDay(now).getTime()) / DAY_MS)
  if (days <= 0) return "dnes"
  if (days === 1) return "zítra"
  if (days <= 4) return `za ${days} dny`
  return `za ${days} dní`
}

/** The panel's label: „Teď chybí jeden“ is the brand's phrase for one; more in numbers. */
export const missingNowLabel = (missingToMin: number): string =>
  missingToMin === 1 ? "Teď chybí jeden" : `Teď chybí ${missingToMin}`

/**
 * The panel's sentence with numbers (Figma A-01: „5 z 10 už jde, do minima chybí 1. Přijď
 * a hraje se.“). „Hraje se“ is the sample's sport; any event „se koná“.
 */
export function missingNowSentence(event: {
  approvedCount: number
  maxParticipants: number
  missingToMin: number
}): string {
  const who = event.approvedCount === 0 ? "Zatím nikdo nejde" : `${occupancyCount(event)} už jde`
  const last = event.missingToMin === 1 ? " Přijď a akce se koná." : ""
  return `${who}, do minima chybí ${event.missingToMin}.${last}`
}

/**
 * Where the sections are from, inside a sentence. The catalog has no locative („v okolí
 * Prahy 3“, Figma A-01pd), so the name stays in the nominative after „lokalita“. A district
 * covers its whole city in the API (B-027), hence „v okolí“.
 */
export function areaPhrase(locality: { name: string; isDistrict: boolean } | null): string {
  if (!locality) return "v celém Česku"
  return locality.isDistrict ? `v okolí lokality ${locality.name}` : `v lokalitě ${locality.name}`
}
