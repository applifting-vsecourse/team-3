import { describe, expect, it } from "vitest"

import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"

import { toSearchParams } from "@/features/groups/api/groupsQueryOptions"

import { groupsSearchSchema, hasActiveFilters, toGroupFilters } from "./groupsSearch"

const locality = (slug: string): Locality => ({
  id: `l-${slug}`,
  slug,
  name: slug,
  parentId: null,
  lat: 50,
  lng: 14,
})

const teamSports: ActivityCategory = {
  id: "c-tymove-sporty",
  slug: "tymove-sporty",
  name: "Týmové sporty",
  icon: "ball",
  activities: [{ id: "a-florbal", slug: "florbal", name: "Florbal", keywords: [] }],
}

const catalog = { localities: [locality("praha"), locality("praha-9")], categories: [teamSports] }

describe("groupsSearchSchema", () => {
  it("keeps activity and locality, drops anything else", () => {
    expect(
      groupsSearchSchema.parse({
        lokalita: "praha-9",
        aktivita: "florbal",
        obsazenost: "chybi",
        q: "fotbal",
      }),
    ).toEqual({ lokalita: "praha-9", aktivita: "florbal" })
  })

  it("drops a malformed value instead of failing the page", () => {
    expect(groupsSearchSchema.parse({ lokalita: "Praha 9!", kategorie: "hry" })).toEqual({
      lokalita: undefined,
      kategorie: "hry",
    })
  })
})

describe("hasActiveFilters", () => {
  it("Praha is the default, not a filter", () => {
    expect(hasActiveFilters({})).toBe(false)
    expect(hasActiveFilters({ lokalita: "praha" })).toBe(false)
    expect(hasActiveFilters({ lokalita: "praha-9" })).toBe(true)
    expect(hasActiveFilters({ aktivita: "florbal" })).toBe(true)
  })
})

describe("toGroupFilters", () => {
  it("resolves the URL's slugs to the API's ids", () => {
    expect(toGroupFilters({ lokalita: "praha-9", aktivita: "florbal" }, catalog)).toEqual({
      localityId: "l-praha-9",
      activityIds: ["a-florbal"],
      categoryIds: [],
    })
  })
})

describe("toSearchParams", () => {
  it("repeats keys for several activities and categories", () => {
    expect(
      toSearchParams({
        localityId: "l-praha",
        activityIds: ["a1", "a2"],
        categoryIds: ["c1"],
      }).toString(),
    ).toBe("localityId=l-praha&activityId=a1&activityId=a2&categoryId=c1")
  })

  it("sends nothing for empty filters", () => {
    expect(toSearchParams({ activityIds: [], categoryIds: [] }).toString()).toBe("")
  })
})
