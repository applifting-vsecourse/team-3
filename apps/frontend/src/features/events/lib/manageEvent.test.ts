import { describe, expect, it } from "vitest"

import { showsRequests } from "./manageEvent"

describe("showsRequests", () => {
  it("shows them at an event with approval", () => {
    expect(showsRequests({ approvalMode: "approval", status: "published" })).toBe(true)
  })

  it("has none to show at an open event", () => {
    expect(showsRequests({ approvalMode: "open", status: "published" })).toBe(false)
  })

  it("hides them once the event is cancelled (#183)", () => {
    expect(showsRequests({ approvalMode: "approval", status: "cancelled" })).toBe(false)
  })
})
