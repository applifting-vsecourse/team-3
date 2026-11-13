import { describe, expect, it } from "vitest"

import type { Home } from "@/features/events/api/homeSchemas"
import { widenedOkoli } from "@/features/events/lib/widenedOkoli"
import { anEvent } from "@/features/events/test/anEvent"

const home = (isWidened: boolean, ...distances: number[]): Home => ({
  locality: {
    id: "l-police",
    slug: "police-nad-metuji",
    name: "Police nad Metují",
    source: "query",
  },
  isWidened,
  hasLocalityEvents: false,
  sections: [
    {
      key: "missing",
      events: distances.map((distanceKm, i) => anEvent({ id: `e${i}`, distanceKm })),
    },
    { key: "groups", groups: [] },
  ],
})

describe("widenedOkoli (review #321)", () => {
  it("the smallest okolí that holds every event shown", () => {
    expect(widenedOkoli(home(true, 4.2, 8.9))).toBe("10")
    expect(widenedOkoli(home(true, 22.7, 13))).toBe("25")
    expect(widenedOkoli(home(true, 22.7, 46.7))).toBe("50")
  })

  it("strictly below the edge: a rounded 25,0 km may be just past 25", () => {
    expect(widenedOkoli(home(true, 25))).toBe("50")
  })

  it("for a section, only its own cards count", () => {
    const page: Home = {
      ...home(true, 4.2),
      sections: [
        { key: "missing", events: [anEvent({ id: "m", distanceKm: 4.2 })] },
        { key: "popular", events: [anEvent({ id: "p", distanceKm: 63.5 })] },
      ],
    }
    expect(widenedOkoli(page, "missing")).toBe("10")
    expect(widenedOkoli(page, "popular")).toBeUndefined()
    expect(widenedOkoli(page)).toBeUndefined()
  })

  it("none beyond the widest okolí, without events, or when not widened", () => {
    expect(widenedOkoli(home(true, 22.7, 63.5))).toBeUndefined()
    expect(widenedOkoli(home(true))).toBeUndefined()
    expect(widenedOkoli(home(false, 3))).toBeUndefined()
  })
})
