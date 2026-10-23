/**
 * Calendar days as "YYYY-MM-DD" in Prague — the same shape as ?od= and ?do=
 * in the URL and dateFrom/dateTo in the API, which also counts Prague days.
 */
export type DayRange = { od?: string; do?: string }

const pragueDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Prague",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Today's date in Prague, wherever the browser is. */
export const pragueToday = (now: Date = new Date()): string => pragueDayFormat.format(now)

const parts = (day: string): [number, number, number] => {
  const [y = 0, m = 1, d = 1] = day.split("-").map(Number)
  return [y, m, d]
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = parts(day)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** 0 = Monday … 6 = Sunday */
const weekday = (day: string): number => {
  const [y, m, d] = parts(day)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

export const QUICK_RANGES = ["Dnes", "Zítra", "Tento víkend", "Příštích 7 dní"] as const
export type QuickRange = (typeof QUICK_RANGES)[number]

export function quickRange(option: QuickRange, today: string): Required<DayRange> {
  switch (option) {
    case "Dnes":
      return { od: today, do: today }
    case "Zítra":
      return { od: addDays(today, 1), do: addDays(today, 1) }
    case "Tento víkend": {
      // On Sunday only today is left of the weekend; on Saturday the rest of it.
      const wd = weekday(today)
      if (wd === 6) return { od: today, do: today }
      const saturday = wd === 5 ? today : addDays(today, 5 - wd)
      return { od: saturday, do: addDays(saturday, 1) }
    }
    case "Příštích 7 dní":
      return { od: today, do: addDays(today, 6) }
  }
}

const dayMonth = (day: string) => {
  const [, m, d] = parts(day)
  return { d, m }
}

/** Chip value: "24. 10.", "23.–29. 10.", "30. 10.–2. 11.", "od 24. 10.", "do 29. 10." */
export function formatDayRange(range: DayRange): string | undefined {
  if (!range.od && !range.do) return undefined
  if (!range.do) {
    const { d, m } = dayMonth(range.od!)
    return `od ${d}. ${m}.`
  }
  const to = dayMonth(range.do)
  if (!range.od) return `do ${to.d}. ${to.m}.`
  const from = dayMonth(range.od)
  if (range.od === range.do) return `${from.d}. ${from.m}.`
  if (from.m === to.m && range.od.slice(0, 4) === range.do.slice(0, 4)) {
    return `${from.d}.–${to.d}. ${to.m}.`
  }
  return `${from.d}. ${from.m}.–${to.d}. ${to.m}.`
}

/** "1 den", "2 dny", "7 dní" — length of an inclusive range. */
export function rangeLengthLabel(range: Required<DayRange>): string {
  const [y1, m1, d1] = parts(range.od)
  const [y2, m2, d2] = parts(range.do)
  const days = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000) + 1
  if (days === 1) return "1 den"
  if (days >= 2 && days <= 4) return `${days} dny`
  return `${days} dní`
}

// The calendar works with local Date objects at midnight; a day string maps
// to the same calendar cell regardless of the browser's time zone.
export const dayToDate = (day: string): Date => {
  const [y, m, d] = parts(day)
  return new Date(y, m - 1, d)
}

export const dateToDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
