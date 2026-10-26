import { describe, expect, it } from "vitest"

import type { Locality } from "@/lib/catalog/catalogSchemas"

import { localityName, localityOptions, localityReset } from "./localityOptions"

const city = (slug: string, name: string): Locality => ({
  id: slug,
  slug,
  name,
  parentId: null,
  lat: 0,
  lng: 0,
})
const district = (n: number): Locality => ({
  ...city(`praha-${n}`, `Praha ${n}`),
  parentId: "praha",
})

describe("localityOptions", () => {
  it("puts Praha first, its districts under it, then other cities", () => {
    const options = localityOptions([
      city("ostrava", "Ostrava"),
      district(10),
      city("brno", "Brno"),
      district(2),
      city("praha", "Praha"),
      city("ceske-budejovice", "České Budějovice"),
    ])

    expect(options.map((o) => [o.name, o.isDistrict])).toEqual([
      ["Praha", false],
      ["Praha 2", true],
      ["Praha 10", true],
      ["Brno", false],
      ["České Budějovice", false],
      ["Ostrava", false],
    ])
  })
})

describe("localityName", () => {
  const localities = [city("praha", "Praha"), city("bruntal", "Bruntál")]

  it("names Celé Česko, a locality, or nothing for a slug the catalog doesn't know", () => {
    expect(localityName("cele-cesko", localities)).toBe("Celé Česko")
    expect(localityName("bruntal", localities)).toBe("Bruntál")
    expect(localityName("atlantida", localities)).toBeUndefined()
  })
})

describe("localityReset", () => {
  const localities = [
    city("praha", "Praha"),
    district(8),
    city("bruntal", "Bruntál"),
    city("brno", "Brno"),
    { ...city("brno-sever", "Brno-sever"), parentId: "brno" },
  ]

  it("takes a district back to its whole city", () => {
    expect(localityReset("praha-8", localities)).toEqual({ label: "Celá Praha", slug: "praha" })
    // no gender guessed from the name
    expect(localityReset("brno-sever", localities)).toEqual({
      label: "Celé město Brno",
      slug: "brno",
    })
  })

  it("clears a city or a town, Praha too, to Celé Česko", () => {
    expect(localityReset("bruntal", localities)).toEqual({
      label: "Zrušit výběr",
      slug: "cele-cesko",
    })
    expect(localityReset("praha", localities)).toEqual({
      label: "Zrušit výběr",
      slug: "cele-cesko",
    })
  })

  it("has nothing to reset for Celé Česko", () => {
    expect(localityReset("cele-cesko", localities)).toEqual({
      label: "Zrušit výběr",
      slug: undefined,
    })
  })
})
