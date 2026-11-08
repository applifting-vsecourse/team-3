import { describe, expect, it } from "vitest"

import { anOccupancy } from "@/test/anOccupancy"

import {
  freeSpotsLabel,
  gatheredLabel,
  happeningThanks,
  isMinimumReachedByLast,
  missedMinimumLabel,
  missingLabel,
  occupancyBesideBadge,
  occupancyCount,
  occupancyInBand,
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
  // Figma Capacity bar › Free: the status badge's form
  it("uses the Czech forms for one, two to four and five and more", () => {
    expect([1, 2, 4, 5, 17].map(freeSpotsLabel)).toEqual([
      "1 volné místo",
      "2 volná místa",
      "4 volná místa",
      "5 volných míst",
      "17 volných míst",
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
    expect(occupancyStatus(occupancy(8, 8, 10))).toBe("2 volná místa")
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

  // Figma C-01d, C-02d: „9 z 14 · min. 8“, „8 z 8 · min. 6“
  it("from the minimum the count with the minimum too", () => {
    expect(occupancyBesideBadge(occupancy(4, 4, 12))).toBe("4 z 12 · min. 4")
    expect(occupancyBesideBadge(occupancy(12, 4, 12))).toBe("12 z 12 · min. 4")
  })
})

describe("missingLabel", () => {
  it("says how many are missing, inside a line", () => {
    expect(missingLabel(1)).toBe("chybí 1")
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
    expect(occupancySummary(occupancy(5, 6, 12, { missingToMin: 0 }))).toBe("5 z 12 · min. 6")
  })

  it("from the minimum the count with the minimum", () => {
    expect(occupancySummary(occupancy(6, 6, 12))).toBe("6 z 12 · min. 6")
    expect(occupancySummary(occupancy(12, 6, 12))).toBe("12 z 12 · min. 6")
  })
})

describe("occupancyInBand", () => {
  // Figma A-05d, A-05c
  it("below the minimum how many are missing, from the API", () => {
    expect(occupancyInBand(occupancy(5, 6, 10))).toBe("do minima chybí 1")
    expect(occupancyInBand(occupancy(5, 6, 10, { missingToMin: 2 }))).toBe("do minima chybí 2")
  })

  it("from the minimum the count, and that the minimum is reached", () => {
    expect(occupancyInBand(occupancy(6, 6, 10))).toBe("6 z 10, minimum je naplněné")
  })

  it("full says so", () => {
    expect(occupancyInBand(occupancy(10, 6, 10))).toBe("10 z 10, plno")
  })
})

describe("isMinimumReachedByLast", () => {
  it("only the place that makes the approved count equal the minimum", () => {
    expect(isMinimumReachedByLast({ approvedCount: 4, minParticipants: 4 })).toBe(true)
    expect(isMinimumReachedByLast({ approvedCount: 5, minParticipants: 4 })).toBe(false)
    expect(isMinimumReachedByLast({ approvedCount: 3, minParticipants: 4 })).toBe(false)
  })
})

describe("happeningThanks", () => {
  it.each([
    [6, 6, "Díky tobě se akce koná – sešlo se 6 lidí, minimum je 6."],
    [3, 3, "Díky tobě se akce koná – sešli se 3 lidé, minimum je 3."],
    [1, 1, "Díky tobě se akce koná."],
  ])("%i of minimum %i: „%s“", (approvedCount, minParticipants, text) => {
    expect(happeningThanks({ approvedCount, minParticipants })).toBe(text)
  })
})

describe("gatheredLabel", () => {
  it("in Czech forms for one, two to four and five and more", () => {
    expect([1, 3, 5].map(gatheredLabel)).toEqual([
      "Sešel se 1 člověk",
      "Sešli se 3 lidé",
      "Sešlo se 5 lidí",
    ])
  })
})

describe("missedMinimumLabel (review #269)", () => {
  it.each([
    [0, 4, "Nikdo se nepřihlásil."],
    [3, 1, "Do minima chyběl 1 člověk."],
    [2, 2, "Do minima chyběli 2 lidé."],
    [1, 5, "Do minima chybělo 5 lidí."],
  ])("%i přihlášených, chybí %i: „%s“", (approvedCount, missingToMin, label) => {
    expect(missedMinimumLabel({ approvedCount, missingToMin })).toBe(label)
  })
})
