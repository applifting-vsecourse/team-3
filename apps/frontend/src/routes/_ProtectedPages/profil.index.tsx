import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { useSession } from "@/features/auth/hooks/useSession"
import { FriendsPreview } from "@/features/friends/components/FriendsPreview"
import { notificationKeys } from "@/features/notifications/api/notificationsQueryOptions"
import { PartnerEntry } from "@/features/partners/components/PartnerEntry"
import { ProfilePage } from "@/features/profile/components/ProfilePage"
import { ProfileLoading } from "@/features/profile/components/ProfileState"

export const Route = createFileRoute("/_ProtectedPages/profil/")({ component: ProfileRoute })

function ProfileRoute() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  // the protected layout lets only a signed-in user in; the session is cached by then
  return user ? (
    <ProfilePage
      key={user.id}
      viewerId={user.id}
      peopleContent={
        <>
          <FriendsPreview
            viewerId={user.id}
            // a decided request takes its upozornění along (#430): the bell counts it no longer
            onRequestDecided={() =>
              queryClient.invalidateQueries({ queryKey: notificationKeys.all() })
            }
          />
          <PartnerEntry />
        </>
      }
    />
  ) : (
    <ProfileLoading />
  )
}
