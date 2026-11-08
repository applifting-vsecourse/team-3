import { describe, expect, it } from "vitest"

import {
  announcementRecipientsLabel,
  formatAnnouncementTime,
  groupBandLine,
  groupCountLabel,
  groupFacts,
  memberCountLabel,
  myGroupTypeLabel,
  remainingAnnouncementsLabel,
  showGroupsLabel,
} from "./formatGroup"

describe("memberCountLabel", () => {
  it.each([
    [0, "0 členů"],
    [1, "1 člen"],
    [2, "2 členové"],
    [4, "4 členové"],
    [5, "5 členů"],
    [22, "22 členů"],
  ])("%i → %s", (count, label) => {
    expect(memberCountLabel(count)).toBe(label)
  })
})

describe("groupCountLabel", () => {
  it.each([
    [0, "0 skupin"],
    [1, "1 skupina"],
    [3, "3 skupiny"],
    [9, "9 skupin"],
  ])("%i → %s", (count, label) => {
    expect(groupCountLabel(count)).toBe(label)
  })
})

describe("showGroupsLabel", () => {
  it("waits for the count, then declines it", () => {
    expect(showGroupsLabel(undefined)).toBe("Zobrazit skupiny")
    expect(showGroupsLabel(1)).toBe("Zobrazit 1 skupinu")
    expect(showGroupsLabel(2)).toBe("Zobrazit 2 skupiny")
    expect(showGroupsLabel(0)).toBe("Zobrazit 0 skupin")
  })
})

describe("groupFacts", () => {
  it("activity · locality · members, as on the card", () => {
    expect(
      groupFacts({
        activity: { name: "Florbal" },
        locality: { name: "Praha 9" },
        memberCount: 8,
      }),
    ).toBe("Florbal · Praha 9 · 8 členů")
  })
})

describe("myGroupTypeLabel", () => {
  it("says that my request waits, else just the type (the role is the section)", () => {
    expect(myGroupTypeLabel({ type: "closed", membership: { status: "pending" } })).toBe(
      "Neveřejná – žádost čeká na schválení",
    )
    expect(myGroupTypeLabel({ type: "public", membership: { status: "active" } })).toBe("Veřejná")
  })
})

describe("announcements (#194)", () => {
  it("the time is Prague time: 23:30 UTC in winter is already the next day", () => {
    expect(formatAnnouncementTime(new Date("2026-10-22T18:10:00.000Z"))).toBe("čt 22. 10. v 20:10")
    expect(formatAnnouncementTime(new Date("2026-11-07T23:30:00.000Z"))).toBe("ne 8. 11. v 0:30")
  })

  it.each([
    // only the admin: nobody else to write to
    [
      1,
      "Ve skupině zatím nikdo další není. E-mail přijde jen tobě a oznámení zůstane na stránce skupiny pro nové členy.",
    ],
    [
      2,
      "Oznámení přijde e-mailem všem 2 aktivním členům a uvidí ho na stránce skupiny. Čekající žadatelé ho nedostanou.",
    ],
    [
      5,
      "Oznámení přijde e-mailem všem 5 aktivním členům a uvidí ho na stránce skupiny. Čekající žadatelé ho nedostanou.",
    ],
  ])("%i active members, the admin included: %s", (count, label) => {
    expect(announcementRecipientsLabel(count)).toBe(label)
  })

  it("says what is left of today's limit, and when nothing is", () => {
    expect(remainingAnnouncementsLabel(3)).toBe("Dnes můžeš skupině poslat ještě 3 oznámení.")
    expect(remainingAnnouncementsLabel(1)).toBe("Dnes můžeš skupině poslat ještě 1 oznámení.")
    expect(remainingAnnouncementsLabel(0)).toBe(
      "Dnes už skupině další oznámení poslat nemůžeš. Zkus to zítra.",
    )
  })
})

describe("groupBandLine (Figma A-08d)", () => {
  it("type, locality and members", () => {
    expect(groupBandLine({ type: "closed", locality: { name: "Praha 2" }, memberCount: 5 })).toBe(
      "Neveřejná skupina · Praha 2 · 5 členů",
    )
    expect(groupBandLine({ type: "public", locality: { name: "Brno" }, memberCount: 1 })).toBe(
      "Veřejná skupina · Brno · 1 člen",
    )
  })
})
