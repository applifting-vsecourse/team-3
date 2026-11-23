import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { useSession } from "@/features/auth/hooks/useSession"
import { FriendsPreview } from "@/features/friends/components/FriendsPreview"
import { InviteFriendSection } from "@/features/invites/components/InviteFriendSection"
import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { ProfilePage } from "@/features/profile/components/ProfilePage"
import { ProfileLoading } from "@/features/profile/components/ProfileState"

export const Route = createFileRoute("/_ProtectedPages/profil/")({ component: ProfileRoute })

function ProfileRoute() {
  const { user } = useSession()
  // the protected layout lets only a signed-in user in; the session is cached by then
  return user ? (
    <ProfilePage
      key={user.id}
      viewerId={user.id}
      peopleContent={<People viewerId={user.id} />}
    />
  ) : (
    <ProfileLoading />
  )
}

/** „Lidé, které znám“ (#307) and under it „Pozvi kamaráda“ (#406). */
function People({ viewerId }: { viewerId: string }) {
  // the page loads the profile anyway; the share message names my interests
  const profile = useQuery(profileQueryOptions(viewerId))
  return (
    <div className="flex flex-col gap-8">
      <FriendsPreview viewerId={viewerId} />
      <InviteFriendSection
        viewerId={viewerId}
        interests={profile.data?.interests.map(({ name }) => name) ?? []}
      />
    </div>
  )
}
