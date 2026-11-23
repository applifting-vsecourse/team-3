import { createFileRoute } from "@tanstack/react-router"

import { AccountSection } from "@/features/auth/components/AccountSection"
import { useSession } from "@/features/auth/hooks/useSession"
import { FriendsPreview } from "@/features/friends/components/FriendsPreview"
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
      peopleContent={<FriendsPreview viewerId={user.id} />}
      accountContent={<AccountSection viewerId={user.id} />}
    />
  ) : (
    <ProfileLoading />
  )
}
