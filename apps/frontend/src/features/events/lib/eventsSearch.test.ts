import { describe, expect, it } from "vitest"

import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"

import { toSearchParams } from "@/features/events/api/eventsQueryOptions"

import {
  eventsSearchSchema,
  hasActiveFilters,
  toEventFilters,
  toMapArea,
  toOblast,
} from "./eventsSearch"

const locality = (slug: string, parentId: string | null = null): Locality => ({
  id: `l-${slug}`,
  slug,
  name: slug,
  parentId,
  lat: 50,
  lng: 14,
})

const catalog: { localities: Locality[]; categories: ActivityCategory[] } = {
  localities: [locality("praha"), locality("praha-8", "l-praha"), locality("brno")],
  categories: [
    {
      id: "c-hry",
      slug: "hry",
      name: "Hry",
      icon: "dice",
      activities: [{ id: "a-sachy", slug: "sachy", name: "Šachy", keywords: [] }],
    },
    {
      id: "c-tymove",
      slug: "tymove-sporty",
      name: "Týmové sporty",
      icon: "ball",
      activities: [
        { id: "a-volejbal", slug: "volejbal", name: "Volejbal", keywords: [] },
        { id: "a-florbal", slug: "florbal", name: "Florbal", keywords: [] },
      ],
    },
  ],
}

describe("eventsSearchSchema", () => {
  it("reads the filters as the router parses them from the URL", () => {
    expect(
      eventsSearchSchema.parse({
        lokalita: "praha-8",
        od: "2026-10-24",
        do: "2026-10-25",
        kategorie: "hry",
        aktivita: "volejbal,florbal",
        obsazenost: "chybi",
      }),
    ).toEqual({
      lokalita: "praha-8",
      od: "2026-10-24",
      do: "2026-10-25",
      kategorie: "hry",
      aktivita: "volejbal,florbal",
      obsazenost: "chybi",
    })
  })

  it("drops malformed values instead of failing the page", () => {
    expect(
      eventsSearchSchema.parse({
        lokalita: "Praha 8",
        od: "24. 10.",
        kategorie: "hry,,",
        obsazenost: "plno",
      }),
    ).toEqual({})
  })
})

describe("toEventFilters", () => {
  it("filters nothing without filters, no fixed Praha (#55)", () => {
    expect(toEventFilters({}, catalog)).toEqual({
      localityId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      activityIds: [],
      categoryIds: [],
      capacity: undefined,
    })
  })

  it("resolves slugs to ids", () => {
    expect(
      toEventFilters(
        {
          lokalita: "praha-8",
          od: "2026-10-24",
          do: "2026-10-25",
          kategorie: "hry",
          aktivita: "volejbal",
          obsazenost: "chybi",
        },
        catalog,
      ),
    ).toEqual({
      localityId: "l-praha-8",
      dateFrom: "2026-10-24",
      dateTo: "2026-10-25",
      activityIds: ["a-volejbal"],
      categoryIds: ["c-hry"],
      capacity: "missing",
    })
  })

  it("leaves out slugs the catalog doesn't know", () => {
    const filters = toEventFilters({ lokalita: "atlantida", aktivita: "volejbal,kriket" }, catalog)
    expect(filters.localityId).toBeUndefined()
    expect(filters.activityIds).toEqual(["a-volejbal"])
  })

  it("keeps only the start of an inverted range", () => {
    const filters = toEventFilters({ od: "2026-10-30", do: "2026-10-24" }, catalog)
    expect(filters).toMatchObject({ dateFrom: "2026-10-30", dateTo: undefined })
  })
})

describe("hasActiveFilters", () => {
  it("counts nothing without a filter in the URL", () => {
    expect(hasActiveFilters({})).toBe(false)
  })

  it("counts every other filter", () => {
    expect(hasActiveFilters({ lokalita: "praha-8" })).toBe(true)
    expect(hasActiveFilters({ od: "2026-10-24" })).toBe(true)
    expect(hasActiveFilters({ do: "2026-10-25" })).toBe(true)
    expect(hasActiveFilters({ kategorie: "hry" })).toBe(true)
    expect(hasActiveFilters({ aktivita: "volejbal" })).toBe(true)
    expect(hasActiveFilters({ obsazenost: "volna" })).toBe(true)
  })
})

describe("toSearchParams", () => {
  it("repeats keys for several activities and categories", () => {
    const params = toSearchParams({
      localityId: "l-praha",
      dateFrom: "2026-10-24",
      activityIds: ["a1", "a2"],
      categoryIds: ["c1"],
      capacity: "missing",
    })
    expect(params.toString()).toBe(
      "localityId=l-praha&dateFrom=2026-10-24&activityId=a1&activityId=a2&categoryId=c1&capacity=missing",
    )
  })

  it("sends nothing for empty filters", () => {
    expect(toSearchParams({ activityIds: [], categoryIds: [] }).toString()).toBe("")
  })
})

describe("?oblast= (#56)", () => {
  it("keeps a valid area and drops a malformed one", () => {
    expect(eventsSearchSchema.parse({ oblast: "14.3,50,14.6,50.15" }).oblast).toBe(
      "14.3,50,14.6,50.15",
    )
    expect(eventsSearchSchema.parse({ oblast: "praha" }).oblast).toBeUndefined()
  })

  it("asks for the area instead of the locality", () => {
    expect(
      toEventFilters({ lokalita: "praha", oblast: "16.5,49.1,16.7,49.3" }, catalog),
    ).toMatchObject({ localityId: undefined, bbox: "16.5,49.1,16.7,49.3" })
  })

  it("is a filter „Zrušit vše“ clears", () => {
    expect(hasActiveFilters({ oblast: "16.5,49.1,16.7,49.3" })).toBe(true)
  })

  it("turns into the map's area and back", () => {
    const area = { west: 16.5, south: 49.1, east: 16.7, north: 49.3 }
    expect(toMapArea(toOblast(area))).toEqual(area)
    expect(toMapArea("16.7,49.1,16.5,49.3")).toBeUndefined()
    expect(toMapArea(undefined)).toBeUndefined()
  })
})
