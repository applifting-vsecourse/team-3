import { describe, expect, it } from "vitest"

import type { FriendLists, FriendPerson } from "@/features/friends/api/friendsSchemas"

import { friendsSearchSchema, initialFriendsTab, interestsLine, matchesName } from "./friends"

const person = (name: string, interests: string[] = []): FriendPerson => ({
  id: name,
  name,
  interests: interests.map((interest) => ({ id: interest, name: interest })),
})
const lists = (changes: Partial<FriendLists> = {}): FriendLists => ({
  friends: [],
  incoming: [],
  outgoing: [],
  ...changes,
})

describe("friendsSearchSchema", () => {
  it.each([
    ["pratele", "pratele"],
    ["zadosti", "zadosti"],
    ["neco", undefined],
    [undefined, undefined],
  ])("?tab=%s is %s", (tab, expected) => {
    expect(friendsSearchSchema.parse({ tab }).tab).toBe(expected)
  })
})

describe("initialFriendsTab (#307)", () => {
  it("Žádosti while a request waits for me", () => {
    const request = { person: person("Tomáš"), requestedAt: new Date() }
    expect(initialFriendsTab(lists({ incoming: [request] }))).toBe("zadosti")
  })

  it("Přátelé otherwise — my own requests wait for nobody's answer from me", () => {
    const request = { person: person("Simona"), requestedAt: new Date() }
    expect(initialFriendsTab(lists({ outgoing: [request] }))).toBe("pratele")
    expect(initialFriendsTab(lists())).toBe("pratele")
  })
})

describe("matchesName", () => {
  it.each([
    ["Novák", true],
    ["nováková", true],
    ["novakova", true],
    ["  petra ", true],
    ["", true],
    ["Radek", false],
  ])("„%s“ in Petra Nováková: %s", (query, isMatch) => {
    expect(matchesName(person("Petra Nováková"), query)).toBe(isMatch)
  })

  it("without diacritics either way", () => {
    expect(matchesName(person("Čeněk Malý"), "cenek")).toBe(true)
  })
})

describe("interestsLine", () => {
  it("joins the interests as on the row's second line", () => {
    expect(interestsLine(person("Eva", ["Jóga", "Turistika"]))).toBe("Jóga · Turistika")
  })
})
