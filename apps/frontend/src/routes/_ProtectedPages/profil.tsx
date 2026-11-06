import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { authKeys } from "@/lib/auth-keys"

import { AccountForms } from "@/features/auth/components/AccountForms"
import { useSession } from "@/features/auth/hooks/useSession"
import { eventKeys } from "@/features/events/api/eventsQueryOptions"
import { groupKeys, myGroupsQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { GroupCard } from "@/features/groups/components/GroupCard"
import { GROUP_GRID } from "@/features/groups/components/GroupList"
import { myGroupTypeLabel } from "@/features/groups/lib/formatGroup"
import { ProfilePage } from "@/features/profile/components/ProfilePage"
import { ProfileError, ProfileLoading } from "@/features/profile/components/ProfileState"

export const Route = createFileRoute("/_ProtectedPages/profil")({ component: ProfileRoute })

function ProfileRoute() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const refreshRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: authKeys.session() }),
      queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
      queryClient.invalidateQueries({ queryKey: groupKeys.all() }),
    ])
  }
  return user ? (
    <ProfilePage
      key={user.id}
      viewerId={user.id}
      onSaved={refreshRelated}
      accountContent={(profile) => <AccountForms profile={profile} />}
      groupsContent={<ProfileGroups viewerId={user.id} />}
    />
  ) : (
    <ProfileLoading />
  )
}

function ProfileGroups({ viewerId }: { viewerId: string }) {
  const query = useQuery(myGroupsQueryOptions(viewerId))
  return (
    <section
      className="space-y-4"
      aria-label="Moje skupiny"
    >
      <h2 className="text-xl font-semibold tracking-tight">Moje skupiny</h2>
      {query.error ? (
        <ProfileError retry={() => void query.refetch()} />
      ) : !query.data ? (
        <ProfileLoading />
      ) : !query.data.length ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Zatím nejsi v žádné skupině.</p>
          <Button
            asChild
            variant="outline"
          >
            <Link to={ROUTES.groups}>Prohlédnout skupiny</Link>
          </Button>
        </div>
      ) : (
        <ul className={GROUP_GRID}>
          {query.data.map((group) => (
            <li key={group.id}>
              <GroupCard
                group={group}
                titleAs="h3"
                typeLabel={myGroupTypeLabel(group)}
                linkTo={
                  group.membership.role === "admin" && group.membership.status === "active"
                    ? "manage"
                    : "page"
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
