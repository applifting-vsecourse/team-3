import { describe, expect, it } from "vitest"

import { editRefusal } from "@/features/events/lib/editRefusal"

const now = new Date("2026-10-23T08:00:00.000Z")
const event = {
  organizer: { id: "u1", name: "Petra" },
  status: "published" as const,
  startsAt: new Date("2026-10-24T16:00:00.000Z"),
}

describe("editRefusal", () => {
  it("lets the organizer edit a published event that hasn't started", () => {
    expect(editRefusal(event, "u1", now)).toBeNull()
  })

  it("refuses anyone else, and a visitor", () => {
    expect(editRefusal(event, "u2", now)).toBe("Upravit akci může jen její organizátor.")
    expect(editRefusal(event, null, now)).toBe("Upravit akci může jen její organizátor.")
  })

  it("refuses a cancelled event, and one that has started", () => {
    expect(editRefusal({ ...event, status: "cancelled" }, "u1", now)).toBe(
      "Zrušenou akci nejde upravit.",
    )
    expect(editRefusal({ ...event, startsAt: now }, "u1", now)).toBe(
      "Akce už začala, upravit ji nejde.",
    )
  })
})
