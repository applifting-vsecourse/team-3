import { describe, expect, it } from "vitest"

import {
  canWriteToParticipants,
  messageRecipientCount,
  messageRecipientsLabel,
  remainingMessagesLabel,
} from "./eventMessages"
import { formatMessageTime } from "./formatEvent"

const organizer = { id: "u-petra", name: "Petra Nováková" }

describe("canWriteToParticipants (#176)", () => {
  it("only the organizer of a published event", () => {
    expect(canWriteToParticipants({ status: "published", organizer }, "u-petra")).toBe(true)
    expect(canWriteToParticipants({ status: "published", organizer }, "u-jakub")).toBe(false)
    expect(canWriteToParticipants({ status: "published", organizer }, null)).toBe(false)
    expect(canWriteToParticipants({ status: "cancelled", organizer }, "u-petra")).toBe(false)
  })
})

describe("messageRecipientCount", () => {
  it("the approved participants without the organizer", () => {
    expect(
      messageRecipientCount([{ id: "u-petra" }, { id: "u-jana" }, { id: "u-tomas" }], "u-petra"),
    ).toBe(2)
    expect(messageRecipientCount(undefined, "u-petra")).toBeUndefined()
  })
})

describe("messageRecipientsLabel (Figma D-04)", () => {
  it.each([
    [
      0,
      "Akce zatím nemá žádné schválené účastníky. Zpráva zůstane na detailu akce a uvidí ji ti, kdo se přihlásí.",
    ],
    [1, "Zpráva přijde e-mailem 1 schválenému účastníkovi a uvidí ji na detailu akce."],
    [4, "Zpráva přijde e-mailem všem 4 schváleným účastníkům a uvidí ji na detailu akce."],
  ])("%i: %s", (count, label) => {
    expect(messageRecipientsLabel(count)).toBe(label)
  })
})

describe("remainingMessagesLabel", () => {
  it.each([
    [10, "Dnes můžeš k akci poslat ještě 10 zpráv."],
    [5, "Dnes můžeš k akci poslat ještě 5 zpráv."],
    [3, "Dnes můžeš k akci poslat ještě 3 zprávy."],
    [1, "Dnes můžeš k akci poslat ještě 1 zprávu."],
    [0, "Dnes už k akci další zprávu poslat nemůžeš. Zkus to zítra."],
  ])("%i left: %s", (remaining, label) => {
    expect(remainingMessagesLabel(remaining)).toBe(label)
  })
})

describe("formatMessageTime (Figma A-05c)", () => {
  it("is Prague time: 23:30 UTC in winter is already the next day", () => {
    expect(formatMessageTime(new Date("2026-10-23T14:20:00.000Z"))).toBe("pá 23. 10. v 16:20")
    expect(formatMessageTime(new Date("2026-11-07T23:30:00.000Z"))).toBe("ne 8. 11. v 0:30")
  })
})
