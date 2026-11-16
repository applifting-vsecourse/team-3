import { describe, expect, it } from "vitest"

import type { MyGroup } from "@/features/groups/api/groupSchemas"
import {
  initialMyGroupsTab,
  memberLine,
  membershipRequestsSummary,
  myGroupsSearchSchema,
  myGroupsSections,
  runningFacts,
  runningLine,
} from "@/features/groups/lib/myGroups"

const aGroup = (
  name: string,
  membership: MyGroup["membership"],
  pendingRequests: number | null = null,
): MyGroup => ({
  id: name,
  name,
  type: "public",
  activity: {
    id: "a",
    slug: "volejbal",
    name: "Volejbal",
    category: { id: "c", slug: "c", name: "Týmové sporty", icon: "ball" },
  },
  locality: { id: "l", slug: "praha-7", name: "Praha 7" },
  memberCount: 6,
  membership,
  pendingRequests,
})

const asked = aGroup("Deskovky Vinohrady", { role: "member", status: "pending" })
const member = aGroup("Běžci ze Stromovky", { role: "member", status: "active" })
const running = (requests = 0) =>
  aGroup("Volejbal Praha 7 – po práci", { role: "admin", status: "active" }, requests)

describe("myGroupsSearchSchema", () => {
  it("?tab=clen and ?tab=spravuju are the chips, anything else lets the page pick", () => {
    expect(myGroupsSearchSchema.parse({ tab: "clen" }).tab).toBe("clen")
    expect(myGroupsSearchSchema.parse({ tab: "spravuju" }).tab).toBe("spravuju")
    expect(myGroupsSearchSchema.parse({ tab: "moje" }).tab).toBeUndefined()
  })
})

describe("myGroupsSections (#304)", () => {
  it("my requests and memberships in Jsem členem, the groups I run in Spravuju", () => {
    expect(myGroupsSections([asked, member, running()])).toEqual({
      pending: [asked],
      joined: [member],
      running: [running()],
    })
  })
})

describe("initialMyGroupsTab (#304, as #188)", () => {
  it("Spravuju while requests wait there, even when I am in other groups", () => {
    expect(initialMyGroupsTab(myGroupsSections([member, running(1)]))).toBe("spravuju")
  })

  it("Spravuju when I only run groups", () => {
    expect(initialMyGroupsTab(myGroupsSections([running()]))).toBe("spravuju")
  })

  it("Jsem členem otherwise, also with no group at all", () => {
    expect(initialMyGroupsTab(myGroupsSections([asked, running()]))).toBe("clen")
    expect(initialMyGroupsTab(myGroupsSections([]))).toBe("clen")
  })
})

describe("runningFacts", () => {
  it("ends with the requests to decide instead of the members (Figma C-05)", () => {
    expect(runningFacts(running(1))).toBe("Volejbal · Praha 7 · 1 žádost čeká")
    expect(runningFacts(running(3))).toBe("Volejbal · Praha 7 · 3 žádosti čekají")
  })

  it("is the card's usual facts with none", () => {
    expect(runningFacts(running(0))).toBeUndefined()
  })
})

describe("membershipRequestsSummary", () => {
  it("sums the requests and names the groups they wait in (Figma C-05)", () => {
    const other = aGroup("Florbal", { role: "admin", status: "active" }, 2)
    expect(membershipRequestsSummary([running(1), other, member])).toEqual({
      title: "3 žádosti o členství čekají na schválení",
      groups: "Volejbal Praha 7 – po práci (1), Florbal (2)",
    })
    expect(membershipRequestsSummary([running(1)])?.title).toBe(
      "1 žádost o členství čeká na schválení",
    )
  })

  it("is null with nothing to decide", () => {
    expect(membershipRequestsSummary([running(0), member])).toBeNull()
  })
})

describe("the band's lines (Figma C-04d, C-05d)", () => {
  it("Jsem členem says how many of my requests wait", () => {
    expect(memberLine(myGroupsSections([member]))).toBe("Skupiny, kde jsi členem.")
    expect(memberLine(myGroupsSections([asked, member]))).toBe(
      "Skupiny, kde jsi členem. Na odpověď čeká 1 tvoje žádost.",
    )
    expect(memberLine(myGroupsSections([asked, asked]))).toBe(
      "Skupiny, kde jsi členem. Na odpověď čekají 2 tvoje žádosti.",
    )
  })

  it("Spravuju says how many requests wait for me", () => {
    expect(runningLine([running(0)])).toBe("Skupiny, které spravuješ.")
    expect(runningLine([running(1)])).toBe(
      "Skupiny, které spravuješ. Na schválení čeká 1 žádost o členství.",
    )
    expect(runningLine(undefined)).toBe("Skupiny, které spravuješ.")
  })
})
