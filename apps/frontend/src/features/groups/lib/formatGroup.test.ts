import { describe, expect, it } from "vitest"

import { groupCountLabel, groupFacts, memberCountLabel, showGroupsLabel } from "./formatGroup"

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
