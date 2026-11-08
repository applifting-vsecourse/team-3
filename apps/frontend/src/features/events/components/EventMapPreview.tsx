import type { PublicEvent } from "@/features/events/api/eventSchemas"
import { EventCard } from "@/features/events/components/EventCard"

type EventMapPreviewProps = {
  event: PublicEvent
  /** Phone: the list's row card above the bottom navigation; desktop: the bigger card with a line of the description. */
  isDesktop: boolean
}

/**
 * What a tap on a pin shows (Figma A-03a, A-03ad; #56): the event's card floating over the map,
 * a tap on it opens the detail. A tap into the map, a second tap on the pin or Escape closes it
 * (the page's). Pointer only, like the pins: the list is the way for a keyboard.
 */
export function EventMapPreview({ event, isDesktop }: EventMapPreviewProps) {
  return (
    <section
      aria-label="Náhled akce"
      // floats over the map, so it has a shadow (DESIGN.md › Surfaces)
      className={
        isDesktop
          ? "absolute bottom-4 left-4 z-[1000] w-80 rounded-2xl shadow-md"
          : "absolute inset-x-4 bottom-4 z-20 rounded-2xl shadow-md"
      }
    >
      <EventCard
        event={event}
        variant={isDesktop ? "grid" : "row"}
        summary={isDesktop ? event.summary : undefined}
        titleAs="h2"
      />
    </section>
  )
}
