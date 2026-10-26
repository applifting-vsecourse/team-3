import { keepPreviousData, queryOptions, skipToken } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"
import { localitySchema, type Locality } from "@/lib/catalog/catalogSchemas"
import { foldText } from "@/lib/catalog/textSearch"

/**
 * Places (towns, villages, parts of towns) from Photon over OpenStreetMap,
 * public, no key, CORS `*` (https://photon.komoot.io) – the same service as
 * the address field. Lokalita offers them under the catalog, so any village
 * works: picking one saves it as a locality (POST /localities).
 */
const PHOTON_URL = "https://photon.komoot.io/api/"
/** Czechia and a little around it, `minLon,minLat,maxLon,maxLat`; places outside Czechia are dropped. */
const CZECHIA_BBOX = "12.09,48.55,18.86,51.06"
export const PLACE_SEARCH_MIN_LENGTH = 2
const MAX_PLACES = 6
const TIMEOUT_MS = 5000
// a municipality also comes as its cadastral area; the rest are no places to meet in
const PLACE_KINDS = new Set([
  "city",
  "town",
  "village",
  "municipality",
  "suburb",
  "quarter",
  "neighbourhood",
  "hamlet",
  "locality",
])

const photonPlacesSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: z.array(z.number()).min(2) }),
      properties: z.object({
        name: z.string().optional(),
        osm_value: z.string().optional(),
        county: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        countrycode: z.string().optional(),
      }),
    }),
  ),
})

export type OnlinePlace = {
  key: string
  name: string
  /** „okres Ústí nad Orlicí“, or the town a part of a town belongs to. */
  area: string
  county?: string
  lat: number
  lng: number
}

/** Photon's answer as places a Czech reader recognises; repeats dropped. */
export const toOnlinePlaces = (response: unknown): OnlinePlace[] => {
  const places = new Map<string, OnlinePlace>()
  for (const { geometry, properties: p } of photonPlacesSchema.parse(response).features) {
    // the box reaches into Slovakia, Poland, Germany and Austria: a locality is a Czech place
    if (!p.name || !PLACE_KINDS.has(p.osm_value ?? "") || p.countrycode !== "CZ") continue
    const [lng = 0, lat = 0] = geometry.coordinates
    const area = [p.city && p.city !== p.name ? p.city : undefined, p.county ?? p.state]
      .filter(Boolean)
      .join(", ")
    const key = `${p.name}|${p.county ?? ""}`
    if (places.has(key)) continue
    places.set(key, { key, name: p.name, area, county: p.county, lat, lng })
    if (places.size === MAX_PLACES) break
  }
  return [...places.values()]
}

const searchPlaces = async (text: string, signal: AbortSignal): Promise<OnlinePlace[]> => {
  const url = new URL(PHOTON_URL)
  url.searchParams.set("q", text)
  url.searchParams.set("limit", "15")
  url.searchParams.set("bbox", CZECHIA_BBOX)
  url.searchParams.set("osm_tag", "place")
  // foreign hits would take the slots before toOnlinePlaces drops them
  url.searchParams.set("countrycode", "CZ")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const abort = () => controller.abort()
  signal.addEventListener("abort", abort)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`Photon ${response.status}`)
    return toOnlinePlaces(await response.json())
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener("abort", abort)
  }
}

export const placeSuggestionsQueryOptions = (text: string) =>
  queryOptions({
    queryKey: ["place-suggestions", foldText(text)] as const,
    queryFn:
      foldText(text).length >= PLACE_SEARCH_MIN_LENGTH
        ? ({ signal }) => searchPlaces(text.trim(), signal)
        : skipToken,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
    placeholderData: keepPreviousData,
  })

/** The picked place as a locality: the catalog's one of that name nearby, or a new one. */
export const addPlaceAsLocality = async (place: OnlinePlace): Promise<Locality> =>
  localitySchema.parse(
    await api
      .post("localities", {
        json: { name: place.name, county: place.county, lat: place.lat, lng: place.lng },
      })
      .json(),
  )
