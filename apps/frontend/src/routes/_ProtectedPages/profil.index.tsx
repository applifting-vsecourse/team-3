import { createFileRoute } from "@tanstack/react-router"

import { useSession } from "@/features/auth/hooks/useSession"
import { ProfileGroups } from "@/features/groups/components/ProfileGroups"
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
      groupsContent={<ProfileGroups viewerId={user.id} />}
    />
  ) : (
    <ProfileLoading />
  )
}
