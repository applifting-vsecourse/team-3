import { useEffect, useRef } from "react"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import { EventCard } from "@/features/events/components/EventCard"
import { PastEventCard } from "@/features/events/components/PastEventCard"
import { eventRatingLabel } from "@/features/events/lib/formatEvent"

type EventMapPreviewProps = {
  event: PublicEvent
  /** Phone: the list's row card above the bottom navigation; desktop: the bigger card. Both with the start of the description. */
  isDesktop: boolean
  /**
   * Phone: how much of the map's bottom the preview covers, its `bottom-4` included, so the
   * map's attribution can sit above it while the list sheet is hidden (review #276).
   */
  onCoverChange?: (px: number) => void
  /** Proběhlé (#61): the past card, how it ended instead of the capacity. */
  isPast?: boolean
}

// bottom-4
const PREVIEW_BOTTOM = 16

/**
 * What a tap on a pin shows (Figma A-03a, A-03ad; #56): the event's card floating over the map,
 * a tap on it opens the detail. A tap into the map, a second tap on the pin or Escape closes it
 * (the page's). Pointer only, like the pins: the list is the way for a keyboard.
 */
export function EventMapPreview({
  event,
  isDesktop,
  onCoverChange,
  isPast = false,
}: EventMapPreviewProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const preview = ref.current
    if (!preview || !onCoverChange) return
    const measure = () => onCoverChange(preview.offsetHeight + PREVIEW_BOTTOM)
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(preview)
    return () => observer.disconnect()
  }, [onCoverChange])

  return (
    <section
      ref={ref}
      aria-label="Náhled akce"
      // floats over the map, so it has a shadow (DESIGN.md › Surfaces)
      className={
        isDesktop
          ? "absolute bottom-4 left-4 z-[1000] w-80 rounded-2xl shadow-md"
          : "absolute inset-x-4 bottom-4 z-20 rounded-2xl shadow-md"
      }
    >
      {isPast ? (
        <PastEventCard
          event={event}
          detail={eventRatingLabel(event.rating)}
          titleAs="h2"
        />
      ) : (
        <EventCard
          event={event}
          variant={isDesktop ? "grid" : "row"}
          summary={event.summary}
          titleAs="h2"
        />
      )}
    </section>
  )
}
