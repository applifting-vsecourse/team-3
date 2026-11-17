export const CLOCK_TIME_ERROR = "Zadej čas od 0:00 do 23:59, třeba 9:00."

/** A 24-hour time typed or pasted into the kit's text Input (#200).
 * Compact HHmm also works with a phone's numeric keyboard. Invalid or
 * unfinished input stays visible in the form; never guess or roll it over. */
export function normalizeClockTime(input: string): string | null {
  const value = input.trim()
  const separated = /^(\d{1,2}):(\d{2})$/.exec(value)
  const isCompact = /^\d{3,4}$/.test(value)
  if (!separated && !isCompact) return null

  const hour = separated ? separated[1]! : value.slice(0, -2)
  const minute = separated ? separated[2]! : value.slice(-2)
  if (Number(hour) > 23 || Number(minute) > 59) return null
  return `${hour.padStart(2, "0")}:${minute}`
}
