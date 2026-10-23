import { describe, expect, it } from "vitest"

import {
  addDays,
  dateToDay,
  dayToDate,
  formatDayRange,
  pragueToday,
  quickRange,
  rangeLengthLabel,
} from "./dateRange"

describe("pragueToday", () => {
  it("is the Prague calendar day, not UTC", () => {
    // 23:30 UTC on 22. 10. is already 23. 10. in Prague (summer time)
    expect(pragueToday(new Date("2026-10-22T23:30:00Z"))).toBe("2026-10-23")
    expect(pragueToday(new Date("2026-10-22T21:30:00Z"))).toBe("2026-10-22")
  })
})

describe("quickRange", () => {
  // Friday 23. 10. 2026, the demo day
  const friday = "2026-10-23"

  it("Dnes, Zítra, Příštích 7 dní", () => {
    expect(quickRange("Dnes", friday)).toEqual({ od: friday, do: friday })
    expect(quickRange("Zítra", friday)).toEqual({ od: "2026-10-24", do: "2026-10-24" })
    expect(quickRange("Příštích 7 dní", friday)).toEqual({ od: friday, do: "2026-10-29" })
  })

  it("Tento víkend is the coming Saturday and Sunday", () => {
    expect(quickRange("Tento víkend", friday)).toEqual({ od: "2026-10-24", do: "2026-10-25" })
    expect(quickRange("Tento víkend", "2026-10-19")).toEqual({ od: "2026-10-24", do: "2026-10-25" })
  })

  it("on the weekend itself only what is left of it", () => {
    expect(quickRange("Tento víkend", "2026-10-24")).toEqual({ od: "2026-10-24", do: "2026-10-25" })
    expect(quickRange("Tento víkend", "2026-10-25")).toEqual({ od: "2026-10-25", do: "2026-10-25" })
  })
})

describe("formatDayRange", () => {
  it("formats like the chip in Figma", () => {
    expect(formatDayRange({ od: "2026-10-23", do: "2026-10-29" })).toBe("23.–29. 10.")
    expect(formatDayRange({ od: "2026-10-24", do: "2026-10-24" })).toBe("24. 10.")
    expect(formatDayRange({ od: "2026-10-30", do: "2026-11-02" })).toBe("30. 10.–2. 11.")
    expect(formatDayRange({ od: "2026-10-24" })).toBe("od 24. 10.")
    expect(formatDayRange({ do: "2026-10-29" })).toBe("do 29. 10.")
    expect(formatDayRange({})).toBeUndefined()
  })
})

describe("rangeLengthLabel", () => {
  it("counts both ends", () => {
    expect(rangeLengthLabel({ od: "2026-10-23", do: "2026-10-23" })).toBe("1 den")
    expect(rangeLengthLabel({ od: "2026-10-24", do: "2026-10-25" })).toBe("2 dny")
    expect(rangeLengthLabel({ od: "2026-10-23", do: "2026-10-29" })).toBe("7 dní")
    // across the clock change on 25. 10.
    expect(rangeLengthLabel({ od: "2026-10-24", do: "2026-10-26" })).toBe("3 dny")
  })
})

describe("day helpers", () => {
  it("round-trip through the calendar's local dates and cross months", () => {
    expect(dateToDay(dayToDate("2026-10-05"))).toBe("2026-10-05")
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01")
  })
})
