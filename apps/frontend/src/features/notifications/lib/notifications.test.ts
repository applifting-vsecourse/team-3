import { describe, expect, it } from "vitest"

import { bellLabel, notificationTime, unreadBadge } from "./notifications"

// 22. 11. 2026, 14:00 in Prague (UTC+1)
const now = new Date("2026-11-22T13:00:00.000Z")
const ago = (ms: number) => new Date(now.getTime() - ms)

describe("notificationTime (#86, Figma C-07)", () => {
  it("under a minute is „teď“, under an hour in minutes", () => {
    expect(notificationTime(ago(20_000), now)).toBe("teď")
    expect(notificationTime(ago(5 * 60_000), now)).toBe("před 5 min")
    expect(notificationTime(ago(59 * 60_000 + 59_000), now)).toBe("před 59 min")
  })

  it("the same Prague day in hours", () => {
    expect(notificationTime(ago(2 * 3_600_000 + 10 * 60_000), now)).toBe("před 2 h")
    // 00:30 the same day in Prague
    expect(notificationTime(new Date("2026-11-21T23:30:00.000Z"), now)).toBe("před 13 h")
  })

  it("the Prague day before is „včera“, even an hour ago after midnight", () => {
    expect(notificationTime(new Date("2026-11-21T08:00:00.000Z"), now)).toBe("včera")
    const justAfterMidnight = new Date("2026-11-21T23:30:00.000Z")
    expect(notificationTime(new Date("2026-11-21T22:45:00.000Z"), justAfterMidnight)).toBe(
      "před 45 min",
    )
    expect(notificationTime(new Date("2026-11-21T21:00:00.000Z"), justAfterMidnight)).toBe("včera")
  })

  it("older ones say the day", () => {
    expect(notificationTime(new Date("2026-11-20T10:00:00.000Z"), now)).toBe("pá 20. 11.")
  })
})

describe("the bell", () => {
  it("shows the number, over 9 „9+“, nothing without unread", () => {
    expect(unreadBadge(0)).toBeNull()
    expect(unreadBadge(3)).toBe("3")
    expect(unreadBadge(9)).toBe("9")
    expect(unreadBadge(12)).toBe("9+")
  })

  it("says how many are unread, in Czech plural", () => {
    expect(bellLabel(0)).toBe("Upozornění")
    expect(bellLabel(1)).toBe("Upozornění, 1 nepřečtené")
    expect(bellLabel(3)).toBe("Upozornění, 3 nepřečtená")
    expect(bellLabel(12)).toBe("Upozornění, 12 nepřečtených")
  })
})
