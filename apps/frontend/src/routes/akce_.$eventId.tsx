import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useLocation } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { authKeys } from "@/lib/auth-keys"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { useSession } from "@/features/auth/hooks/useSession"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"
import { CancelEventDialog } from "@/features/events/components/CancelEventDialog"
import { EventDetailView } from "@/features/events/components/EventDetailView"
import { ParticipationAction } from "@/features/events/components/ParticipationAction"
import { useCancelEvent } from "@/features/events/hooks/useCancelEvent"
import { useEventDetail } from "@/features/events/hooks/useEventDetail"
import { useJoinEvent, useLeaveEvent } from "@/features/events/hooks/useParticipation"

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
  const join = useJoinEvent(eventId, session.user?.id ?? "")
  const leave = useLeaveEvent(eventId, session.user?.id ?? "")
  const signInFrom = encodeRedirectUri(location)
  const cancelEvent = useCancelEvent(eventId, session.user?.id ?? "")
  // only the organizer, and only while the event can still be edited or cancelled
  const canManage =
    event !== undefined &&
    session.user?.id === event.organizer.id &&
    event.status === "published" &&
    event.startsAt > new Date()

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
            signInFrom={signInFrom}
            participation={
              event ? (
                <ParticipationAction
                  event={event}
                  viewer={
                    session.user
                      ? { id: session.user.id, emailVerified: session.user.emailVerified }
                      : null
                  }
                  signInFrom={signInFrom}
                  isPending={join.isPending || leave.isPending}
                  onJoin={() =>
                    join.mutate(undefined, {
                      onSuccess: (updated) =>
                        toast.success(
                          updated.myParticipation === "pending"
                            ? "Žádost je odeslaná."
                            : "Jste přihlášení na akci.",
                        ),
                      // the API's 409 says why, in Czech (e.g. „Akce je plná.“)
                      onError: (joinError) => toast.error(joinError.message),
                    })
                  }
                  onLeave={() =>
                    leave.mutate(undefined, {
                      onSuccess: () => toast.success("Odhlásili jste se z akce."),
                      onError: (leaveError) => toast.error(leaveError.message),
                    })
                  }
                />
              ) : null
            }
            organizerActions={
              canManage ? (
                <div className="flex flex-wrap gap-3">
                  <Button
                    asChild
                    variant="outline"
                  >
                    <Link
                      to={ROUTES.editEvent}
                      params={{ eventId }}
                    >
                      Upravit
                    </Link>
                  </Button>
                  <CancelEventDialog
                    isPending={cancelEvent.isPending}
                    onCancel={(reason) =>
                      cancelEvent.mutateAsync(reason).then(
                        () => toast.success("Akce je zrušená."),
                        (cancelError: Error) => {
                          toast.error(cancelError.message)
                          throw cancelError
                        },
                      )
                    }
                  />
                </div>
              ) : null
            }
          />
        </div>
      </main>
    </>
  )
}
