import { describe, expect, it } from "vitest"

import type { Locality } from "@/lib/catalog/catalogSchemas"

import {
  browseLocalities,
  enterChoice,
  findCatalogLocalities,
  listOnlineLocalities,
} from "./localityChoices"

function locality(id: string, name: string, parentId: string | null = null): Locality {
  return { id, slug: id, name, parentId, lat: 50.087, lng: 14.422 }
}

const prague = locality("praha", "Praha")
const brno = locality("brno", "Brno")
const places = [
  prague,
  brno,
  locality("praha-8", "Praha 8", "praha"),
  locality("praha-10", "Praha 10", "praha"),
  locality("praha-2", "Praha 2", "praha"),
  locality("brno-stred", "Střed", "brno"),
  locality("brno-zidenice", "Židenice", "brno"),
  locality("plzen", "Plzeň"),
  locality("usti-nad-orlici", "Ústí nad Orlicí"),
  locality("usti-nad-labem", "Ústí nad Labem"),
]

describe("unified locality choices", () => {
  it.each(["Praha 8", "praha-8", "Praha, 8", "městská část Praha 8"])(
    "resolves %s to its exact district",
    (input) => {
      const choices = findCatalogLocalities(places, input)
      const exact = enterChoice(choices)
      expect(exact).toMatchObject({ key: "praha-8", detail: "Praha", isExact: true })
    },
  )

  it("can find a district by writing the city name and the district together", () => {
    expect(findCatalogLocalities(places, "brno zidenice")).toEqual([
      {
        key: "brno-zidenice",
        name: "Židenice",
        detail: "Brno",
        isExact: true,
        locality: places[6],
      },
    ])
  })

  it("ranks a city before its districts when the city name matches exactly", () => {
    const results = findCatalogLocalities(places, "praha")
    expect(results.map(({ key }) => key)).toEqual(["praha", "praha-2", "praha-8", "praha-10"])
    expect(enterChoice(results)?.key).toBe("praha")
  })

  it("does not select a district automatically from a broad incomplete search", () => {
    const results = findCatalogLocalities(places, "prah")
    expect(results).toHaveLength(4)
    expect(enterChoice(results)).toBeUndefined()
  })

  it("folds diacritics and extra spaces", () => {
    expect(enterChoice(findCatalogLocalities(places, "  plzen"))?.key).toBe("plzen")
    const partial = findCatalogLocalities(places, "usti  nad  orl")
    expect(partial[0]?.key).toBe("usti-nad-orlici")
    expect(enterChoice(partial)).toBeUndefined()
  })

  it("requires an explicit choice when two catalog places share a name", () => {
    const first = locality("nova-ves-a", "Nová Ves", "brno")
    const second = locality("nova-ves-b", "Nová Ves", "praha")
    const results = findCatalogLocalities([...places, first, second], "nova ves")
    expect(results.map(({ detail }) => detail)).toEqual(["Brno", "Praha"])
    expect(enterChoice(results)).toBeUndefined()
  })

  it("lists one confirmed place instead of hiding it behind an IP estimate", () => {
    const confirmed = places[2]
    const result = browseLocalities(places, confirmed, prague)
    expect(result[0]).toMatchObject({ key: confirmed?.id, detail: "Poslední výběr" })
    expect(result.find(({ detail }) => detail === "Odhad podle připojení")).toBeUndefined()
  })

  it("offers an estimate once and preserves the catalog cities", () => {
    const result = browseLocalities(places, null, prague)
    expect(result[0]).toMatchObject({ key: "praha", detail: "Odhad podle připojení" })
    expect(result.filter(({ key }) => key === "praha")).toHaveLength(1)
    expect(result.some(({ key }) => key === "brno")).toBe(true)
  })

  it("can browse a smaller catalog without the usual cities", () => {
    const small = [locality("dum", "Dům"), locality("ves", "Ves")]
    expect(browseLocalities(small).map(({ key }) => key)).toEqual(["dum", "ves"])
  })

  it("limits broad catalog queries and retains the distinct locality IDs", () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      locality(`praha-${index}`, `Praha ${index}`),
    )
    const results = findCatalogLocalities(many, "prah")
    expect(results).toHaveLength(8)
    expect(new Set(results.map(({ key }) => key)).size).toBe(8)
  })

  it("keeps remote suggestions disambiguated by county", () => {
    const results = listOnlineLocalities(
      [
        { key: "Střítež-a", name: "Střítež", area: "Frýdek-Místek", lat: 49.6, lng: 18.57 },
        { key: "Střítež-b", name: "Střítež", area: "Třebíč", lat: 49.2, lng: 15.87 },
      ],
      "stritez",
    )
    expect(results.map(({ detail }) => detail)).toEqual(["Frýdek-Místek", "Třebíč"])
    expect(enterChoice(results)).toBeUndefined()
  })
})
