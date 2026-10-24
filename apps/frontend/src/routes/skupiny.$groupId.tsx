import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, RefreshCw } from "lucide-react"

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

  return (
    <>
      <Seo title={group?.name ?? "Skupina"} />
      <Header userMenu={<HeaderMenu />} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 md:py-8">
        <Link
          to="/skupiny"
          className="flex items-center gap-2 self-start rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <ArrowLeft
            aria-hidden
            className="size-4"
          />
          Skupiny
        </Link>

        {group ? (
          <GroupProfile
            group={group}
            isAdmin={Boolean(user && group.admins.some((admin) => admin.id === user.id))}
          />
        ) : groupQuery.error ? (
          <GroupError
            isNotFound={
              groupQuery.error instanceof HTTPError && groupQuery.error.response.status === 404
            }
            onRetry={() => void groupQuery.refetch()}
          />
        ) : (
          <div
            className="flex flex-col gap-6"
            aria-busy
            aria-label="Načítám skupinu"
          >
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
    return (
      <div className="flex flex-col gap-2 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Skupina neexistuje</h1>
        <p className="text-muted-foreground">Odkaz je možná překlepnutý.</p>
      </div>
    )
  }
  return (
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
  )
}
