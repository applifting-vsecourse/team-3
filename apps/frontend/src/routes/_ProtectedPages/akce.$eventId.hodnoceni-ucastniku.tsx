import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { useSession } from "@/features/auth/hooks/useSession"
import { RateParticipantsPage } from "@/features/events/components/RateParticipantsPage"
import { publicUserKeys } from "@/features/users/api/publicProfile"

export const Route = createFileRoute("/_ProtectedPages/akce/$eventId/hodnoceni-ucastniku")({
  component: RateParticipantsRoute,
})

/**
 * Figma D-05 (#66): the organizer rates who came. Its own address (review #322): „Ohodnotit
 * účastníky“ on the event's management leads here, so the page knows the role from the start;
 * /akce/:id/hodnoceni sends the organizer here too (403 OWN_EVENT), for a link from elsewhere.
 */
function RateParticipantsRoute() {
  const { eventId } = Route.useParams()
  const { user } = useSession()
  const queryClient = useQueryClient()
  // the participants' public profiles show the ratings
  const refreshProfiles = () => queryClient.invalidateQueries({ queryKey: publicUserKeys.all() })
  // the protected layout lets only a signed-in user in; the session is cached by then
  return user ? (
    <RateParticipantsPage
      key={user.id}
      eventId={eventId}
      viewerId={user.id}
      onSaved={refreshProfiles}
    />
  ) : null
}
