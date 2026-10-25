import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useLocation } from "@tanstack/react-router"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { authKeys } from "@/lib/auth-keys"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { AppHeader } from "@/features/auth/components/AppHeader"
import { useSession } from "@/features/auth/hooks/useSession"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"
import { CancelEventDialog } from "@/features/events/components/CancelEventDialog"
import { EventDetailView } from "@/features/events/components/EventDetailView"
import { ParticipationAction } from "@/features/events/components/ParticipationAction"
import { ShareEventButton } from "@/features/events/components/ShareEventButton"
import { useCancelEvent } from "@/features/events/hooks/useCancelEvent"
import { useEventDetail } from "@/features/events/hooks/useEventDetail"
import { useJoinEvent, useLeaveEvent } from "@/features/events/hooks/useParticipation"
import { editRefusal } from "@/features/events/lib/editRefusal"

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
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const queryClient = useQueryClient()
  const join = useJoinEvent(eventId, session.user?.id ?? "")
  const leave = useLeaveEvent(eventId, session.user?.id ?? "")
  const signInFrom = encodeRedirectUri(location)
  const cancelEvent = useCancelEvent(eventId, session.user?.id ?? "")
  // only the organizer, and only while the event can still be edited or cancelled
  const canManage = event !== undefined && editRefusal(event, session.user?.id) === null

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
      <AppHeader />
      <main className="flex-1">
        <div className={cn(PAGE, "gap-4")}>
          {/* Figma A-05 (Header/Sub): back on the left, „Sdílet“ on the right;
              desktop shares from the panel (A-05d) */}
          <div className="flex items-center justify-between gap-3">
            <BackLink
              to={ROUTES.events}
              fallbackLabel="Všechny akce"
              label="Akce"
            />
            {event && !isDesktop ? (
              <ShareEventButton
                label="Sdílet"
                shouldUseShareSheet
                className="-mr-3"
              />
            ) : null}
          </div>
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
                            : "Máš na akci místo.",
                        ),
                      // the API's 409 says why, in Czech (e.g. „Akce je plná.“)
                      onError: (joinError) => toast.error(joinError.message),
                    })
                  }
                  onLeave={() => {
                    // a withdrawn request never had a place to give up
                    const isWithdrawingRequest = event.myParticipation === "pending"
                    leave.mutate(undefined, {
                      onSuccess: () =>
                        toast.success(
                          isWithdrawingRequest ? "Žádost je stažená." : "Na akci už nejdeš.",
                        ),
                      onError: (leaveError) => toast.error(leaveError.message),
                    })
                  }}
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
