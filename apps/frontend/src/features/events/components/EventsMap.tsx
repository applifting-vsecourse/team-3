import { useNavigate } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { MapView, type MapCenter, type MapPinData } from "@/components/map/MapView"

import type { PublicEvent } from "@/features/events/api/eventSchemas"

/** Figma: Popisek špendlíku — „Večerní běh Letnou · chybí 1“ */
const pinLabel = (event: PublicEvent) => {
  if (event.isFull) return `${event.title} · plno`
  if (event.missingToMin > 0) return `${event.title} · chybí ${event.missingToMin}`
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
  center: MapCenter
  hasZoomControl?: boolean
  className?: string
}

/** The same events as the list, as pins; filters apply to both. A pin opens the event. */
export function EventsMap({
  events,
  highlightedId,
  center,
  hasZoomControl,
  className,
}: EventsMapProps) {
  const navigate = useNavigate()
  return (
    <MapView
      pins={events.map(toPin)}
      highlightedId={highlightedId}
      center={center}
      hasZoomControl={hasZoomControl}
      onPinClick={(eventId) => void navigate({ to: ROUTES.eventDetail, params: { eventId } })}
      className={className}
    />
  )
}
