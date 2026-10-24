import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useLocation } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"
import { authKeys } from "@/lib/auth-keys"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { useSession } from "@/features/auth/hooks/useSession"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"
import { EventDetailView } from "@/features/events/components/EventDetailView"
import { useEventDetail } from "@/features/events/hooks/useEventDetail"

// `akce_`: not nested in /akce, whose page has no outlet. Public on purpose:
// a shared link opens straight on the detail, without signing in (US-03).
export const Route = createFileRoute("/akce_/$eventId")({
  component: EventDetailPage,
})

function EventDetailPage() {
  const { eventId } = Route.useParams()
  const session = useSession()
  // a failed session check counts as a visitor: the detail is public
  const viewerId = session.isPending ? undefined : (session.user?.id ?? null)
  const { event, isPending, isNotFound, error, retry } = useEventDetail(eventId, viewerId)
  const location = useLocation()
  const queryClient = useQueryClient()

  // The cached session says signed in, yet the API answered as to a visitor:
  // the cookie has expired. Refresh the session so the header and the login
  // link (which would otherwise bounce to /akce) agree with the page.
  useEffect(() => {
    if (viewerId && event?.participants === null) {
      void queryClient.invalidateQueries({ queryKey: authKeys.session() })
    }
  }, [viewerId, event, queryClient])

  return (
    <>
      <Seo title={event?.title ?? (isNotFound ? "Akce nenalezena" : "Akce")} />
      <Header userMenu={<HeaderMenu />} />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
          <BackLink
            to={ROUTES.events}
            fallbackLabel="Všechny akce"
          />
          <EventDetailView
            event={event}
            isLoading={isPending}
            isNotFound={isNotFound}
            error={error}
            onRetry={retry}
            signInFrom={encodeRedirectUri(location)}
          />
        </div>
      </main>
    </>
  )
}
