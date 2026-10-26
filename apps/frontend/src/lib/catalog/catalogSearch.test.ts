import { describe, expect, it } from "vitest"

import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"

import {
  hasCatalogFilters,
  joinSlugs,
  splitSlugs,
  toActivitySearch,
  toActivitySelection,
  toCatalogFilters,
} from "./catalogSearch"

const locality = (slug: string, parentId: string | null = null): Locality => ({
  id: `l-${slug}`,
  slug,
  name: slug,
  parentId,
  lat: 50,
  lng: 14,
})

const games: ActivityCategory = {
  id: "c-hry",
  slug: "hry",
  name: "Hry",
  icon: "dice",
  activities: [{ id: "a-sachy", slug: "sachy", name: "Šachy", keywords: [] }],
}

const catalog = { localities: [locality("praha"), locality("brno")], categories: [games] }

describe("slug lists", () => {
  it("round-trip through the URL", () => {
    expect(splitSlugs(joinSlugs(["volejbal", "florbal"]))).toEqual(["volejbal", "florbal"])
    expect(joinSlugs([])).toBeUndefined()
    expect(splitSlugs(undefined)).toEqual([])
  })

  it("an activity selection round-trips through the URL", () => {
    const selection = { categories: ["hry"], activities: ["volejbal"] }
    expect(toActivitySelection(toActivitySearch(selection))).toEqual(selection)
    expect(toActivitySearch({ categories: [], activities: [] })).toEqual({
      kategorie: undefined,
      aktivita: undefined,
    })
  })
})

describe("hasCatalogFilters", () => {
  it("Praha is the default, not a filter", () => {
    expect(hasCatalogFilters({})).toBe(false)
    expect(hasCatalogFilters({ lokalita: "praha" })).toBe(false)
    expect(hasCatalogFilters({ lokalita: "brno" })).toBe(true)
    // the whole of Czechia instead of the default Praha is a filter too
    expect(hasCatalogFilters({ lokalita: "cele-cesko" })).toBe(true)
    expect(hasCatalogFilters({ kategorie: "hry" })).toBe(true)
    expect(hasCatalogFilters({ aktivita: "sachy" })).toBe(true)
  })
})

describe("toCatalogFilters", () => {
  it("without a locality uses Praha", () => {
    expect(toCatalogFilters({}, catalog)).toEqual({
      localityId: "l-praha",
      activityIds: [],
      categoryIds: [],
    })
  })

  it("resolves slugs to ids and drops unknown ones", () => {
    expect(
      toCatalogFilters(
        { lokalita: "brno", kategorie: "hry,nic", aktivita: "sachy,kriket" },
        catalog,
      ),
    ).toEqual({ localityId: "l-brno", activityIds: ["a-sachy"], categoryIds: ["c-hry"] })
    expect(toCatalogFilters({ lokalita: "atlantida" }, catalog).localityId).toBeUndefined()
  })

  it("Celé Česko asks for no locality at all", () => {
    expect(toCatalogFilters({ lokalita: "cele-cesko", kategorie: "hry" }, catalog)).toEqual({
      localityId: undefined,
      activityIds: [],
      categoryIds: ["c-hry"],
    })
  })
})
