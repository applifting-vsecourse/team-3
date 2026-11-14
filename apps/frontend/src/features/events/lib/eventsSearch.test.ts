import { describe, expect, it } from "vitest"

import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"

import { toSearchParams } from "@/features/events/api/eventsQueryOptions"

import {
  changesPick,
  effectiveSort,
  eventsSearchSchema,
  hasActiveFilters,
  hasFiltersBeyondPick,
  isAllEvents,
  nearestFilters,
  pickSearch,
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

describe("quick picks (#250)", () => {
  // Wednesday 11. 11. 2026: the weekend is 14.–15. 11.
  const now = new Date("2026-11-11T10:00:00.000Z")

  it("a tab keeps the locality and okolí and sets its own filters", () => {
    const search = { lokalita: "praha-8", okoli: "25" as const, q: "kviz", kategorie: "hry" }
    expect(pickSearch("tento-vikend", search, now)).toEqual({
      lokalita: "praha-8",
      okoli: "25",
      od: "2026-11-14",
      do: "2026-11-15",
      vyber: "tento-vikend",
    })
    expect(pickSearch("tady-chybis", { lokalita: "praha-8" }, now)).toMatchObject({
      obsazenost: "chybi",
      okoli: "10",
      vyber: "tady-chybis",
    })
    expect(pickSearch(undefined, search, now)).toEqual({ lokalita: "praha-8", okoli: "25" })
  })

  it("an okolí the pick turned on leaves with it, one set by hand stays (review #326)", () => {
    const picked = pickSearch("tady-chybis", { lokalita: "praha-8" }, now)
    expect(pickSearch(undefined, picked, now)).toEqual({ lokalita: "praha-8", okoli: undefined })
    expect(pickSearch("tento-vikend", picked, now)).toMatchObject({ okoli: undefined })
    expect(pickSearch("kousek-od-tebe", picked, now)).toMatchObject({ okoli: "10" })

    const byHand = pickSearch("tady-chybis", { lokalita: "praha-8", okoli: "25" }, now)
    expect(byHand.okoli).toBe("25")
    expect(pickSearch(undefined, byHand, now)).toMatchObject({ okoli: "25" })
  })

  it("changing a filter the pick set leaves the pick, another filter keeps it", () => {
    const search = pickSearch("tady-chybis", { lokalita: "praha-8" }, now)
    expect(changesPick(search, { obsazenost: undefined }, now)).toBe(true)
    expect(changesPick(search, { okoli: "50" }, now)).toBe(true)
    expect(changesPick(search, { kategorie: "hry" }, now)).toBe(false)
    expect(changesPick(search, { lokalita: "brno" }, now)).toBe(false)
  })

  it("„Zrušit vše“ only for a filter beyond the pick", () => {
    const search = pickSearch("tento-vikend", { lokalita: "praha-8" }, now)
    expect(hasFiltersBeyondPick(search, now)).toBe(false)
    expect(hasFiltersBeyondPick({ ...search, aktivita: "volejbal" }, now)).toBe(true)
  })

  it("„Všechny akce“ is active with just the locality and okolí", () => {
    expect(isAllEvents({ lokalita: "praha-8", okoli: "10" })).toBe(true)
    expect(isAllEvents({ lokalita: "praha-8", q: "kviz" })).toBe(false)
    expect(isAllEvents({ vyber: "tento-vikend" })).toBe(false)
  })

  it("asks for the personal parts of a pick", () => {
    expect(toEventFilters({ vyber: "tady-chybis" }, catalog)).toMatchObject({
      interests: true,
      notJoined: true,
    })
    expect(toEventFilters({ vyber: "od-hodnocenych" }, catalog)).toMatchObject({ wellRated: true })
    expect(toEventFilters({ vyber: "tento-vikend" }, catalog).interests).toBeUndefined()
  })
})

describe("Proběhlé (#61)", () => {
  const now = new Date("2026-11-11T10:00:00.000Z")

  it("reads ?termin=probehle and drops anything else", () => {
    expect(eventsSearchSchema.parse({ termin: "probehle" }).termin).toBe("probehle")
    expect(eventsSearchSchema.parse({ termin: "zitra" }).termin).toBeUndefined()
  })

  it("asks for the past instead of a range and without occupancy", () => {
    const filters = toEventFilters(
      {
        termin: "probehle",
        od: "2026-11-14",
        do: "2026-11-15",
        obsazenost: "chybi",
        lokalita: "praha-8",
      },
      catalog,
    )
    expect(filters).toMatchObject({ past: true, localityId: "l-praha-8" })
    expect(filters.dateFrom).toBeUndefined()
    expect(filters.dateTo).toBeUndefined()
    expect(filters.capacity).toBeUndefined()
    expect(toSearchParams(filters).get("past")).toBe("true")
    expect(toEventFilters({}, catalog).past).toBeUndefined()
  })

  it("never sends a pick's personal parts, even when a hand-edited URL has both (review #323)", () => {
    const filters = toEventFilters({ termin: "probehle", vyber: "tady-chybis" }, catalog)
    expect(filters.past).toBe(true)
    expect(filters.interests).toBeUndefined()
    expect(filters.notJoined).toBeUndefined()
  })

  it("„Zrušit vše“ with a pick goes back to the pick, without Proběhlé", () => {
    expect(pickSearch("tento-vikend", {}, now).termin).toBeUndefined()
  })

  it("is a filter of its own: „Zrušit vše“ clears it, no tab holds it", () => {
    expect(hasActiveFilters({ termin: "probehle" })).toBe(true)
    expect(isAllEvents({ termin: "probehle" })).toBe(false)
    // „Podle tvých zájmů“ sets no filter, still Proběhlé leaves it
    const search = pickSearch("podle-zajmu", { lokalita: "praha-8" }, now)
    expect(changesPick(search, { termin: "probehle" }, now)).toBe(true)
    expect(pickSearch("tento-vikend", { termin: "probehle" }, now).termin).toBeUndefined()
  })
})

describe("nearestFilters (#299)", () => {
  const praha8 = catalog.localities.find((l) => l.slug === "praha-8")!

  it("the same filters anywhere, nearest to the locality's centre first", () => {
    const filters = nearestFilters(
      { lokalita: "praha-8", okoli: "10", obsazenost: "chybi", od: "2026-11-14" },
      catalog,
      5,
    )
    expect(filters).toMatchObject({
      localityId: undefined,
      radiusKm: undefined,
      lat: praha8.lat,
      lng: praha8.lng,
      sort: "distance",
      limit: 5,
      capacity: "missing",
      dateFrom: "2026-11-14",
    })
    // only the five shown are downloaded (review #321)
    expect(toSearchParams(filters!).get("limit")).toBe("5")
  })

  it("none on Proběhlé: the past isn't ordered by distance (#61)", () => {
    expect(nearestFilters({ lokalita: "praha-8", termin: "probehle" }, catalog, 5)).toBeUndefined()
  })

  it("none without a centre: all of Czechia, a map area", () => {
    expect(nearestFilters({ lokalita: "cele-cesko" }, catalog, 5)).toBeUndefined()
    expect(
      nearestFilters({ lokalita: "praha-8", oblast: "14.3,50,14.6,50.15" }, catalog, 5),
    ).toBeUndefined()
  })
})
