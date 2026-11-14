import { describe, expect, it } from "vitest"

import { initialMySection } from "@/routes/_ProtectedPages/-moje/initialMySection"

import { aMyEvent } from "@/features/events/test/anEvent"
import type { MyGroup } from "@/features/groups/api/groupSchemas"

const running = (pendingRequests: number): MyGroup => ({
  id: "g1",
  name: "Florbal Praha 9 – pokročilí",
  type: "closed",
  activity: {
    id: "a",
    slug: "florbal",
    name: "Florbal",
    category: { id: "c", slug: "c", name: "Týmové sporty", icon: "ball" },
  },
  locality: { id: "l", slug: "praha-9", name: "Praha 9" },
  memberCount: 5,
  membership: { role: "admin", status: "active" },
  pendingRequests,
})

describe("initialMySection (#304)", () => {
  it("Skupiny when only requests to join my groups wait", () => {
    expect(initialMySection([aMyEvent({ pendingRequests: 0 })], [running(3)])).toBe("skupiny")
  })

  it("Akce when requests for my events wait, also with group requests", () => {
    expect(initialMySection([aMyEvent({ pendingRequests: 2 })], [running(3)])).toBe("akce")
  })

  it("Akce with nothing to decide, or what failed to load", () => {
    expect(initialMySection([], [running(0)])).toBe("akce")
    expect(initialMySection(undefined, undefined)).toBe("akce")
  })
})
