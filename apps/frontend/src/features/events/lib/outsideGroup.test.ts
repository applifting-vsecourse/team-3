import { describe, expect, it } from "vitest"

import { isOutsideGroup } from "@/features/events/lib/outsideGroup"

const membersOnly = {
  visibility: "members" as const,
  canModerate: true,
  organizer: { id: "u1", name: "Petra" },
}

describe("isOutsideGroup (#308, review #380)", () => {
  it("the superadmin outside the group of a members-only event", () => {
    expect(isOutsideGroup(membersOnly, "admin", null)).toBe(true)
    expect(isOutsideGroup(membersOnly, "admin", { status: "pending" })).toBe(true)
  })

  it("while the group loads too, so „Přijdu“ never flashes", () => {
    expect(isOutsideGroup(membersOnly, "admin", undefined)).toBe(true)
  })

  it("not the superadmin who is a member", () => {
    expect(isOutsideGroup(membersOnly, "admin", { status: "active" })).toBe(false)
  })

  it("not its organizer", () => {
    expect(isOutsideGroup(membersOnly, "u1", null)).toBe(false)
  })

  it("not a public or private event", () => {
    expect(isOutsideGroup({ ...membersOnly, visibility: "public" }, "admin", null)).toBe(false)
    expect(isOutsideGroup({ ...membersOnly, visibility: "private" }, "admin", null)).toBe(false)
  })

  it("nobody but the superadmin: the API keeps everyone else out before the detail", () => {
    expect(isOutsideGroup({ ...membersOnly, canModerate: false }, "u9", null)).toBe(false)
  })
})
