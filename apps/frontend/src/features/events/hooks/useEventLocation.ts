import { useEffect, useRef, useState } from "react"

import type { LatLng } from "@/components/map/LocationPicker"
import type { Locality } from "@/lib/catalog/catalogSchemas"

import {
  distanceKm,
  localityOfAddress,
  nearestTown,
  reverseAddress,
  type AddressSuggestion,
} from "@/features/events/api/addressSearch"

type Options = {
  localities: Locality[]
  initialAddress: string
  getValues: () => { place: LatLng | null; address: string; localityId: string }
  setAddress: (value: string) => void
  setPlace: (value: LatLng) => void
  setLocality: (value: string) => void
}

/** Reverse lookup describes the picked point; it never snaps the pin to a nearby building. */
export function useEventLocation({
  localities,
  initialAddress,
  getValues,
  setAddress,
  setPlace,
  setLocality,
}: Options) {
  const source = useRef<"empty" | "auto" | "manual">(initialAddress.trim() ? "manual" : "empty")
  const request = useRef<AbortController | null>(null)
  const [notice, setNotice] = useState("")
  const [pendingAddress, setPendingAddress] = useState<string | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  const cancelLookup = () => {
    request.current?.abort()
    request.current = null
    setPendingAddress(null)
    setNotice("")
  }
  const updateLocality = (point: LatLng, suggestion?: AddressSuggestion) => {
    const selected = localities.find((item) => item.id === getValues().localityId)
    const exact = suggestion
      ? localityOfAddress({ ...suggestion, ...point }, localities, "", { allowNearest: false })
      : undefined
    const nearby = exact ? undefined : nearestTown(point, localities)
    const shouldPreserveSelection =
      selected &&
      ((selected.parentId === (exact ?? nearby)?.id && (!exact || !suggestion?.district)) ||
        (!exact && distanceKm(point, selected) <= 1))
    const locality = shouldPreserveSelection ? selected : (exact ?? nearby)
    // Unknown points must not erase an existing catalog selection.
    if (locality) setLocality(locality.id)
    return exact || shouldPreserveSelection
      ? ""
      : locality
        ? `Pro orientaci jsme zvolili lokalitu ${locality.name}. Zkontroluj, jestli odpovídá místu.`
        : "Nepodařilo se určit lokalitu. Vyber ji ručně."
  }
  const pickPoint = async (point: LatLng, isCenterButton = false) => {
    const previous = getValues().place
    if (isCenterButton && previous && distanceKm(previous, point) < 0.005) return
    cancelLookup()
    const controller = new AbortController()
    request.current = controller
    setPlace(point)
    if (source.current !== "manual") {
      setAddress("")
      source.current = "empty"
    }
    let isTimedOut = false
    const timeout = setTimeout(() => {
      isTimedOut = true
      controller.abort()
    }, 5000)
    let suggestion: AddressSuggestion | undefined
    try {
      suggestion = await reverseAddress(point, controller.signal)
    } catch {
      // An unavailable geocoder still leaves the map and manual entry usable.
    } finally {
      clearTimeout(timeout)
    }
    if (request.current !== controller || (controller.signal.aborted && !isTimedOut)) return
    request.current = null
    const localityNotice = updateLocality(point, suggestion)
    if (suggestion) {
      if (source.current === "manual") {
        if (suggestion.address !== getValues().address) setPendingAddress(suggestion.address)
      } else {
        setAddress(suggestion.address)
        source.current = "auto"
      }
      setNotice(`Zkontroluj, že adresa odpovídá místu na mapě. ${localityNotice}`.trim())
    } else {
      setNotice(
        `Adresu se nepodařilo určit. Doplň nebo zkontroluj vlastní popis místa. ${localityNotice}`.trim(),
      )
    }
  }
  return {
    notice,
    pendingAddress,
    cancelLookup,
    pickPoint,
    typeAddress: (value: string) => {
      cancelLookup()
      source.current = value.trim() ? "manual" : "empty"
      setAddress(value)
    },
    pickAddress: (suggestion: AddressSuggestion) => {
      cancelLookup()
      source.current = "manual"
      setAddress(suggestion.address)
      // Selecting a suggestion explicitly chooses that place, unlike automatic reverse lookup.
      setPlace({ lat: suggestion.lat, lng: suggestion.lng })
      setNotice(updateLocality(suggestion, suggestion))
    },
    acceptAddress: () => {
      if (!pendingAddress) return
      setAddress(pendingAddress)
      source.current = "auto"
      setPendingAddress(null)
    },
    keepAddress: () => {
      setPendingAddress(null)
    },
  }
}
