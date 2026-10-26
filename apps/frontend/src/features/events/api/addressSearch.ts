import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query"
import { z } from "zod"

import type { LatLng } from "@/components/map/LocationPicker"
import type { Locality } from "@/lib/catalog/catalogSchemas"

/**
 * Photon: an address search over OpenStreetMap data, public, no key, CORS `*`
 * (https://photon.komoot.io). It only makes the address field quicker to fill
 * in: when it is slow or down, the field works as a plain text field.
 */
export const PHOTON_URL = "https://photon.komoot.io/api/"

/** Czechia and a little around it, `minLon,minLat,maxLon,maxLat`. */
const CZECHIA_BBOX = "12.09,48.55,18.86,51.06"

/** Suggestions start from this many characters. */
export const ADDRESS_SEARCH_MIN_LENGTH = 3
const MAX_SUGGESTIONS = 5
// a street comes back once per segment, so ask for more and drop the repeats
const FETCHED = 10
const TIMEOUT_MS = 5000

const photonResponseSchema = z.object({
  features: z.array(
    z.object({
      // a point: [longitude, latitude]
      geometry: z.object({ coordinates: z.array(z.number()).min(2) }),
      properties: z.object({
        name: z.string().optional(),
        street: z.string().optional(),
        housenumber: z.string().optional(),
        locality: z.string().optional(),
        district: z.string().optional(),
        city: z.string().optional(),
        county: z.string().optional(),
        type: z.string().optional(),
        osm_key: z.string().optional(),
      }),
    }),
  ),
})

type PhotonFeature = z.infer<typeof photonResponseSchema>["features"][number]

export type AddressSuggestion = {
  /** What goes into the address field, e.g. „Letenská 525/15, Praha – Malá Strana“. */
  address: string
  /** The place or the street, e.g. „Letenská 525/15“. */
  title: string
  /** The town and its part, e.g. „Praha – Malá Strana“; empty when unknown. */
  area: string
  /** As OpenStreetMap names them, for the locality: „Praha 8“ or „Malá Strana“, „Praha“. */
  district?: string
  city?: string
  lat: number
  lng: number
}

const districtOf = ({ properties: p }: PhotonFeature) => p.district?.replace(/^obvod /, "")

/** „Praha 8 – Karlín“, „Praha – Malá Strana“, „Brno – Veveří“: the town, then its part. */
const areaOf = (feature: PhotonFeature): string => {
  const { properties: p } = feature
  const district = districtOf(feature)
  let town: string | undefined
  let part: string | undefined
  if (district && p.city && district.startsWith(p.city)) {
    // a numbered Prague district („Praha 9“, „Praha-Kunratice“) says more than „Praha“
    town = district
    part = p.locality
  } else if (p.city) {
    town = p.city
    part = district ?? p.locality
  } else {
    town = district ?? p.county
    part = p.locality
  }
  if (!town) return part ?? ""
  return part && !town.includes(part) ? `${town} – ${part}` : town
}

/** „Název místa, Ulice 12“, „Letenská 525/15“ or just the street. */
const titleOf = ({ properties: p }: PhotonFeature): string => {
  const street = p.street && p.housenumber ? `${p.street} ${p.housenumber}` : p.street
  // a street's own name is the street
  if (p.type === "street" || p.osm_key === "highway") return p.name ?? street ?? ""
  if (p.name && street && p.name !== p.street) return `${p.name}, ${street}`
  return p.name ?? street ?? ""
}

/** Photon's answer as suggestions a Czech reader recognises; repeats dropped, at most five. */
export const toAddressSuggestions = (response: unknown): AddressSuggestion[] => {
  const { features } = photonResponseSchema.parse(response)
  const suggestions = new Map<string, AddressSuggestion>()
  for (const feature of features) {
    const title = titleOf(feature)
    if (!title) continue
    const area = areaOf(feature)
    const address = area && area !== title ? `${title}, ${area}` : title
    if (suggestions.has(address)) continue
    const [lng = 0, lat = 0] = feature.geometry.coordinates
    suggestions.set(address, {
      address,
      title,
      area: area === title ? "" : area,
      district: districtOf(feature),
      city: feature.properties.city,
      lat,
      lng,
    })
    if (suggestions.size === MAX_SUGGESTIONS) break
  }
  return [...suggestions.values()]
}

/** Up to this far, the nearest catalog town stands in for a village the catalog doesn't have. */
const NEAREST_TOWN_KM = 20

// equirectangular distance: plenty at the scale of Czechia
const distanceKm = (a: LatLng, b: LatLng): number => {
  const toRad = Math.PI / 180
  const x = (b.lng - a.lng) * toRad * Math.cos(((a.lat + b.lat) / 2) * toRad)
  const y = (b.lat - a.lat) * toRad
  return Math.hypot(x, y) * 6371
}

const nearestTown = (point: LatLng, localities: Locality[]): Locality | undefined => {
  let nearest: Locality | undefined
  let nearestKm = NEAREST_TOWN_KM
  for (const locality of localities) {
    if (locality.parentId !== null) continue
    const km = distanceKm(point, locality)
    if (km < nearestKm) {
      nearest = locality
      nearestKm = km
    }
  }
  return nearest
}

/**
 * The catalog locality an address lies in, when it says more than the chosen
 * one: its Prague district („Praha 8“) or its town („Brno“). A village the
 * catalog doesn't have (Dolní Dobrouč) gets the nearest town within 20 km.
 * Undefined for an address that only knows „Praha“ while a Prague district is
 * chosen – a district isn't swapped for its city.
 * A town's part is no town: Zábřeh in Ostrava is Ostrava, not the town Zábřeh.
 */
export const localityOfAddress = (
  {
    district,
    city,
    lat,
    lng,
  }: Pick<AddressSuggestion, "district" | "city"> & Partial<Pick<AddressSuggestion, "lat" | "lng">>,
  localities: Locality[],
  chosenId: string,
): Locality | undefined => {
  const found =
    localities.find((l) => l.parentId !== null && l.name === district) ??
    // without a city, OpenStreetMap's district is the town
    localities.find((l) => l.parentId === null && l.name === (city ?? district)) ??
    (lat !== undefined && lng !== undefined ? nearestTown({ lat, lng }, localities) : undefined)
  const chosen = localities.find((l) => l.id === chosenId)
  if (!found || found.id === chosen?.id || chosen?.parentId === found.id) return undefined
  return found
}

export const addressSearchUrl = (text: string, near: LatLng): string => {
  const url = new URL(PHOTON_URL)
  url.searchParams.set("q", text)
  url.searchParams.set("limit", String(FETCHED))
  // results near the picked place or the chosen locality come first
  url.searchParams.set("lat", near.lat.toFixed(4))
  url.searchParams.set("lon", near.lng.toFixed(4))
  url.searchParams.set("bbox", CZECHIA_BBOX)
  return url.toString()
}

const searchAddresses = async (
  text: string,
  near: LatLng,
  signal: AbortSignal,
): Promise<AddressSuggestion[]> => {
  // gives up on a slow answer, and on one nobody waits for any more
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const abort = () => controller.abort()
  signal.addEventListener("abort", abort)
  try {
    const response = await fetch(addressSearchUrl(text, near), { signal: controller.signal })
    if (!response.ok) throw new Error(`Photon ${response.status}`)
    return toAddressSuggestions(await response.json())
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener("abort", abort)
  }
}

export type AddressSearch = { text: string; near: LatLng }

// ~100 m is close enough for the bias; finer would refetch for nothing
const roughly = (value: number) => Math.round(value * 1000) / 1000

export const addressSuggestionsQueryOptions = (search: AddressSearch | null) => {
  const text = search?.text ?? ""
  const near = search ? { lat: roughly(search.near.lat), lng: roughly(search.near.lng) } : null
  return queryOptions({
    queryKey: ["address-suggestions", text, near] as const,
    queryFn:
      near && text.length >= ADDRESS_SEARCH_MIN_LENGTH
        ? ({ signal }) => searchAddresses(text, near, signal)
        : skipToken,
    // the same text gives the same addresses
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
    // the last suggestions stay while the next ones load
    placeholderData: keepPreviousData,
  })
}
