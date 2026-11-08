import { describe, expect, it } from "vitest"

import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"

import { toSearchParams } from "@/features/events/api/eventsQueryOptions"

import {
  effectiveSort,
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

  it("drops an area the API would refuse, so a hand-edited URL is no error", () => {
    expect(eventsSearchSchema.parse({ oblast: "14.6,50,14.3,50.15" }).oblast).toBeUndefined()
    expect(eventsSearchSchema.parse({ oblast: "14.3,95,14.6,96" }).oblast).toBeUndefined()
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

describe("search, okolí and order (#57)", () => {
  const praha8 = catalog.localities.find((l) => l.slug === "praha-8")!

  it("keeps a search, trimmed, and drops an empty or too long one", () => {
    expect(eventsSearchSchema.parse({ q: "  volejbal " }).q).toBe("volejbal")
    expect(eventsSearchSchema.parse({ q: "   " }).q).toBeUndefined()
    expect(eventsSearchSchema.parse({ q: "x".repeat(101) }).q).toBeUndefined()
    expect(toEventFilters({ q: "volejbal" }, catalog).q).toBe("volejbal")
  })

  it("okolí asks for the circle around the locality's centre instead of the locality", () => {
    expect(toEventFilters({ lokalita: "praha-8", okoli: "10" }, catalog)).toMatchObject({
      localityId: undefined,
      lat: praha8.lat,
      lng: praha8.lng,
      radiusKm: 10,
      sort: "distance",
    })
  })

  it("orders nearest first with okolí unless soonest is picked", () => {
    expect(effectiveSort({ lokalita: "praha-8", okoli: "25" }, catalog)).toBe("vzdalenost")
    expect(effectiveSort({ lokalita: "praha-8", okoli: "25", razeni: "termin" }, catalog)).toBe(
      "termin",
    )
    expect(
      toEventFilters({ lokalita: "praha-8", okoli: "25", razeni: "termin" }, catalog).sort,
    ).toBeUndefined()
  })

  it("the distance order alone keeps the locality and sends its centre", () => {
    expect(toEventFilters({ lokalita: "praha-8", razeni: "vzdalenost" }, catalog)).toMatchObject({
      localityId: praha8.id,
      lat: praha8.lat,
      radiusKm: undefined,
      sort: "distance",
    })
  })

  it("has no okolí and no distance in all of Czechia or in a map area", () => {
    for (const search of [
      { lokalita: "cele-cesko", okoli: "10" as const, razeni: "vzdalenost" as const },
      { lokalita: "praha-8", oblast: "14.3,50,14.6,50.15", okoli: "10" as const },
    ]) {
      const filters = toEventFilters(search, catalog)
      expect(filters).toMatchObject({ radiusKm: undefined, sort: undefined })
      expect(filters.lat).toBeUndefined()
      expect(effectiveSort(search, catalog)).toBe("termin")
    }
  })

  it("counts the search and okolí as filters, not the order", () => {
    expect(hasActiveFilters({ q: "kviz" })).toBe(true)
    expect(hasActiveFilters({ okoli: "10" })).toBe(true)
    expect(hasActiveFilters({ razeni: "vzdalenost" })).toBe(false)
  })
})
