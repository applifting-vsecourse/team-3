import { createFileRoute } from "@tanstack/react-router"

import { useSession } from "@/features/auth/hooks/useSession"
import { friendsKeys } from "@/features/friends/api/friendsQueryOptions"
import { PartnersPage } from "@/features/partners/components/PartnersPage"
import { useRecordPartnersVisit } from "@/features/partners/hooks/usePartnerActions"
import { partnersSearchSchema, radiusFromSearch } from "@/features/partners/lib/partnersSearch"
import { profileKeys } from "@/features/profile/api/profileQueryOptions"
import { ProfileLoading } from "@/features/profile/components/ProfileState"

export const Route = createFileRoute("/_ProtectedPages/partaci")({
  component: PartnersRoute,
  validateSearch: partnersSearchSchema,
})

/** /partaci (#84): Najdi parťáka, linked from Můj profil and the end of the onboarding. */
function PartnersRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { queryClient } = Route.useRouteContext()
  const { user } = useSession()
  // the visit is kept on the server: „Parťáci v okolí“ stay off the landing page for 7 days (#474)
  useRecordPartnersVisit(user?.id)
  // the protected layout lets only a signed-in user in; the session is cached by then
  return user ? (
    <PartnersPage
      key={user.id}
      viewerId={user.id}
      viewerName={user.name}
      radiusKm={radiusFromSearch(search)}
      // replace: widening the okolí shouldn't fill the back button, as the filters of /akce
      onRadiusChange={(radius) => void navigate({ search: { okoli: `${radius}` }, replace: true })}
      // a request or a match changes „Lidé, které znám“ on the profile
      onFriendsChanged={() => queryClient.invalidateQueries({ queryKey: friendsKeys.all() })}
      // „Ukázat mě“ changes the profile's „Ukazovat mě v Najdi parťáka“
      onVisibilityChanged={() =>
        queryClient.invalidateQueries({ queryKey: profileKeys.self(user.id) })
      }
    />
  ) : (
    <ProfileLoading />
  )
}
