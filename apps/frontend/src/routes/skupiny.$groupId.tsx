import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { RefreshCw } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { HTTPError } from "@/lib/api-client"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { useSession } from "@/features/auth/hooks/useSession"
import { groupQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { GroupProfile } from "@/features/groups/components/GroupProfile"

export const Route = createFileRoute("/skupiny/$groupId")({
  component: GroupPage,
})

/** Figma A-08. Public: visitors see the page without an account. */
function GroupPage() {
  const { groupId } = Route.useParams()
  const { user } = useSession()
  const groupQuery = useQuery(groupQueryOptions(groupId))
  const group = groupQuery.data
  const isNotFound =
    groupQuery.error instanceof HTTPError && groupQuery.error.response.status === 404

  return (
    <>
      <Seo title={group?.name ?? (isNotFound ? "Skupina nenalezena" : "Skupina")} />
      <Header userMenu={<HeaderMenu />} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 md:py-8">
        <BackLink
          to={ROUTES.groups}
          fallbackLabel="Všechny skupiny"
        />

        {group ? (
          <GroupProfile
            group={group}
            isAdmin={Boolean(user && group.admins.some((admin) => admin.id === user.id))}
          />
        ) : groupQuery.error ? (
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
          <span>Zkontrolujte připojení a zkuste to znovu.</span>
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
