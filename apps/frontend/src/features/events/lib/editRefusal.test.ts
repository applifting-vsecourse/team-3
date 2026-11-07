import { describe, expect, it } from "vitest"

import { editRefusal } from "@/features/events/lib/editRefusal"

const now = new Date("2026-10-23T08:00:00.000Z")
const event = {
  canManage: true,
  group: null,
  status: "published" as const,
  startsAt: new Date("2026-10-24T16:00:00.000Z"),
}

describe("editRefusal", () => {
  it("lets who manages it (organizer, group admin) edit a published event that hasn't started", () => {
    expect(editRefusal(event, now)).toBeNull()
  })

  it("refuses anyone else, and a visitor", () => {
    expect(editRefusal({ ...event, canManage: false }, now)).toBe(
      "Upravit akci může jen její organizátor.",
    )
  })

  it("a group's event names its admins too (#70)", () => {
    expect(
      editRefusal({ ...event, canManage: false, group: { id: "g1", name: "Florbal" } }, now),
    ).toBe("Upravit akci může jen její organizátor nebo správce skupiny.")
  })

  it("refuses a cancelled event, and one that has started", () => {
    expect(editRefusal({ ...event, status: "cancelled" }, now)).toBe("Zrušenou akci nejde upravit.")
    expect(editRefusal({ ...event, startsAt: now }, now)).toBe("Akce už začala, upravit ji nejde.")
  })
})
