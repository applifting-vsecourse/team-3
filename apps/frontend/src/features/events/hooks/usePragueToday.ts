import { useEffect, useState } from "react"

import { addDays, pragueToday } from "@/features/events/lib/dateRange"
import { fromPragueWallTime } from "@/features/events/lib/pragueTime"

/** Keep an open form's calendar current across Prague midnight and sleep. */
export function usePragueToday() {
  const [today, setToday] = useState(() => pragueToday())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const update = () => {
      clearTimeout(timer)
      const now = new Date()
      const day = pragueToday(now)
      setToday(day)
      const nextMidnight = fromPragueWallTime(`${addDays(day, 1)}T00:00`).getTime()
      timer = setTimeout(update, Math.max(1, nextMidnight - now.getTime()))
    }
    update()
    window.addEventListener("focus", update)
    document.addEventListener("visibilitychange", update)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("focus", update)
      document.removeEventListener("visibilitychange", update)
    }
  }, [])

  return today
}
