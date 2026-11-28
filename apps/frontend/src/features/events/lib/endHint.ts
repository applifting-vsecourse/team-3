import { normalizeClockTime } from "@/features/events/lib/clockTime"
import { addDays } from "@/features/events/lib/dateRange"
import { formatDay } from "@/features/events/lib/formatEvent"

/**
 * Under „Konec“ (QA-11): an end earlier than the start is the next day (pragueTime.ts), which the
 * form says, with the date, so 23:00–01:00 and a typo like 18:00–07:00 both read as what they are.
 * Nothing while either time is unfinished or the end is later the same day.
 */
export function nextDayEndHint(day: string, start: string, end: string): string | undefined {
  const startTime = normalizeClockTime(start)
  const endTime = normalizeClockTime(end)
  if (!startTime || !endTime || endTime >= startTime) return undefined
  return day ? `Končí následující den, ${formatDay(addDays(day, 1))}.` : "Končí následující den."
}
