import { describe, expect, it } from "vitest"

import {
  areaPhrase,
  isoDay,
  missingNowLabel,
  missingNowSentence,
  startsIn,
  weekendDays,
  weekendLabel,
} from "@/features/events/lib/homeCopy"

describe("weekend (the API's pragueWeekendOf)", () => {
  it.each([
    ["Monday", "2026-11-02T10:00:00.000Z", "2026-11-07", "2026-11-08", "So 7. – Ne 8. 11."],
    // 23:30 UTC on Friday is Saturday 0:30 in Prague
    [
      "Saturday after midnight",
      "2026-11-06T23:30:00.000Z",
      "2026-11-07",
      "2026-11-08",
      "So 7. – Ne 8. 11.",
    ],
    ["Sunday", "2026-11-08T12:00:00.000Z", "2026-11-08", "2026-11-08", "Ne 8. 11."],
    [
      "across months",
      "2026-10-29T12:00:00.000Z",
      "2026-10-31",
      "2026-11-01",
      "So 31. 10. – Ne 1. 11.",
    ],
  ])("%s", (_, now, from, to, label) => {
    const days = weekendDays(new Date(now))
    expect([isoDay(days.from), isoDay(days.to)]).toEqual([from, to])
    expect(weekendLabel(new Date(now))).toBe(label)
  })
})

describe("startsIn", () => {
  const now = new Date("2026-11-08T10:00:00.000Z")
  it.each([
    ["2026-11-08T20:00:00.000Z", "dnes"],
    // 23:30 UTC is already Monday in Prague
    ["2026-11-08T23:30:00.000Z", "zítra"],
    ["2026-11-10T17:00:00.000Z", "za 2 dny"],
    ["2026-11-12T17:00:00.000Z", "za 4 dny"],
    ["2026-11-13T17:00:00.000Z", "za 5 dní"],
  ])("%s → %s", (startsAt, label) => {
    expect(startsIn(new Date(startsAt), now)).toBe(label)
  })
})

describe("the panel's words", () => {
  it("„Teď chybí jeden“ is the brand's phrase for one, more are numbers", () => {
    expect(missingNowLabel(1)).toBe("Teď chybí jeden")
    expect(missingNowLabel(3)).toBe("Teď chybí 3")
  })

  it("the sentence has the numbers; nobody yet is said so", () => {
    expect(missingNowSentence({ approvedCount: 5, maxParticipants: 10, missingToMin: 1 })).toBe(
      "5 z 10 už jde, do minima chybí 1. Přijď a akce se koná.",
    )
    expect(missingNowSentence({ approvedCount: 0, maxParticipants: 8, missingToMin: 3 })).toBe(
      "Zatím nikdo nejde, do minima chybí 3.",
    )
  })
})

describe("areaPhrase", () => {
  it("all of Czechia, a city, a district (its whole city)", () => {
    expect(areaPhrase(null)).toBe("v celém Česku")
    expect(areaPhrase({ name: "Brno", isDistrict: false })).toBe("v lokalitě Brno")
    expect(areaPhrase({ name: "Praha 3", isDistrict: true })).toBe("v okolí lokality Praha 3")
  })
})
