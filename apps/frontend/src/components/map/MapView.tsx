import { useEffect, useMemo, useState } from "react"
import { divIcon, latLngBounds, type Map as LeafletMap } from "leaflet"
import { RotateCw } from "lucide-react"
import {
  AttributionControl,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet"

import "leaflet/dist/leaflet.css"
import "./map.css"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { CLUSTER_SIZE, clusterHtml, PIN_BOX, pinHtml, type PinVariant } from "./mapPin"
import { PinClusters } from "./pinClusters"
import { createUserMoveTracker } from "./userMoveTracker"

export type MapPinData = {
  id: string
  lat: number
  lng: number
  variant: PinVariant
  /** Shown above the pin while it is highlighted or selected. */
  label: string
}

export type MapCenter = { lat: number; lng: number; zoom?: number }

/** A rectangle of the map in degrees: what is in view („Hledat v této oblasti“, #56). */
export type MapArea = { west: number; south: number; east: number; north: number }

type MapViewProps = {
  pins: MapPinData[]
  /** Pin to raise and label, e.g. the event card under the mouse. */
  highlightedId?: string
  /** The tapped pin (#56): bigger, labelled, never in a cluster; its preview is the page's. */
  selectedId?: string
  /** Where the map looks when there are no pins (e.g. the chosen locality); `zoom` for more than a city. */
  center: MapCenter
  /** Zoom buttons bottom right; on touch screens pinch zoom is enough. */
  hasZoomControl?: boolean
  /** Makes the pins clickable, e.g. to select an event. */
  onPinClick?: (pinId: string) => void
  /** A tap on the map itself, not on a pin, e.g. to close a preview. */
  onMapClick?: () => void
  /** Nearby pins join into clusters with a count (#56); a tap on one zooms in. */
  isClustered?: boolean
  /**
   * The area the list is limited to: the map shows it instead of fitting the
   * pins, so searching an area never moves the map away from it.
   */
  area?: MapArea
  /** After the user moves the map, „Hledat v této oblasti“ offers this with the area in view. */
  onAreaSearch?: (area: MapArea) => void
  /**
   * A picture of where, not a map to explore (Figma: Map/Static): no panning,
   * no zoom, so on a phone the page scrolls over it instead of the map.
   */
  isStatic?: boolean
  label?: string
  className?: string
}

const DEFAULT_ZOOM = 12
// One or two nearby events would otherwise zoom in to single streets and
// lose where in the city they are; 14 still shows the district around them.
const FIT_MAX_ZOOM = 14

/**
 * Leaflet + OpenStreetMap (B-004, Q1), the pins mode: a set of points from
 * the API. No device location (GPS is out of scope, F-08).
 */
export function MapView({
  pins,
  highlightedId,
  selectedId,
  center,
  hasZoomControl = true,
  onPinClick,
  onMapClick,
  isClustered = false,
  area,
  onAreaSearch,
  isStatic = false,
  label = "Mapa akcí",
  className,
}: MapViewProps) {
  // the move belongs to the search it followed: a new search puts the button away
  const areaKey = area ? Object.values(area).join(",") : ""
  const [moved, setMoved] = useState<{ area: MapArea; after: string }>()
  const movedArea = moved?.after === areaKey ? moved.area : undefined

  return (
    // MapContainer doesn't pass aria attributes on, hence the wrapper
    <div
      role="region"
      aria-label={label}
      className={cn("relative isolate z-0 size-full", className)}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={center.zoom ?? DEFAULT_ZOOM}
        zoomControl={false}
        attributionControl={false}
        dragging={!isStatic}
        touchZoom={!isStatic}
        scrollWheelZoom={!isStatic}
        doubleClickZoom={!isStatic}
        boxZoom={!isStatic}
        keyboard={!isStatic}
        className="size-full bg-muted"
      >
        <AttributionControl position="bottomright" />
        {hasZoomControl && !isStatic ? <ZoomControl position="bottomright" /> : null}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {area ? (
          <FitToArea area={area} />
        ) : (
          <FitToPins
            pins={pins}
            center={center}
          />
        )}
        {onMapClick || onAreaSearch ? (
          <MapEvents
            onMapClick={onMapClick}
            onUserMove={
              onAreaSearch ? (movedTo) => setMoved({ area: movedTo, after: areaKey }) : undefined
            }
          />
        ) : null}
        <Pins
          pins={pins}
          highlightedId={highlightedId}
          selectedId={selectedId}
          onPinClick={onPinClick}
          isClustered={isClustered}
        />
      </MapContainer>
      {onAreaSearch && movedArea ? (
        // Figma A-02, A-03ad: over the map at the top, after the map was moved
        <Button
          variant="outline"
          onClick={() => {
            onAreaSearch(movedArea)
            setMoved(undefined)
          }}
          className="absolute top-3 left-1/2 z-[1000] h-10 -translate-x-1/2 bg-background shadow-md"
        >
          <RotateCw />
          Hledat v této oblasti
        </Button>
      ) : null}
    </div>
  )
}

type PinsProps = {
  pins: MapPinData[]
  highlightedId?: string
  selectedId?: string
  onPinClick?: (pinId: string) => void
  isClustered: boolean
}

/**
 * The pins, clustered or not. The highlighted and the selected pin always
 * stand on their own, so their label shows and a hovered card never hides
 * inside a cluster.
 */
function Pins({ pins, highlightedId, selectedId, onPinClick, isClustered }: PinsProps) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) })

  const isRaised = (pin: MapPinData) => pin.id === highlightedId || pin.id === selectedId
  const clusters = useMemo(
    () => (isClustered ? new PinClusters(pins.filter((pin) => !isRaised(pin))) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isRaised reads these two
    [pins, isClustered, highlightedId, selectedId],
  )
  const items = clusters
    ? [...clusters.at(zoom), ...pins.filter(isRaised).map((pin) => ({ kind: "pin" as const, pin }))]
    : pins.map((pin) => ({ kind: "pin" as const, pin }))

  return items.map((item) =>
    item.kind === "pin" ? (
      <Pin
        key={item.pin.id}
        pin={item.pin}
        isHighlighted={item.pin.id === highlightedId}
        isSelected={item.pin.id === selectedId}
        onClick={onPinClick}
      />
    ) : (
      <Cluster
        key={`cluster-${item.id}`}
        lat={item.lat}
        lng={item.lng}
        count={item.count}
        hasMissing={item.hasMissing}
        onClick={() => map.flyTo([item.lat, item.lng], clusters!.expansionZoom(item.id))}
      />
    ),
  )
}

type PinProps = {
  pin: MapPinData
  isHighlighted: boolean
  isSelected: boolean
  onClick?: (pinId: string) => void
}

function Pin({ pin, isHighlighted, isSelected, onClick }: PinProps) {
  const icon = useMemo(() => {
    const { width, height } = PIN_BOX
    return divIcon({
      html: pinHtml(pin.variant, isHighlighted || isSelected ? pin.label : undefined, {
        isSelected,
      }),
      className: "",
      iconSize: [width, height],
      // the tip of the pin sits on the place
      iconAnchor: [width / 2, height],
    })
  }, [pin.variant, pin.label, isHighlighted, isSelected])

  return (
    <Marker
      position={[pin.lat, pin.lng]}
      icon={icon}
      // The list next to the map is the accessible way to the events, so the
      // pins stay out of the Tab order.
      interactive={Boolean(onClick)}
      eventHandlers={onClick ? { click: () => onClick(pin.id) } : undefined}
      title={onClick ? pin.label : undefined}
      keyboard={false}
      zIndexOffset={
        isSelected ? 2000 : isHighlighted ? 1000 : pin.variant === "highlighted" ? 100 : 0
      }
    />
  )
}

type ClusterProps = {
  lat: number
  lng: number
  count: number
  hasMissing: boolean
  onClick: () => void
}

function Cluster({ lat, lng, count, hasMissing, onClick }: ClusterProps) {
  const icon = useMemo(
    () =>
      divIcon({
        html: clusterHtml(count, hasMissing),
        className: "",
        iconSize: [CLUSTER_SIZE, CLUSTER_SIZE],
        iconAnchor: [CLUSTER_SIZE / 2, CLUSTER_SIZE / 2],
      }),
    [count, hasMissing],
  )
  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      eventHandlers={{ click: onClick }}
      // like the pins: the list is the way for a keyboard and a screen reader
      keyboard={false}
      title={`${count} ${count >= 2 && count <= 4 ? "akce" : "akcí"} – přiblížit`}
      zIndexOffset={500}
    />
  )
}

const areaOf = (map: LeafletMap): MapArea => {
  const bounds = map.getBounds()
  // four decimals are ~10 m: enough for a map view, short in the URL
  const round = (degrees: number) => Math.round(degrees * 10_000) / 10_000
  return {
    west: round(bounds.getWest()),
    south: round(bounds.getSouth()),
    east: round(bounds.getEast()),
    north: round(bounds.getNorth()),
  }
}

/**
 * A tap on the map itself, and moves the user made. Fitting the view to the
 * pins or to an area moves the map too; only a move that starts during or
 * right after the user's own pointer, wheel or key counts (`createUserMoveTracker`),
 * so the button never appears by itself — not even after a tap on a pin.
 */
function MapEvents({
  onMapClick,
  onUserMove,
}: {
  onMapClick?: () => void
  onUserMove?: (area: MapArea) => void
}) {
  const [tracker] = useState(createUserMoveTracker)
  const map = useMapEvents({
    click: () => onMapClick?.(),
    movestart: () => tracker.moveStart(),
    moveend: () => {
      if (tracker.moveEnd()) onUserMove?.(areaOf(map))
    },
  })

  useEffect(() => {
    const container = map.getContainer()
    const listeners = [
      ["pointerdown", tracker.pointerDown],
      ["pointerup", tracker.pointerUp],
      ["pointercancel", tracker.pointerUp],
      ["wheel", tracker.input],
      ["keydown", tracker.input],
    ] as const
    // capture: a pin or a cluster must not hide the pointer from the map
    const options = { passive: true, capture: true }
    for (const [event, listener] of listeners) container.addEventListener(event, listener, options)
    return () => {
      for (const [event, listener] of listeners) {
        container.removeEventListener(event, listener, options)
      }
    }
  }, [map, tracker])

  return null
}

/** Shows the searched area as it was when the user asked for it. */
function FitToArea({ area }: { area: MapArea }) {
  const map = useMap()
  const key = Object.values(area).join(",")

  useEffect(() => {
    map.fitBounds([
      [area.south, area.west],
      [area.north, area.east],
    ])
    // `key` stands for `area`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])

  return null
}

/**
 * Fits the view to the pins when the set of pins changes (another filter),
 * not on every render — so opening the list panel keeps the map where it is.
 */
function FitToPins({ pins, center }: { pins: MapPinData[]; center: MapCenter }) {
  const map = useMap()
  const key = pins.map((pin) => pin.id).join(",")

  useEffect(() => {
    if (pins.length === 0) {
      map.setView([center.lat, center.lng], center.zoom ?? DEFAULT_ZOOM)
      return
    }
    const bounds = latLngBounds(pins.map((pin) => [pin.lat, pin.lng]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: FIT_MAX_ZOOM })
    // `key` stands for `pins`: refit only when the set of events changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map, center.lat, center.lng, center.zoom])

  return null
}
