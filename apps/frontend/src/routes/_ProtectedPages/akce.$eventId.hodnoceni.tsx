import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { useSession } from "@/features/auth/hooks/useSession"
import { RateEventPage } from "@/features/events/components/RateEventPage"
import { profileKeys } from "@/features/profile/api/profileQueryOptions"
import { publicUserKeys } from "@/features/users/api/publicProfile"

export const Route = createFileRoute("/_ProtectedPages/akce/$eventId/hodnoceni")({
  component: RateEventRoute,
})

/**
 * Figma C-03 (#66): where „Ohodnotit akci“ on a past event's detail leads, and later the link in
 * the e-mail asking for a rating (#65). Only for a signed-in user (the protected layout).
 */
function RateEventRoute() {
  const { eventId } = Route.useParams()
  const { user } = useSession()
  const queryClient = useQueryClient()
  // the organizer's average on their public profile, and the user's own overview
  const refreshProfiles = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: publicUserKeys.all() }),
      user ? queryClient.invalidateQueries({ queryKey: profileKeys.overview(user.id) }) : undefined,
    ])
  }
  // the protected layout lets only a signed-in user in; the session is cached by then
  return user ? (
    <RateEventPage
      key={user.id}
      eventId={eventId}
      viewerId={user.id}
      onSaved={refreshProfiles}
    />
  ) : null
}
