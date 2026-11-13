import { describe, expect, it } from "vitest"

import { canRateEvent, ratingDeadline } from "./rating"

// the same cases as the API's rating-window.spec.ts, so the button and the API agree
describe("ratingDeadline (B-060, #66)", () => {
  it("ends with the 14th Prague day after the day the event ended", () => {
    const startsAt = new Date("2026-11-01T18:00:00.000Z")
    const endsAt = new Date("2026-11-01T20:00:00.000Z")
    expect(ratingDeadline({ startsAt, endsAt })).toEqual(new Date("2026-11-15T22:59:59.999Z"))
    expect(ratingDeadline({ startsAt, endsAt: null })).toEqual(new Date("2026-11-15T22:59:59.999Z"))
  })

  it("across the change of time: calendar days, not 14 × 24 h", () => {
    // Tue 20. 10. 20:00 in Prague (summer time); until Tue 3. 11. 23:59:59.999 (winter time)
    const endsAt = new Date("2026-10-20T18:00:00.000Z")
    expect(ratingDeadline({ startsAt: endsAt, endsAt })).toEqual(
      new Date("2026-11-03T22:59:59.999Z"),
    )
  })

  it("an end exactly at Prague midnight belongs to the day before (review #314)", () => {
    const startsAt = new Date("2026-10-19T17:00:00.000Z")
    const endsAt = new Date("2026-10-19T22:00:00.000Z")
    expect(ratingDeadline({ startsAt, endsAt })).toEqual(new Date("2026-11-02T22:59:59.999Z"))
  })
})

describe("canRateEvent (#66, review #315)", () => {
  const event = {
    startsAt: new Date("2026-11-01T18:00:00.000Z"),
    endsAt: new Date("2026-11-01T20:00:00.000Z"),
    status: "published" as const,
    approvedCount: 5,
    minParticipants: 4,
    organizer: { id: "u-petra" },
    myParticipation: "approved",
  }
  const dayAfter = new Date("2026-11-02T10:00:00.000Z")

  it("a participant of an event that took place, within the window", () => {
    expect(canRateEvent(event, "u-jakub", dayAfter)).toBe(true)
    // its last moment still counts
    expect(canRateEvent(event, "u-jakub", new Date("2026-11-15T22:59:59.999Z"))).toBe(true)
  })

  it("not after the window: the page would only say „Hodnotit už nejde“", () => {
    expect(canRateEvent(event, "u-jakub", new Date("2026-11-15T23:00:00.000Z"))).toBe(false)
  })

  it.each([
    ["the organizer", { organizer: { id: "u-jakub" } }],
    ["someone without a place", { myParticipation: null }],
    ["a waiting request", { myParticipation: "pending" }],
    ["a cancelled event", { status: "cancelled" as const }],
    ["an event below its minimum (EVENT_NOT_HELD)", { approvedCount: 3 }],
    ["an event not over yet", { endsAt: new Date("2026-11-02T20:00:00.000Z") }],
  ])("not for %s", (_who, overrides) => {
    expect(canRateEvent({ ...event, ...overrides }, "u-jakub", dayAfter)).toBe(false)
  })

  it("without an end: not on its day, from Prague midnight after it, as the API (#272)", () => {
    // 19:00 on Sunday 1. 11. in Prague, no end
    const noEnd = { ...event, endsAt: null }
    expect(canRateEvent(noEnd, "u-jakub", new Date("2026-11-01T20:00:00.000Z"))).toBe(false)
    expect(canRateEvent(noEnd, "u-jakub", new Date("2026-11-01T23:00:00.000Z"))).toBe(true)
  })

  it("not for a visitor", () => {
    expect(canRateEvent(event, null, dayAfter)).toBe(false)
  })
})
