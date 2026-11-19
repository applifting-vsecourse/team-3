import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { useSession } from "@/features/auth/hooks/useSession"
import { RateEventPage } from "@/features/events/components/RateEventPage"
import { useReturnAfterRating } from "@/features/events/hooks/useReturnAfterRating"
import { publicUserKeys } from "@/features/users/api/publicProfile"

export const Route = createFileRoute("/_ProtectedPages/akce/$eventId/hodnoceni")({
  component: RateEventRoute,
})

/**
 * Figma C-03 (#66): where „Ohodnotit“ on a past event leads — from Moje › Proběhlé, the event's
 * detail or the e-mail asking for a rating (#65). Only for a signed-in user (the protected layout).
 */
function RateEventRoute() {
  const { eventId } = Route.useParams()
  const { user } = useSession()
  const queryClient = useQueryClient()
  const returnAfterRating = useReturnAfterRating()
  // Saved: back where the user came from (#367); the toast says it saved. Moje's lists refresh
  // with every event (useRateEvent); the organizer's average on their public profile is the
  // route's to refresh.
  const onSaved = async () => {
    returnAfterRating()
    await queryClient.invalidateQueries({ queryKey: publicUserKeys.all() })
  }
  // the protected layout lets only a signed-in user in; the session is cached by then
  return user ? (
    <RateEventPage
      key={user.id}
      eventId={eventId}
      viewerId={user.id}
      onSaved={onSaved}
    />
  ) : null
}
