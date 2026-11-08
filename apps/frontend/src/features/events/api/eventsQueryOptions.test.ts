import { describe, expect, it } from "vitest"

import { eventsPath, eventsQueryOptions, toSearchParams } from "./eventsQueryOptions"

const none = { activityIds: [], categoryIds: [] }

describe("events requests of the quick picks (#250)", () => {
  it("a pick with personal parts goes to GET /api/home/events with them", () => {
    const filters = { ...none, interests: true, notJoined: true, capacity: "missing" as const }
    expect(eventsPath(filters)).toBe("home/events")
    expect(toSearchParams(filters).toString()).toBe(
      "capacity=missing&interests=true&notJoined=true",
    )
    expect(eventsPath({ ...none, wellRated: true })).toBe("home/events")
    expect(eventsPath(none)).toBe("events")
  })

  it("keeps each viewer's personal results apart, and sends no viewer", () => {
    const filters = { ...none, interests: true }
    expect(eventsQueryOptions({ ...filters, viewerId: "u1" }).queryKey).not.toEqual(
      eventsQueryOptions({ ...filters, viewerId: "u2" }).queryKey,
    )
    expect(toSearchParams({ ...filters, viewerId: "u1" }).has("viewerId")).toBe(false)
  })
})
