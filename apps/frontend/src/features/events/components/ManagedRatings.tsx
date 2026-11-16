import { Link } from "@tanstack/react-router"
import { Star } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import type { EventDetail } from "@/features/events/api/eventSchemas"
import { ReceivedRatings } from "@/features/events/components/ReceivedRatings"
import { canRateParticipants, ratingDeadline, tookPlace } from "@/features/events/lib/rating"

type ManagedRatingsProps = {
  event: EventDetail
  viewerId: string | null
  now: Date
}

/**
 * The ratings on the event's management page (B-060, #66): „Ohodnotit účastníky“ for its creator
 * while the window is open (D-05), and „Jak akci hodnotili“ for who manages an event that took
 * place. Nothing before it ends, for a cancelled one or one below its minimum.
 */
export function ManagedRatings({ event, viewerId, now }: ManagedRatingsProps) {
  if (viewerId === null || !tookPlace(event, now)) return null
  return (
    <>
      {canRateParticipants(event, viewerId, now) ? (
        <Button
          asChild
          variant="outline"
          size="lg"
          className="w-full"
        >
          <Link
            to={ROUTES.rateParticipants}
            params={{ eventId: event.id }}
          >
            <Star />
            Ohodnotit účastníky
          </Link>
        </Button>
      ) : null}
      <ReceivedRatings
        eventId={event.id}
        viewerId={viewerId}
        isGroupEvent={event.group !== null}
        isRatingOpen={now <= ratingDeadline(event)}
      />
    </>
  )
}
