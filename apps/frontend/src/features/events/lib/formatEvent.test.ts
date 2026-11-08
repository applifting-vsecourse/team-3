import { describe, expect, it } from "vitest"

import { anEvent } from "@/features/events/test/anEvent"

import {
  approvalModeLabel,
  capacityStatus,
  eventCountLabel,
  eventDateParts,
  formatEventDay,
  formatEventStart,
  formatEventTime,
  formatRequestEventStart,
  formatRequestTime,
  groupEventTail,
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
    expect(capacityStatus(anEvent())).toEqual({ kind: "free", freeSpots: 8 })
    expect(capacityStatus(anEvent({ isFull: true, freeSpots: 0 }))).toEqual({ kind: "full" })
  })
})

// Figma Karta akce › Datum, in Prague time wherever the browser is
describe("eventDateParts", () => {
  it("the weekday, the day and the time for the date tile", () => {
    expect(eventDateParts(new Date("2026-10-23T15:30:00.000Z"))).toEqual({
      weekday: "Pá",
      day: "23",
      time: "17:30",
    })
  })
})

describe("formatEventDay", () => {
  it("a past event's day without the time", () => {
    expect(formatEventDay(new Date("2026-10-19T16:00:00.000Z"))).toBe("Po 19. 10.")
  })
})

describe("groupEventTail (#70)", () => {
  it("a members-only event says so after its place, a public one keeps the card's line", () => {
    expect(groupEventTail({ ...anEvent(), visibility: "members" })).toBe(
      "Kavárna Pražírna · Praha 8 · jen pro členy",
    )
    expect(groupEventTail({ ...anEvent(), visibility: "public" })).toBeUndefined()
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
