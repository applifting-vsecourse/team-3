import { describe, expect, it } from "vitest"

import type { Locality } from "@/lib/catalog/catalogSchemas"

import { localityOptions } from "./localityOptions"

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
