import { useEffect, useMemo, useRef, type RefObject } from "react"
import { divIcon, type Map as LeafletMap } from "leaflet"
import { Plus } from "lucide-react"
import {
  AttributionControl,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet"

import "leaflet/dist/leaflet.css"
import "./map.css"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { pinHtml, pinSize } from "./mapPin"

export type LatLng = { lat: number; lng: number }

type LocationPickerProps = {
  value: LatLng | null
  onChange: (point: LatLng) => void
  /** Where the map looks while no place is picked, e.g. the chosen locality. */
  center: LatLng
  /** Id of the visible heading that names the map. */
  labelledBy: string
  /** Id of the error message under the map, while there is one. */
  describedBy?: string
  isInvalid?: boolean
  className?: string
  /** For the map itself, e.g. a taller one where it has a column of its own. */
  mapClassName?: string
}

const ZOOM = 14
/** Close enough to check the spot of a found address. */
const PLACE_ZOOM = 16

const isSamePoint = (a: LatLng | null, b: LatLng | null) =>
  a !== null && b !== null && a.lat === b.lat && a.lng === b.lng

/**
 * Leaflet + OpenStreetMap, the picking mode (B-004): a tap on the map puts the
 * pin there. The button does the same for the middle of the map, so the place
 * can also be picked from the keyboard (the map pans with the arrow keys).
 */
export function LocationPicker({
  value,
  onChange,
  center,
  labelledBy,
  describedBy,
  isInvalid,
  className,
  mapClassName,
}: LocationPickerProps) {
  const mapRef = useRef<LeafletMap | null>(null)
  // the place the map already shows: the one it opened on, or one picked on it
  const shownRef = useRef(value)
  const pick = (point: LatLng) => {
    shownRef.current = point
    onChange(point)
  }
  const icon = useMemo(() => {
    const { width, height } = pinSize("default")
    return divIcon({
      html: pinHtml("default"),
      className: "",
      iconSize: [width, height],
      iconAnchor: [width / 2, height],
    })
  }, [])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="region"
        aria-labelledby={labelledBy}
        // a region can't be aria-invalid: the error is its description
        aria-describedby={describedBy}
        className={cn(
          "relative isolate z-0 h-64 overflow-hidden rounded-lg border border-border",
          isInvalid && "border-destructive",
          mapClassName,
        )}
      >
        <MapContainer
          ref={mapRef}
          // read once, on mount: an already picked place (editing) opens in view
          center={value ? [value.lat, value.lng] : [center.lat, center.lng]}
          zoom={ZOOM}
          attributionControl={false}
          // in a long form the wheel scrolls the page, not the map
          scrollWheelZoom={false}
          className="size-full bg-muted"
        >
          <AttributionControl position="bottomright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <PickOnClick onPick={pick} />
          <FollowCenter
            center={center}
            hasPoint={value !== null}
          />
          <ShowPlace
            value={value}
            shownRef={shownRef}
          />
          {value ? (
            <Marker
              position={[value.lat, value.lng]}
              icon={icon}
              interactive={false}
              keyboard={false}
            />
          ) : null}
        </MapContainer>
        {/* where „Umístit špendlík do středu mapy“ puts the pin */}
        <Plus
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 z-500 size-5 -translate-x-1/2 -translate-y-1/2 text-foreground"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          const middle = mapRef.current?.getCenter()
          if (middle) pick({ lat: middle.lat, lng: middle.lng })
        }}
      >
        Umístit špendlík do středu mapy
      </Button>
    </div>
  )
}

function PickOnClick({ onPick }: { onPick: (point: LatLng) => void }) {
  useMapEvents({
    click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }),
  })
  return null
}

/** Moves to a newly chosen locality, but never away from a picked place. */
function FollowCenter({ center, hasPoint }: { center: LatLng; hasPoint: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!hasPoint) map.setView([center.lat, center.lng], ZOOM)
    // only a new locality moves the map; picking a place doesn't
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, map])
  return null
}

/**
 * A place set from outside the map, e.g. a picked address, is brought into
 * view; one picked on the map stays where the user put it, the map doesn't move.
 */
function ShowPlace({
  value,
  shownRef,
}: {
  value: LatLng | null
  shownRef: RefObject<LatLng | null>
}) {
  const map = useMap()
  useEffect(() => {
    if (!value || isSamePoint(value, shownRef.current)) return
    shownRef.current = value
    map.setView([value.lat, value.lng], Math.max(map.getZoom(), PLACE_ZOOM))
    // only a new place moves the map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng, map])
  return null
}
