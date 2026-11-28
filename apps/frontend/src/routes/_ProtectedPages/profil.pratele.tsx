import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { useSession } from "@/features/auth/hooks/useSession"
import { FriendsPage } from "@/features/friends/components/FriendsPage"
import { friendsSearchSchema } from "@/features/friends/lib/friends"
import { InviteShareButton } from "@/features/invites/components/InviteShareButton"
import { notificationKeys } from "@/features/notifications/api/notificationsQueryOptions"
import { PartnerFindButton } from "@/features/partners/components/PartnerFindButton"
import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { ProfileLoading } from "@/features/profile/components/ProfileState"

export const Route = createFileRoute("/_ProtectedPages/profil/pratele")({
  component: FriendsRoute,
  validateSearch: friendsSearchSchema,
})

/** /profil/pratele (#307): „Lidé, které znám“ in full, behind the profile's preview. */
function FriendsRoute() {
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = useSession()
  const queryClient = useQueryClient()
  // the protected layout lets only a signed-in user in; the session is cached by then
  return user ? (
    <FriendsPage
      key={user.id}
      viewerId={user.id}
      urlTab={tab}
      // replace: switching chips shouldn't fill the back button, as in Moje
      onTabChange={(next) => void navigate({ search: { tab: next }, replace: true })}
      emptyFriendsActions={<FindFriends viewerId={user.id} />}
      // a decided request takes its upozornění along (#430): the bell counts it no longer
      onRequestDecided={() => queryClient.invalidateQueries({ queryKey: notificationKeys.all() })}
    />
  ) : (
    <ProfileLoading />
  )
}

/**
 * The ways to friends under an empty list (#474): Najdi parťáka (or „Doplnit profil“ while the
 * deck lacks something) and the invite, as Můj profil shares it.
 */
function FindFriends({ viewerId }: { viewerId: string }) {
  // the share message names my interests, as on Můj profil
  const profile = useQuery(profileQueryOptions(viewerId))
  return (
    <>
      <PartnerFindButton viewerId={viewerId} />
      <InviteShareButton
        viewerId={viewerId}
        interests={profile.data?.interests.map(({ name }) => name) ?? []}
      />
    </>
  )
}
