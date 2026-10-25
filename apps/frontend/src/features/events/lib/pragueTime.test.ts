import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { eventTimes, fromPragueWallTime, toPragueWallTime } from "@/features/events/lib/pragueTime"

describe("Prague wall time", () => {
  // the device is elsewhere: the result must not depend on it
  const originalTz = process.env.TZ
  beforeEach(() => {
    process.env.TZ = "America/New_York"
  })
  afterEach(() => {
    process.env.TZ = originalTz
  })

  it("reads an entered time as Prague time, summer and winter", () => {
    // CEST (UTC+2) before the clocks go back on 25. 10. 2026, CET (UTC+1) after
    expect(fromPragueWallTime("2026-10-24T18:00").toISOString()).toBe("2026-10-24T16:00:00.000Z")
    expect(fromPragueWallTime("2026-11-02T18:00").toISOString()).toBe("2026-11-02T17:00:00.000Z")
  })

  it("shows an instant as Prague wall time for the input", () => {
    expect(toPragueWallTime(new Date("2026-10-24T16:00:00.000Z"))).toBe("2026-10-24T18:00")
    expect(toPragueWallTime(new Date("2026-11-02T17:00:00.000Z"))).toBe("2026-11-02T18:00")
  })

  it("round-trips across the DST change", () => {
    for (const value of ["2026-10-25T01:30", "2026-10-25T04:00", "2027-03-28T03:30"]) {
      expect(toPragueWallTime(fromPragueWallTime(value))).toBe(value)
    }
  })
})

describe("eventTimes", () => {
  it("reads the day and the times as Prague time", () => {
    expect(eventTimes("2026-11-02", "19:00", "21:00")).toEqual({
      startsAt: new Date("2026-11-02T18:00:00.000Z"),
      endsAt: new Date("2026-11-02T20:00:00.000Z"),
    })
  })

  it("has no end without one", () => {
    expect(eventTimes("2026-11-02", "19:00", "").endsAt).toBeNull()
  })

  it("an end before the start is the next day", () => {
    expect(eventTimes("2026-11-06", "22:00", "02:00")).toEqual({
      startsAt: new Date("2026-11-06T21:00:00.000Z"),
      endsAt: new Date("2026-11-07T01:00:00.000Z"),
    })
  })
})
