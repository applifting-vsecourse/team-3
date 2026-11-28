import { describe, expect, it } from "vitest"

import { nextDayEndHint } from "@/features/events/lib/endHint"

// QA-11: an end before the start was the next day without the form saying so
describe("nextDayEndHint", () => {
  it("an end before the start: the next day, with its date", () => {
    expect(nextDayEndHint("2026-12-04", "23:00", "1:00")).toBe(
      "Končí následující den, So 5. 12. 2026.",
    )
    expect(nextDayEndHint("2026-12-31", "18:00", "07:00")).toBe(
      "Končí následující den, Pá 1. 1. 2027.",
    )
  })

  it("without a day yet, just that it ends the next day", () => {
    expect(nextDayEndHint("", "23:00", "01:00")).toBe("Končí následující den.")
  })

  it("nothing for a later end, an empty or an unfinished time", () => {
    expect(nextDayEndHint("2026-12-04", "18:00", "20:00")).toBeUndefined()
    expect(nextDayEndHint("2026-12-04", "18:00", "")).toBeUndefined()
    expect(nextDayEndHint("2026-12-04", "18:00", "1")).toBeUndefined()
    expect(nextDayEndHint("2026-12-04", "", "01:00")).toBeUndefined()
  })
})
