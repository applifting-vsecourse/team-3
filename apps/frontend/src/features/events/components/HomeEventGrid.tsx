import { homeGridColumns } from "@/components/HomeSection/HomeSection"
import { cn } from "@/lib/utils"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import { EventCard } from "@/features/events/components/EventCard"

/**
 * The events of a landing page section: a column of row cards on a phone, a grid with a
 * column per card on desktop (`homeGridColumns`). A single one is a row card over the width.
 */
export function HomeEventGrid({ events }: { events: PublicEvent[] }) {
  const isSingle = events.length === 1
  return (
    <ul className={cn("grid grid-cols-1 gap-3 md:gap-6", homeGridColumns(events.length))}>
      {events.map((event) => (
        <li key={event.id}>
          <EventCard
            event={event}
            variant={isSingle ? "row" : "responsive"}
            titleAs="h3"
            // only the nearest events of an empty locality have one (#299)
            distanceKm={event.distanceKm}
          />
        </li>
      ))}
    </ul>
  )
}
