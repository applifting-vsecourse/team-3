import { describe, expect, it } from "vitest"

import type { Locality } from "@/lib/catalog/catalogSchemas"

import {
  addressSearchUrl,
  localityOfAddress,
  toAddressSuggestions,
} from "@/features/events/api/addressSearch"

const feature = (properties: Record<string, string>, [lng, lat] = [14.4, 50.1]) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [lng, lat] },
  properties: { country: "Česko", countrycode: "CZ", ...properties },
})

// shapes as Photon returns them (25. 10. 2026)
const letenska = feature(
  {
    osm_key: "place",
    osm_value: "house",
    type: "house",
    housenumber: "525/15",
    street: "Letenská",
    district: "Malá Strana",
    city: "Praha",
    postcode: "118 00",
  },
  [14.4072071, 50.0891477],
)
const podvinnyMlyn = (locality?: string) =>
  feature({
    osm_key: "highway",
    osm_value: "residential",
    type: "street",
    name: "Podvinný mlýn",
    ...(locality ? { locality } : {}),
    district: "Praha 9",
    city: "Praha",
  })

describe("toAddressSuggestions", () => {
  it("writes a house as street and number, then the town and its part", () => {
    expect(toAddressSuggestions({ features: [letenska] })).toEqual([
      {
        address: "Letenská 525/15, Praha – Malá Strana",
        title: "Letenská 525/15",
        area: "Praha – Malá Strana",
        district: "Malá Strana",
        city: "Praha",
        lat: 50.0891477,
        lng: 14.4072071,
      },
    ])
  })

  it("names a numbered Prague district with its quarter", () => {
    const [suggestion] = toAddressSuggestions({
      features: [
        feature({
          type: "house",
          osm_key: "place",
          housenumber: "53/52",
          street: "Křižíkova",
          locality: "Karlín",
          district: "Praha 8",
          city: "Praha",
        }),
      ],
    })

    expect(suggestion?.address).toBe("Křižíkova 53/52, Praha 8 – Karlín")
  })

  it("puts a place's name before its street", () => {
    const [hall, school] = toAddressSuggestions({
      features: [
        feature({
          type: "house",
          osm_key: "leisure",
          name: "Sportovní hala Fortuna",
          street: "Za Elektrárnou",
          locality: "Holešovice",
          district: "Praha 7",
          city: "Praha",
        }),
        feature({
          type: "house",
          osm_key: "amenity",
          name: "Sportovní hala VŠE",
          street: "Na Třebešíně",
          housenumber: "3215/1",
          district: "obvod Praha 10",
          city: "Praha",
        }),
      ],
    })

    expect(hall?.address).toBe("Sportovní hala Fortuna, Za Elektrárnou, Praha 7 – Holešovice")
    expect(school?.address).toBe("Sportovní hala VŠE, Na Třebešíně 3215/1, Praha 10")
  })

  it("outside Prague: the town and its part", () => {
    const [suggestion] = toAddressSuggestions({
      features: [
        feature({
          type: "house",
          osm_key: "place",
          housenumber: "366/1",
          street: "Sokolská",
          district: "Veveří",
          city: "Brno",
          county: "okres Brno-město",
        }),
      ],
    })

    expect(suggestion?.address).toBe("Sokolská 366/1, Brno – Veveří")
  })

  it("a street comes once per part of town, and five suggestions at most", () => {
    const suggestions = toAddressSuggestions({
      features: [
        podvinnyMlyn("Balabenka"),
        podvinnyMlyn("Prosek"),
        podvinnyMlyn(),
        podvinnyMlyn("Prosek"),
        ...["A", "B", "C", "D"].map((name) => feature({ type: "street", name, city: "Praha" })),
      ],
    })

    expect(suggestions.map((s) => s.address)).toEqual([
      "Podvinný mlýn, Praha 9 – Balabenka",
      "Podvinný mlýn, Praha 9 – Prosek",
      "Podvinný mlýn, Praha 9",
      "A, Praha",
      "B, Praha",
    ])
  })

  it("refuses an answer that isn't Photon's", () => {
    expect(() => toAddressSuggestions({ error: "Bad request" })).toThrow()
  })
})

describe("addressSearchUrl", () => {
  it("asks for addresses in Czechia, near the given point", () => {
    const url = new URL(addressSearchUrl("Letenská 15", { lat: 50.11, lng: 14.47 }))

    expect(url.origin + url.pathname).toBe("https://photon.komoot.io/api/")
    expect(url.searchParams.get("q")).toBe("Letenská 15")
    expect(url.searchParams.get("lat")).toBe("50.1100")
    expect(url.searchParams.get("lon")).toBe("14.4700")
    expect(url.searchParams.get("bbox")).toBe("12.09,48.55,18.86,51.06")
  })
})

describe("localityOfAddress", () => {
  const locality = (id: string, name: string, parentId: string | null = null): Locality => ({
    id,
    slug: id,
    name,
    parentId,
    lat: 50,
    lng: 14,
  })
  const praha = locality("praha", "Praha")
  const praha8 = locality("praha-8", "Praha 8", "praha")
  const brno = locality("brno", "Brno")
  const ostrava = locality("ostrava", "Ostrava")
  const zabreh = locality("zabreh", "Zábřeh")
  const ustiNadOrlici = locality("usti-nad-orlici", "Ústí nad Orlicí")
  const localities = [praha, praha8, brno, ostrava, zabreh, ustiNadOrlici]

  it("a Prague district in the address is more precise than „Praha“", () => {
    expect(localityOfAddress({ district: "Praha 8", city: "Praha" }, localities, "praha")).toBe(
      praha8,
    )
  })

  it("another town of the catalog replaces the chosen one", () => {
    expect(localityOfAddress({ district: "Veveří", city: "Brno" }, localities, "praha-8")).toBe(
      brno,
    )
  })

  it("an address that only says „Praha“ leaves a chosen district alone", () => {
    expect(
      localityOfAddress({ district: "Malá Strana", city: "Praha" }, localities, "praha-8"),
    ).toBeUndefined()
  })

  it("a town the catalog doesn't have leaves the choice alone", () => {
    expect(
      localityOfAddress({ district: "Kolín I", city: "Kolín" }, localities, "praha"),
    ).toBeUndefined()
  })

  it("any Czech town of the catalog counts, e.g. Ústí nad Orlicí (PO 26. 10.)", () => {
    expect(
      localityOfAddress({ district: "Hylváty", city: "Ústí nad Orlicí" }, localities, "praha"),
    ).toBe(ustiNadOrlici)
  })

  it("a part of a town named like another town is still that town (Zábřeh in Ostrava)", () => {
    expect(localityOfAddress({ district: "Zábřeh", city: "Ostrava" }, localities, "praha")).toBe(
      ostrava,
    )
  })

  it("without a city, the district is the town", () => {
    expect(localityOfAddress({ district: "Zábřeh" }, localities, "praha")).toBe(zabreh)
  })

  it("the locality already chosen needs no change", () => {
    expect(
      localityOfAddress({ district: "Praha 8", city: "Praha" }, localities, "praha-8"),
    ).toBeUndefined()
  })
})
