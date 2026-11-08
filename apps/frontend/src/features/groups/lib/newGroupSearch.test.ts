import { describe, expect, it } from "vitest"

import type { Catalog } from "@/lib/catalog/catalogSearch"

import { newGroupPrefill, newGroupSearchFrom, newGroupSearchSchema } from "./newGroupSearch"

const catalog = {
  localities: [{ id: "l-novy-bor", slug: "novy-bor", name: "Nový Bor" }],
  categories: [
    {
      id: "c-priroda",
      slug: "priroda",
      name: "Příroda",
      icon: "mountain",
      activities: [
        { id: "a-zahrada", slug: "komunitni-zahrada", name: "Komunitní zahrada", keywords: [] },
      ],
    },
  ],
} as unknown as Catalog

describe("newGroupSearchFrom (Figma A-07e)", () => {
  it("takes one activity and the locality", () => {
    expect(newGroupSearchFrom({ aktivita: "komunitni-zahrada", lokalita: "novy-bor" })).toEqual({
      aktivita: "komunitni-zahrada",
      lokalita: "novy-bor",
    })
  })

  it("leaves out several activities and the whole country", () => {
    expect(newGroupSearchFrom({ aktivita: "florbal,volejbal", lokalita: "cele-cesko" })).toEqual({})
  })
})

describe("newGroupPrefill", () => {
  it("turns the slugs into the form's ids", () => {
    expect(
      newGroupPrefill({ aktivita: "komunitni-zahrada", lokalita: "novy-bor" }, catalog),
    ).toEqual({ activityId: "a-zahrada", localityId: "l-novy-bor" })
  })

  it("drops what the catalog doesn't know, and a malformed value", () => {
    expect(newGroupPrefill({ aktivita: "neznama" }, catalog)).toEqual({})
    expect(newGroupSearchSchema.parse({ aktivita: "Nic!" })).toEqual({})
  })
})
