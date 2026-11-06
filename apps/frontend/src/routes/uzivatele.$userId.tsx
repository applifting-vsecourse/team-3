import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { Seo } from "@/components/Seo"
import { HTTPError } from "@/lib/api-client"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { publicProfileQueryOptions } from "@/features/users/api/publicProfile"
import { PublicProfileView } from "@/features/users/components/PublicProfileView"

export const Route = createFileRoute("/uzivatele/$userId")({ component: PublicUserPage })

function PublicUserPage() {
  const { userId } = Route.useParams()
  const query = useQuery(publicProfileQueryOptions(userId))
  const isNotFound = query.error instanceof HTTPError && query.error.response.status === 404
  return (
    <>
      <Seo title={query.data?.name ?? "Profil uživatele"} />
      <AppHeader />
      <main className="flex-1">
        <div className={cn(PAGE, "gap-8")}>
          <BackLink
            to={ROUTES.events}
            fallbackLabel="Všechny akce"
          />
          <PublicProfileView
            profile={query.data}
            isLoading={query.isPending}
            isNotFound={isNotFound}
            error={query.error ?? undefined}
            onRetry={() => void query.refetch()}
          />
        </div>
      </main>
    </>
  )
}
