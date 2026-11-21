import { createFileRoute } from "@tanstack/react-router"

import { useSession } from "@/features/auth/hooks/useSession"
import { FriendsPage } from "@/features/friends/components/FriendsPage"
import { friendsSearchSchema } from "@/features/friends/lib/friends"
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
  // the protected layout lets only a signed-in user in; the session is cached by then
  return user ? (
    <FriendsPage
      key={user.id}
      viewerId={user.id}
      urlTab={tab}
      // replace: switching chips shouldn't fill the back button, as in Moje
      onTabChange={(next) => void navigate({ search: { tab: next }, replace: true })}
    />
  ) : (
    <ProfileLoading />
  )
}
