import { describe, expect, it } from "vitest"

import { eventKeys } from "@/features/events/api/eventsQueryOptions"
import { HOME_SIGNED_IN_STALE_TIME, homeQueryOptions } from "@/features/events/api/homeQueryOptions"

describe("homeQueryOptions", () => {
  it("a signed-in user's random pick doesn't reshuffle when the window gets focus (review #263)", () => {
    expect(homeQueryOptions(null, "u1").staleTime).toBe(HOME_SIGNED_IN_STALE_TIME)
    expect(HOME_SIGNED_IN_STALE_TIME).toBeGreaterThanOrEqual(10 * 60 * 1000)
    // a visitor's sections have no random pick: fresh on focus as every list
    expect(homeQueryOptions(null, null).staleTime).toBe(0)
  })

  it("is under the event lists, so joining or leaving an event refreshes it", () => {
    const key = homeQueryOptions("l1", "u1").queryKey
    expect(key.slice(0, eventKeys.lists().length)).toEqual([...eventKeys.lists()])
    expect(key).toContain("u1")
  })

  it("waits while the page's locality is unknown", () => {
    expect(typeof homeQueryOptions(undefined, null).queryFn).not.toBe("function")
  })
})
