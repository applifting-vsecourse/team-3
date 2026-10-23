import { describe, expect, it } from "vitest"

import { anEvent } from "@/features/events/test/anEvent"

import {
  capacityStatus,
  eventCountLabel,
  eventFacts,
  formatEventStart,
  placeName,
} from "./formatEvent"

describe("formatEventStart", () => {
  it("formats in Prague time, summer and winter", () => {
    expect(formatEventStart(new Date("2026-10-23T15:30:00.000Z"))).toBe("Pá 23. 10. · 17:30")
    // after the clocks go back on 25. 10.
    expect(formatEventStart(new Date("2026-10-26T07:00:00.000Z"))).toBe("Po 26. 10. · 8:00")
  })
})

describe("placeName", () => {
  it("takes the address up to the first comma", () => {
    expect(placeName("Kavárna Pražírna, Dělnická 12, Praha 7")).toBe("Kavárna Pražírna")
    expect(placeName("Stromovka")).toBe("Stromovka")
  })
})

describe("capacityStatus", () => {
  it("missing people, free places, full", () => {
    expect(capacityStatus(anEvent({ missingToMin: 2 }))).toEqual({ kind: "missing", missing: 2 })
    expect(capacityStatus(anEvent())).toEqual({ kind: "free" })
    expect(capacityStatus(anEvent({ isFull: true, freeSpots: 0 }))).toEqual({ kind: "full" })
  })
})

describe("eventFacts", () => {
  it("shows approved of maximum and the district", () => {
    expect(eventFacts(anEvent())).toBe("4/12 · Praha 8")
  })
})

describe("eventCountLabel", () => {
  it("uses Czech plural forms", () => {
    expect([0, 1, 2, 4, 5, 24].map(eventCountLabel)).toEqual([
      "0 akcí",
      "1 akce",
      "2 akce",
      "4 akce",
      "5 akcí",
      "24 akcí",
    ])
  })
})
