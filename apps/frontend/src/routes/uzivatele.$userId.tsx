import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { HTTPError } from "@/lib/api-client"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { PastEventCard } from "@/features/events/components/PastEventCard"
import { publicProfileQueryOptions, summaryLabel } from "@/features/users/api/publicProfile"
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
      {/* the band and its H1 belong to main, as on every page */}
      <main className="flex flex-1 flex-col">
        <PublicProfileView
          profile={query.data}
          isLoading={query.isPending}
          isNotFound={isNotFound}
          error={query.error ?? undefined}
          onRetry={() => void query.refetch()}
          renderOrganizedEvent={(event) => (
            <PastEventCard
              event={event}
              // a visitor's own rating isn't part of the public profile: the event's average instead
              rating={{ kind: "open" }}
              detail={summaryLabel(event.rating)}
            />
          )}
        />
      </main>
    </>
  )
}
