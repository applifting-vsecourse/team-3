import { MapView, type MapArea, type MapCenter, type MapPinData } from "@/components/map/MapView"
import { missingLabel } from "@/lib/occupancy"

import type { PublicEvent } from "@/features/events/api/eventSchemas"

/** Figma: Popisek špendlíku — „Večerní běh Letnou · chybí 1“ */
const pinLabel = (event: PublicEvent) => {
  if (event.isFull) return `${event.title} · plno`
  if (event.missingToMin > 0) return `${event.title} · ${missingLabel(event.missingToMin)}`
  return event.title
}

export const toPin = (event: PublicEvent): MapPinData => ({
  id: event.id,
  lat: event.lat,
  lng: event.lng,
  // events that still miss people are the highlighted pins
  variant: event.isFull ? "full" : event.missingToMin > 0 ? "highlighted" : "default",
  label: pinLabel(event),
})

type EventsMapProps = {
  events: PublicEvent[]
  highlightedId?: string
  /** The event whose preview is open (#56). */
  selectedId?: string
  /** A pin selects its event, the same pin again or the map itself unselects. */
  onSelect: (eventId: string | undefined) => void
  center: MapCenter
  /** The searched area („Hledat v této oblasti“), kept in view. */
  area?: MapArea
  onAreaSearch: (area: MapArea) => void
  /** What floats over the map's top edge (px), so „Hledat v této oblasti“ sits under it (#288). */
  topInset?: number
  hasZoomControl?: boolean
  className?: string
}

/**
 * The same events as the list, as pins in clusters; filters apply to both. A pin opens the
 * event's preview (Figma A-03a, #56), the preview opens the detail.
 */
export function EventsMap({
  events,
  highlightedId,
  selectedId,
  onSelect,
  center,
  area,
  onAreaSearch,
  topInset,
  hasZoomControl,
  className,
}: EventsMapProps) {
  return (
    <MapView
      pins={events.map(toPin)}
      highlightedId={highlightedId}
      selectedId={selectedId}
      center={center}
      area={area}
      isClustered
      hasZoomControl={hasZoomControl}
      onPinClick={(eventId) => onSelect(eventId === selectedId ? undefined : eventId)}
      onMapClick={() => onSelect(undefined)}
      onAreaSearch={onAreaSearch}
      topInset={topInset}
      className={className}
    />
  )
}
