import { describe, expect, it } from "vitest"

import { canRateEvent, canRateParticipants, ratingDeadline, ratingOpensPhrase } from "./rating"

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
    // 5 came, the minimum is 4: it took place
    missingToMin: 0,
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
    ["an event below its minimum (EVENT_NOT_HELD)", { approvedCount: 3, missingToMin: 1 }],
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

// the organizer's side (D-05): the API's NOT_ORGANIZER and eventNotRatable
describe("canRateParticipants (#66)", () => {
  const event = {
    startsAt: new Date("2026-11-01T18:00:00.000Z"),
    endsAt: new Date("2026-11-01T20:00:00.000Z"),
    status: "published" as const,
    approvedCount: 5,
    // 5 came, the minimum is 4: it took place
    missingToMin: 0,
    organizer: { id: "u-petra" },
  }
  const dayAfter = new Date("2026-11-02T10:00:00.000Z")

  it("the organizer of an event that took place, within the window", () => {
    expect(canRateParticipants(event, "u-petra", dayAfter)).toBe(true)
    expect(canRateParticipants(event, "u-petra", new Date("2026-11-15T22:59:59.999Z"))).toBe(true)
    expect(canRateParticipants(event, "u-petra", new Date("2026-11-15T23:00:00.000Z"))).toBe(false)
  })

  it.each([
    ["a group's other admin, not its creator", { organizer: { id: "u-admin" } }],
    ["a cancelled event", { status: "cancelled" as const }],
    ["an event below its minimum (EVENT_NOT_HELD)", { approvedCount: 3, missingToMin: 1 }],
    ["an event not over yet", { endsAt: new Date("2026-11-02T20:00:00.000Z") }],
  ])("not for %s", (_who, overrides) => {
    expect(canRateParticipants({ ...event, ...overrides }, "u-petra", dayAfter)).toBe(false)
  })
})

describe("ratingOpensPhrase (PO 26. 11., #434)", () => {
  it("names the end in Prague time, in a sentence's form", () => {
    // 19:30 in Prague, winter time
    expect(ratingOpensPhrase({ endsAt: new Date("2026-10-30T18:30:00.000Z") })).toBe(
      "po skončení, od pá 30. 10. v 19:30",
    )
  })

  it("an end at midnight is that night's day, also over the change of time", () => {
    // 25. 10. 2026 the clocks go back: 23:00 UTC is midnight in Prague on 26. 10.
    expect(ratingOpensPhrase({ endsAt: new Date("2026-10-25T23:00:00.000Z") })).toBe(
      "po skončení, od po 26. 10. v 0:00",
    )
  })

  it("without an end: after the event's day", () => {
    expect(ratingOpensPhrase({ endsAt: null })).toBe("po skončení dne akce")
  })
})
