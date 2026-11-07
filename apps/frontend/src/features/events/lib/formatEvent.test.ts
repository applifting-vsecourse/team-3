import { describe, expect, it } from "vitest"

import { anEvent } from "@/features/events/test/anEvent"

import {
  approvalModeLabel,
  capacityStatus,
  eventCountLabel,
  eventFacts,
  formatEventStart,
  formatEventTime,
  formatRequestEventStart,
  formatRequestTime,
  groupEventFacts,
  pastEventFacts,
  placeName,
} from "./formatEvent"

describe("formatEventStart", () => {
  it("formats in Prague time, summer and winter", () => {
    expect(formatEventStart(new Date("2026-10-23T15:30:00.000Z"))).toBe("Pá 23. 10. · 17:30")
    // after the clocks go back on 25. 10.
    expect(formatEventStart(new Date("2026-10-26T07:00:00.000Z"))).toBe("Po 26. 10. · 8:00")
  })
})

describe("formatEventTime", () => {
  const start = new Date("2026-10-23T15:30:00.000Z")

  it("is just the start when there is no end", () => {
    expect(formatEventTime(start, null)).toBe("Pá 23. 10. · 17:30")
  })

  it("adds the end time on the same day", () => {
    expect(formatEventTime(start, new Date("2026-10-23T17:30:00.000Z"))).toBe(
      "Pá 23. 10. · 17:30–19:30",
    )
  })

  it("adds the end's day when it ends after midnight in Prague", () => {
    // 22:30 UTC is already Saturday 0:30 in Prague
    expect(formatEventTime(start, new Date("2026-10-23T22:30:00.000Z"))).toBe(
      "Pá 23. 10. · 17:30 – So 24. 10. · 0:30",
    )
  })
})

describe("approvalModeLabel", () => {
  it("names both ways of joining", () => {
    expect(approvalModeLabel("open")).toBe("Bez schválení")
    expect(approvalModeLabel("approval")).toBe("Se schválením organizátora")
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
  it("shows approved of maximum in words and the district, never „4/12“ (#189)", () => {
    expect(eventFacts(anEvent())).toBe("4 z 12 · Praha 8")
  })

  it("below the minimum says the minimum, not „chybí“ — the badge next to it does", () => {
    expect(
      eventFacts(anEvent({ approvedCount: 5, minParticipants: 6, missingToMin: 1, freeSpots: 7 })),
    ).toBe("5 z 12 · min. 6 · Praha 8")
  })

  it("full", () => {
    expect(eventFacts(anEvent({ approvedCount: 12, freeSpots: 0, isFull: true }))).toBe(
      "12 z 12 · Praha 8",
    )
  })

  it("a cancelled event misses no one any more", () => {
    expect(
      eventFacts({ ...anEvent({ approvedCount: 2, missingToMin: 2 }), status: "cancelled" }),
    ).toBe("2 z 12 · Praha 8")
  })
})

describe("groupEventFacts (#70)", () => {
  it("a members-only event says so, a public one doesn't", () => {
    expect(groupEventFacts({ ...anEvent(), visibility: "members" })).toBe(
      "4 z 12 · Praha 8 · jen pro členy",
    )
    expect(groupEventFacts({ ...anEvent(), visibility: "public" })).toBe("4 z 12 · Praha 8")
  })
})

describe("pastEventFacts (#70)", () => {
  it.each([
    [6, "sešlo se 6"],
    [3, "sešli se 3"],
    [1, "sešel se 1"],
    [0, "sešlo se 0"],
  ])("%i came: „%s“", (approvedCount, label) => {
    expect(pastEventFacts({ ...anEvent({ approvedCount }), visibility: "public" })).toBe(label)
  })

  it("members-only says so", () => {
    expect(pastEventFacts({ ...anEvent({ approvedCount: 6 }), visibility: "members" })).toBe(
      "sešlo se 6 · jen pro členy",
    )
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

describe("formatRequestTime", () => {
  it("says when a request was sent, in Prague time (#53)", () => {
    expect(formatRequestTime(new Date("2026-10-23T15:30:00.000Z"))).toBe("Žádost z 23. 10. v 17:30")
  })
})

describe("formatRequestEventStart (#175)", () => {
  it("is the start inside a sentence, in Prague time", () => {
    expect(formatRequestEventStart(new Date("2026-10-23T15:30:00.000Z"))).toBe("pá 23. 10. v 17:30")
    expect(formatRequestEventStart(new Date("2026-10-26T07:00:00.000Z"))).toBe("po 26. 10. v 8:00")
  })
})
