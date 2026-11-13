import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

import type { MyEvent } from "@/features/events/api/eventSchemas"
import { EventCard } from "@/features/events/components/EventCard"
import { PastEventCard } from "@/features/events/components/PastEventCard"
import { attendingRowLead, attendingStatus, organizingStatus } from "@/features/events/lib/myEvents"
import { canRateEvent } from "@/features/events/lib/rating"

/**
 * An event in a section of /profil (#178, Figma B-05): Kam jdu and Pořádám as the row card
 * with the badges of Moje akce („Jdu“, „Čeká na schválení“, the occupancy, „Zrušeno“),
 * Proběhlé as the past card, with „Ohodnotit →“ to the rating page (C-03, #66) while the event
 * can be rated by the API's rules. Every card opens the event's detail.
 */
export function ProfileEventCard({
  event,
  section,
  viewerId,
  now = new Date(),
}: {
  event: MyEvent
  section: "upcoming" | "organizing" | "past"
  /** The profile's owner: the organizer of their own event doesn't rate it. */
  viewerId: string
  now?: Date
}) {
  if (section === "past") {
    return (
      <PastEventCard
        event={event}
        // the overview doesn't carry the user's rating: „Ohodnotit →“ also leads to change it
        rating={{ kind: "open" }}
        rateAction={
          canRateEvent(event, viewerId, now) ? (
            <Link
              to={ROUTES.rateEvent}
              params={{ eventId: event.id }}
              className="underline underline-offset-4"
            >
              Ohodnotit →
            </Link>
          ) : undefined
        }
      />
    )
  }
  const isUpcoming = section === "upcoming"
  return (
    <EventCard
      event={event}
      variant="row"
      status={isUpcoming ? attendingStatus(event) : organizingStatus(event)}
      rowLead={isUpcoming ? attendingRowLead(event) : undefined}
      titleAs="h3"
    />
  )
}
