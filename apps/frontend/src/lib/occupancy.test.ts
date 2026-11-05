import { describe, expect, it } from "vitest"

import { anOccupancy } from "@/test/anOccupancy"

import {
  freeSpotsLabel,
  occupancyBesideBadge,
  occupancyCount,
  occupancyState,
  occupancyStatus,
  occupancySummary,
} from "./occupancy"

const occupancy = anOccupancy

describe("occupancyCount", () => {
  it("says approved of maximum in words, never „12/20“", () => {
    expect(occupancyCount(occupancy(12, 6, 20))).toBe("12 z 20")
    expect(occupancyCount(occupancy(0, 2, 5))).toBe("0 z 5")
  })
})

describe("freeSpotsLabel", () => {
  it("uses the Czech singular for one place", () => {
    expect([1, 2, 4, 5, 17].map(freeSpotsLabel)).toEqual([
      "1 volné místo",
      "Volná místa: 2",
      "Volná místa: 4",
      "Volná místa: 5",
      "Volná místa: 17",
    ])
  })
})

describe("occupancyState", () => {
  it("missing below the minimum, free from exactly the minimum, full with no place left", () => {
    expect(occupancyState(occupancy(5, 6, 12))).toBe("missing")
    expect(occupancyState(occupancy(6, 6, 12))).toBe("free")
    expect(occupancyState(occupancy(12, 6, 12))).toBe("full")
  })

  it("approvals over the maximum still read as full", () => {
    expect(occupancyState(occupancy(14, 6, 12))).toBe("full")
  })

  it("follows the API's fields, as the status badge does, not a count of its own", () => {
    // 3 of min. 4 would be missing one, but the API says the minimum is reached
    expect(occupancyState(occupancy(3, 4, 12, { missingToMin: 0 }))).toBe("free")
    expect(occupancyState(occupancy(5, 4, 12, { missingToMin: 2 }))).toBe("missing")
    expect(occupancyState(occupancy(5, 4, 12, { isFull: true, freeSpots: 0 }))).toBe("full")
  })
})

describe("occupancyStatus", () => {
  it("below the minimum says how many are still missing", () => {
    expect(occupancyStatus(occupancy(5, 6, 12))).toBe("Chybí ještě 1")
    expect(occupancyStatus(occupancy(0, 4, 12))).toBe("Chybí ještě 4")
  })

  it("from the minimum says the free places, in the right form", () => {
    expect(occupancyStatus(occupancy(8, 8, 10))).toBe("Volná místa: 2")
    expect(occupancyStatus(occupancy(4, 2, 5))).toBe("1 volné místo")
  })

  it("full", () => {
    expect(occupancyStatus(occupancy(12, 6, 12))).toBe("Plno")
  })

  it("says the API's numbers", () => {
    expect(occupancyStatus(occupancy(5, 6, 12, { missingToMin: 3 }))).toBe("Chybí ještě 3")
    expect(occupancyStatus(occupancy(8, 6, 12, { freeSpots: 1 }))).toBe("1 volné místo")
  })

  it("a minimum equal to the maximum: missing until the event is full", () => {
    expect(occupancyStatus(occupancy(3, 4, 4))).toBe("Chybí ještě 1")
    expect(occupancyStatus(occupancy(4, 4, 4))).toBe("Plno")
  })
})

describe("occupancyBesideBadge", () => {
  it("below the minimum the count and the minimum, without „chybí“ — the badge says it", () => {
    expect(occupancyBesideBadge(occupancy(3, 4, 12))).toBe("3 z 12 · min. 4")
  })

  it("from the minimum just the count", () => {
    expect(occupancyBesideBadge(occupancy(4, 4, 12))).toBe("4 z 12")
    expect(occupancyBesideBadge(occupancy(12, 4, 12))).toBe("12 z 12")
  })
})

describe("occupancySummary", () => {
  it("below the minimum starts with how many are missing and ends with the minimum", () => {
    expect(occupancySummary(occupancy(5, 6, 12))).toBe("chybí 1 · 5 z 12 · min. 6")
  })

  it("takes how many are missing from the API, as the badge does", () => {
    expect(occupancySummary(occupancy(5, 6, 12, { missingToMin: 2 }))).toBe(
      "chybí 2 · 5 z 12 · min. 6",
    )
    expect(occupancySummary(occupancy(5, 6, 12, { missingToMin: 0 }))).toBe("5 z 12")
  })

  it("from the minimum just the count", () => {
    expect(occupancySummary(occupancy(6, 6, 12))).toBe("6 z 12")
    expect(occupancySummary(occupancy(12, 6, 12))).toBe("12 z 12")
  })
})
