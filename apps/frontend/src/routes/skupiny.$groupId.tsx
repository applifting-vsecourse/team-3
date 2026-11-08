import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useLocation } from "@tanstack/react-router"
import { RefreshCw } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { HTTPError } from "@/lib/api-client"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { useSession } from "@/features/auth/hooks/useSession"
import { redirectFrom } from "@/features/auth/lib/redirect"
import { GroupEvents } from "@/features/events/components/GroupEvents"
import { groupQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { GroupAnnouncements } from "@/features/groups/components/GroupAnnouncements"
import { GroupProfile, GROUPS_BACK } from "@/features/groups/components/GroupProfile"

export const Route = createFileRoute("/skupiny/$groupId")({
  component: GroupPage,
})

/** Figma A-08, A-08d, A-08e. Public: visitors see the page without an account. */
function GroupPage() {
  const { groupId } = Route.useParams()
  const session = useSession()
  const user = session.user
  // undefined while the session loads; a failed check counts as a visitor
  const viewerId = session.isPending ? undefined : (user?.id ?? null)
  const groupQuery = useQuery(groupQueryOptions(groupId, viewerId))
  const location = useLocation()
  const group = groupQuery.data
  // announcements are for active members and admins only (#194)
  const isMember = group?.viewerMembership?.status === "active"
  const isNotFound =
    groupQuery.error instanceof HTTPError && groupQuery.error.response.status === 404

  return (
    <>
      <Seo title={group?.name ?? (isNotFound ? "Skupina nenalezena" : "Skupina")} />
      <AppHeader />
      <main className="flex-1">
        {group ? (
          <GroupProfile
            group={group}
            isSignedIn={Boolean(user)}
            signInFrom={redirectFrom(location)}
            announcements={
              isMember && viewerId ? (
                <GroupAnnouncements
                  groupId={groupId}
                  viewerId={viewerId}
                  isAdmin={group.viewerMembership?.role === "admin"}
                />
              ) : null
            }
            events={
              <GroupEvents
                groupId={groupId}
                viewerId={viewerId}
                membership={group.viewerMembership?.status ?? null}
              />
            }
          />
        ) : (
          // before there is a band: the column with the way back
          <div className={cn(PAGE, "gap-4")}>
            <BackLink {...GROUPS_BACK} />
            {groupQuery.error ? (
              <GroupError
                isNotFound={isNotFound}
                onRetry={() => void groupQuery.refetch()}
              />
            ) : (
              <div
                className="flex flex-col gap-6"
                aria-busy
                aria-label="Načítám skupinu"
              >
                <h1 className="sr-only">Skupina</h1>
                <Skeleton className="size-16 rounded-lg" />
                <Skeleton className="h-9 w-3/4" />
                <Skeleton className="h-32 w-full" />
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}

function GroupError({ isNotFound, onRetry }: { isNotFound: boolean; onRetry: () => void }) {
  if (isNotFound) {
    // same as „Akce nenalezena“ on the event detail
    return (
      <section className="flex flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Skupina nenalezena</h1>
        <p className="text-muted-foreground">Odkaz je neplatný, nebo skupina neexistuje.</p>
        <Button
          asChild
          className="mt-3"
        >
          <Link to={ROUTES.groups}>Prohlédnout skupiny</Link>
        </Button>
      </section>
    )
  }
  return (
    <>
      <h1 className="sr-only">Skupina</h1>
      <Alert variant="destructive">
        <AlertTitle>Skupinu se nepodařilo načíst</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>Zkontroluj připojení a zkus to znovu.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
          >
            <RefreshCw className="size-4" />
            Zkusit znovu
          </Button>
        </AlertDescription>
      </Alert>
    </>
  )
}
