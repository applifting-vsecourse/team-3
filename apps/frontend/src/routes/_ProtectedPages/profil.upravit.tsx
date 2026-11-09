import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { authKeys } from "@/lib/auth-keys"

import { AccountForms } from "@/features/auth/components/AccountForms"
import { useSession } from "@/features/auth/hooks/useSession"
import { eventKeys } from "@/features/events/api/eventsQueryOptions"
import { groupKeys } from "@/features/groups/api/groupsQueryOptions"
import { ProfileEditPage } from "@/features/profile/components/ProfileEditPage"
import { ProfileLoading } from "@/features/profile/components/ProfileState"

export const Route = createFileRoute("/_ProtectedPages/profil/upravit")({
  component: EditProfileRoute,
})

function EditProfileRoute() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  // the name shows in the header, on events and in groups
  const refreshRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: authKeys.session() }),
      queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
      queryClient.invalidateQueries({ queryKey: groupKeys.all() }),
    ])
  }
  // the protected layout lets only a signed-in user in; the session is cached by then
  return user ? (
    <ProfileEditPage
      key={user.id}
      viewerId={user.id}
      onSaved={refreshRelated}
      accountContent={(profile) => <AccountForms profile={profile} />}
    />
  ) : (
    <ProfileLoading />
  )
}
