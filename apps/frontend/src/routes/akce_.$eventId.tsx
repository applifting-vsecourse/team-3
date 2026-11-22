import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { AppHeader } from "@/app/AppHeader"
import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { Seo } from "@/components/Seo"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { redirectFrom } from "@/features/auth/lib/redirect"
import { EventActions } from "@/features/events/components/EventActions"
import { EventDetailView, EVENTS_BACK } from "@/features/events/components/EventDetailView"
import { EventMessages } from "@/features/events/components/EventMessages"
import { ParticipationAction } from "@/features/events/components/ParticipationAction"
import { useCancelEvent } from "@/features/events/hooks/useCancelEvent"
import { useEventDetail } from "@/features/events/hooks/useEventDetail"
import { useHideEvent, useUnhideEvent } from "@/features/events/hooks/useModerateEvent"
import { useJoinEvent, useLeaveEvent } from "@/features/events/hooks/useParticipation"
import { useRefreshExpiredSession } from "@/features/events/hooks/useRefreshExpiredSession"
import { groupQueryOptions } from "@/features/groups/api/groupsQueryOptions"
import { GroupOrganizer } from "@/features/groups/components/GroupOrganizer"
import { MembersOnlyEvent } from "@/features/groups/components/MembersOnlyEvent"

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
  const { event, isPending, isNotFound, isSignInRequired, membersOnlyGroupId, error, retry } =
    useEventDetail(eventId, viewerId)
  // a group's event shows the group's card and admins (A-05g); the group page is public
  const groupId = event?.group?.id
  const { data: organizerGroup } = useQuery({
    ...groupQueryOptions(groupId ?? "", viewerId),
    enabled: groupId !== undefined,
  })
  const location = useLocation()
  const join = useJoinEvent(eventId, session.user?.id ?? "")
  const leave = useLeaveEvent(eventId, session.user?.id ?? "")
  const signInFrom = redirectFrom(location)
  const cancelEvent = useCancelEvent(eventId, session.user?.id ?? "")
  // the superadmin's interventions (#308)
  const hideEvent = useHideEvent(eventId, session.user?.id ?? "")
  const unhideEvent = useUnhideEvent(eventId, session.user?.id ?? "")

  useRefreshExpiredSession(viewerId, event)

  // A members-only event: a visitor signs in and comes back to it (B-026).
  // Once, from an effect, and back to the event's own path: while the login
  // loads this page is still mounted with the login's location, so a `from`
  // taken from the location (or a <Navigate> rendered on every pass) kept
  // sending the visitor to a login of the login.
  const navigate = useNavigate()
  useEffect(() => {
    if (isSignInRequired) {
      void navigate({
        to: ROUTES.login,
        search: { from: `/akce/${encodeURIComponent(eventId)}` },
        replace: true,
      })
    }
  }, [isSignInRequired, navigate, eventId])

  return (
    <>
      <Seo title={event?.title ?? (isNotFound ? "Akce není dostupná" : "Akce")} />
      <AppHeader />
      <main className="flex-1">
        {membersOnlyGroupId ? (
          <div className={cn(PAGE, "gap-4")}>
            <BackLink {...EVENTS_BACK} />
            <MembersOnlyEvent
              groupId={membersOnlyGroupId}
              viewerId={viewerId}
              signInFrom={signInFrom}
              onMember={retry}
            />
          </div>
        ) : (
          <EventDetailView
            event={event}
            organizerGroup={organizerGroup ? <GroupOrganizer group={organizerGroup} /> : undefined}
            viewerId={viewerId}
            messages={
              // the organizer's messages go to whoever got the names of who is coming;
              // the API decides both (#174, #176)
              // a deactivated event has none to read: its messages are 404, also to the superadmin (#308)
              event?.participants && viewerId && event.status !== "hidden" ? (
                <EventMessages
                  eventId={eventId}
                  viewerId={viewerId}
                  isOrganizer={event.organizer.id === viewerId}
                />
              ) : null
            }
            isLoading={isPending}
            isNotFound={isNotFound}
            error={error}
            onRetry={retry}
            participation={
              event ? (
                <ParticipationAction
                  event={event}
                  viewer={session.user ? { id: session.user.id } : null}
                  signInFrom={signInFrom}
                  isPending={join.isPending || leave.isPending}
                  onJoin={(message) =>
                    join.mutateAsync(message).then(
                      (updated) => {
                        toast.success(
                          updated.myParticipation === "pending"
                            ? "Žádost je odeslaná."
                            : "Máš na akci místo.",
                        )
                        return updated
                      },
                      // the API's 409 says why, in Czech (e.g. „Akce je plná.“)
                      (joinError: Error) => {
                        toast.error(joinError.message)
                        throw joinError
                      },
                    )
                  }
                  onLeave={() => {
                    // a withdrawn request never had a place to give up
                    const isWithdrawingRequest = event.myParticipation === "pending"
                    return leave.mutateAsync().then(
                      () =>
                        toast.success(
                          isWithdrawingRequest ? "Žádost je stažená." : "Na akci už nejdeš.",
                        ),
                      (leaveError: Error) => {
                        toast.error(leaveError.message)
                        throw leaveError
                      },
                    )
                  }}
                />
              ) : null
            }
            organizerActions={
              event ? (
                <EventActions
                  event={event}
                  isCancelling={cancelEvent.isPending}
                  onCancel={(reason) =>
                    cancelEvent.mutateAsync(reason).then(
                      () => toast.success("Akce je zrušená."),
                      (cancelError: Error) => {
                        toast.error(cancelError.message)
                        throw cancelError
                      },
                    )
                  }
                  isModerating={hideEvent.isPending || unhideEvent.isPending}
                  onHide={(reason) =>
                    hideEvent.mutateAsync(reason).then(
                      () => toast.success("Akce je deaktivovaná."),
                      (hideError: Error) => {
                        toast.error(hideError.message)
                        throw hideError
                      },
                    )
                  }
                  onUnhide={() =>
                    unhideEvent.mutate(undefined, {
                      onSuccess: () => toast.success("Akce je zase zveřejněná."),
                      onError: (unhideError) => toast.error(unhideError.message),
                    })
                  }
                />
              ) : null
            }
          />
        )}
      </main>
    </>
  )
}
