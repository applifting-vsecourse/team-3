import { createFileRoute } from "@tanstack/react-router"

import { useSession } from "@/features/auth/hooks/useSession"
import { NotificationsPage } from "@/features/notifications/components/NotificationsPage"
import { ProfileLoading } from "@/features/profile/components/ProfileState"

export const Route = createFileRoute("/_ProtectedPages/upozorneni")({
  component: NotificationsRoute,
})

/** /upozorneni (#86, Figma C-07): the centre of upozornění, where the bell leads on a phone. */
function NotificationsRoute() {
  const { user } = useSession()
  // the protected layout lets only a signed-in user in; the session is cached by then
  return user ? (
    <NotificationsPage
      key={user.id}
      viewerId={user.id}
    />
  ) : (
    <ProfileLoading />
  )
}
