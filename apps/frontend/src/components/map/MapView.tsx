import { useEffect, useMemo } from "react"
import { divIcon, latLngBounds } from "leaflet"
import {
  AttributionControl,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  ZoomControl,
} from "react-leaflet"

import "leaflet/dist/leaflet.css"
import "./map.css"

import { cn } from "@/lib/utils"

import { pinHtml, pinSize, type PinVariant } from "./mapPin"

export type MapPinData = {
  id: string
  lat: number
  lng: number
  variant: PinVariant
  /** Shown above the pin while it is highlighted. */
  label: string
}

type MapViewProps = {
  pins: MapPinData[]
  /** Pin to raise and label, e.g. the event card under the mouse. */
  highlightedId?: string
  /** Where the map looks when there are no pins (e.g. the chosen locality). */
  center: { lat: number; lng: number }
  /** Zoom buttons bottom right; on touch screens pinch zoom is enough. */
  hasZoomControl?: boolean
  className?: string
}

const DEFAULT_ZOOM = 12
// One or two nearby events would otherwise zoom in to single streets and
// lose where in the city they are; 14 still shows the district around them.
const FIT_MAX_ZOOM = 14

/**
 * Leaflet + OpenStreetMap (B-004, Q1), the pins mode: a set of points from
 * the API. No device location (GPS is out of scope, F-08).
 * Pin previews, clusters and „Hledat v této oblasti“ are sprint 3 (B-029).
 */
export function MapView({
  pins,
  highlightedId,
  center,
  hasZoomControl = true,
  className,
}: MapViewProps) {
  return (
    // MapContainer doesn't pass aria attributes on, hence the wrapper
    <div
      role="region"
      aria-label="Mapa akcí"
      className={cn("isolate z-0 size-full", className)}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        attributionControl={false}
        className="size-full bg-muted"
      >
        <AttributionControl position="bottomright" />
        {hasZoomControl ? <ZoomControl position="bottomright" /> : null}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPins
          pins={pins}
          center={center}
        />
        {pins.map((pin) => (
          <Pin
            key={pin.id}
            pin={pin}
            isHighlighted={pin.id === highlightedId}
          />
        ))}
      </MapContainer>
    </div>
  )
}

function Pin({ pin, isHighlighted }: { pin: MapPinData; isHighlighted: boolean }) {
  const icon = useMemo(() => {
    const { width, height } = pinSize(pin.variant)
    return divIcon({
      html: pinHtml(pin.variant, isHighlighted ? pin.label : undefined),
      className: "",
      iconSize: [width, height],
      // the tip of the pin sits on the place
      iconAnchor: [width / 2, height],
    })
  }, [pin.variant, pin.label, isHighlighted])

  return (
    <Marker
      position={[pin.lat, pin.lng]}
      icon={icon}
      // The list next to the map is the accessible way to the events; pins
      // only show where they are until the preview arrives (B-029).
      interactive={false}
      keyboard={false}
      zIndexOffset={isHighlighted ? 1000 : pin.variant === "highlighted" ? 100 : 0}
    />
  )
}

/**
 * Fits the view to the pins when the set of pins changes (another filter),
 * not on every render — so opening the list panel keeps the map where it is.
 */
function FitToPins({ pins, center }: { pins: MapPinData[]; center: { lat: number; lng: number } }) {
  const map = useMap()
  const key = pins.map((pin) => pin.id).join(",")

  useEffect(() => {
    if (pins.length === 0) {
      map.setView([center.lat, center.lng], DEFAULT_ZOOM)
      return
    }
    const bounds = latLngBounds(pins.map((pin) => [pin.lat, pin.lng]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: FIT_MAX_ZOOM })
    // `key` stands for `pins`: refit only when the set of events changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map, center.lat, center.lng])

  return null
}
