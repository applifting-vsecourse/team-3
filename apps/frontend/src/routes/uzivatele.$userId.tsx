import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useLocation } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { HTTPError } from "@/lib/api-client"
import { ratingSummaryLabel } from "@/lib/ratingSummary"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { useSession } from "@/features/auth/hooks/useSession"
import { redirectFrom } from "@/features/auth/lib/redirect"
import { EventCard } from "@/features/events/components/EventCard"
import { PastEventCard } from "@/features/events/components/PastEventCard"
import { FriendshipAction } from "@/features/friends/components/FriendshipAction"
import { publicProfileQueryOptions, publicUserKeys } from "@/features/users/api/publicProfile"
import { PublicProfileView } from "@/features/users/components/PublicProfileView"

export const Route = createFileRoute("/uzivatele/$userId")({ component: PublicUserPage })

function PublicUserPage() {
  const { userId } = Route.useParams()
  const session = useSession()
  const location = useLocation()
  const queryClient = useQueryClient()
  // the viewer is in the key: the friendship and Kam jde are theirs (#307); none while the
  // session loads, so a signed-in viewer never sees a visitor's profile first
  const viewerId = session.user?.id ?? null
  const query = useQuery({
    ...publicProfileQueryOptions(userId, viewerId),
    enabled: !session.isPending,
  })
  const isNotFound = query.error instanceof HTTPError && query.error.response.status === 404
  const profile = query.data
  return (
    <>
      <Seo title={profile?.name ?? "Profil uživatele"} />
      <AppHeader />
      {/* the band and its H1 belong to main, as on every page */}
      <main className="flex flex-1 flex-col">
        <PublicProfileView
          profile={profile}
          isLoading={session.isPending || query.isPending}
          isNotFound={isNotFound}
          error={query.error ?? undefined}
          onRetry={() => void query.refetch()}
          renderOrganizedEvent={(event) => (
            <PastEventCard
              event={event}
              // a visitor's own rating isn't part of the public profile: the event's average instead
              detail={ratingSummaryLabel(event.rating)}
            />
          )}
          friendshipAction={
            profile ? (
              <FriendshipAction
                userId={userId}
                name={profile.name}
                state={profile.friendship}
                signInFrom={redirectFrom(location)}
                // the state and Kam jde change with the friendship
                onChanged={() =>
                  queryClient.invalidateQueries({ queryKey: publicUserKeys.person(userId) })
                }
              />
            ) : null
          }
          renderUpcomingEvent={(event) => (
            // Figma B-07f, B-07fd: the row card (Foto řádek) in its column, also on desktop — the
            // occupancy on it, not the viewer's place
            <EventCard
              event={event}
              variant="row"
              isGroupShown
              titleAs="h3"
            />
          )}
        />
      </main>
    </>
  )
}
