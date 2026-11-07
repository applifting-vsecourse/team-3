import type { MyEvent } from "@/features/events/api/eventSchemas"
import { EventCard } from "@/features/events/components/EventCard"
import { PastEventCard } from "@/features/events/components/PastEventCard"
import { attendingRowLead, attendingStatus, organizingStatus } from "@/features/events/lib/myEvents"

/**
 * An event in a section of /profil (#178, Figma B-05): Kam jdu and Pořádám as the row card
 * with the badges of Moje akce („Jdu“, „Čeká na schválení“, the occupancy, „Zrušeno“),
 * Proběhlé as the past card. Every card opens the event's detail.
 */
export function ProfileEventCard({
  event,
  section,
}: {
  event: MyEvent
  section: "upcoming" | "organizing" | "past"
}) {
  if (section === "past") {
    return (
      <PastEventCard
        event={event}
        // the overview doesn't carry the user's rating: how many came, no „Dáno“ / „Ohodnotit“
        rating={{ kind: "open" }}
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
