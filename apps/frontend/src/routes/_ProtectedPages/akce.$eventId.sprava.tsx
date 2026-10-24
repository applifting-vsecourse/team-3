import type { ReactNode } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Pencil, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { CapacityBar } from "@/components/CapacityBar/CapacityBar"
import { Seo } from "@/components/Seo"
import { TabBar, TabBarItem } from "@/components/TabBar/TabBar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"

import { useSession } from "@/features/auth/hooks/useSession"
import { CancelEventDialog } from "@/features/events/components/CancelEventDialog"
import { ManagedParticipants } from "@/features/events/components/ManagedParticipants"
import { ManagedRequests } from "@/features/events/components/ManagedRequests"
import { useCancelEvent } from "@/features/events/hooks/useCancelEvent"
import { useDecideRequest } from "@/features/events/hooks/useDecideRequest"
import { useEventDetail } from "@/features/events/hooks/useEventDetail"
import { useEventParticipants } from "@/features/events/hooks/useEventParticipants"
import { editRefusal } from "@/features/events/lib/editRefusal"
import { formatEventTime } from "@/features/events/lib/formatEvent"

export const Route = createFileRoute("/_ProtectedPages/akce/$eventId/sprava")({
  component: ManageEventPage,
})

/**
 * Figma D-03 (#43, #53): the organizer's page of their event — who is
 * coming, against the minimum and the maximum, the requests waiting at an
 * event with approval, and the way to edit or cancel it. Anyone else gets
 * an explanation; the API answers them 403. Removing people is #60.
 */
function ManageEventPage() {
  const { eventId } = Route.useParams()
  const session = useSession()
  const viewerId = session.isPending ? undefined : (session.user?.id ?? null)
  const { event, isPending, isNotFound, error, retry } = useEventDetail(eventId, viewerId)
  const isOrganizer = event !== undefined && event.organizer.id === session.user?.id
  const participants = useEventParticipants(eventId, viewerId, isOrganizer)
  const cancelEvent = useCancelEvent(eventId, session.user?.id ?? "")
  const decide = useDecideRequest(eventId, session.user?.id ?? "")
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const canEdit = event !== undefined && editRefusal(event, session.user?.id) === null

  return (
    <>
      <Seo title="Správa akce" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-8">
        <BackLink
          to={ROUTES.eventDetail}
          params={{ eventId }}
          fallbackLabel="Na akci"
        />
        <h1 className="text-3xl font-semibold tracking-tight">Správa akce</h1>
        {isNotFound ? (
          <Alert>
            <AlertTitle>Akce nenalezena</AlertTitle>
          </Alert>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Akci se nepodařilo načíst</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>Zkontrolujte připojení a zkuste to znovu.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={retry}
              >
                <RefreshCw className="size-4" />
                Zkusit znovu
              </Button>
            </AlertDescription>
          </Alert>
        ) : isPending || !event ? (
          <Skeleton className="h-40 w-full" />
        ) : !isOrganizer ? (
          <Alert>
            <AlertTitle>Akci spravuje jen její organizátor.</AlertTitle>
          </Alert>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold tracking-tight">{event.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {formatEventTime(event.startsAt, event.endsAt)}
                </p>
              </div>
              {event.status === "cancelled" ? (
                // instead of the capacity: „Chybí ještě 2“ would read as if it still happens
                <Alert>
                  <AlertTitle>Akce je zrušená</AlertTitle>
                  {event.cancelReason ? (
                    <AlertDescription className="whitespace-pre-line">
                      {event.cancelReason}
                    </AlertDescription>
                  ) : null}
                </Alert>
              ) : (
                <CapacityBar
                  approvedCount={event.approvedCount}
                  minParticipants={event.minParticipants}
                  maxParticipants={event.maxParticipants}
                />
              )}
            </section>
            {canEdit ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  variant="outline"
                >
                  <Link
                    to={ROUTES.editEvent}
                    params={{ eventId }}
                  >
                    <Pencil />
                    Upravit akci
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
            ) : null}
            {event.approvalMode === "approval" ? (
              <RequestsAndParticipants
                isDesktop={isDesktop}
                participants={participants.participants?.length}
                requests={participants.requests?.length}
                requestList={(isHeadingHidden) => (
                  <ManagedRequests
                    requests={participants.requests}
                    error={participants.error}
                    onRetry={participants.retry}
                    isHeadingHidden={isHeadingHidden}
                    isFull={event.isFull}
                    decidingId={decide.isPending ? decide.variables.userId : undefined}
                    onDecide={(request, decision) =>
                      decide.mutate(
                        { userId: request.id, decision },
                        {
                          onSuccess: () =>
                            toast.success(
                              decision === "approve"
                                ? `Žádost od ${request.name} je schválená.`
                                : `Žádost od ${request.name} je zamítnutá.`,
                            ),
                          // the API's 409 says why, in Czech (e.g. „Akce je plná.“)
                          onError: (decideError) => toast.error(decideError.message),
                        },
                      )
                    }
                  />
                )}
                participantList={(isHeadingHidden) => (
                  <ManagedParticipants
                    participants={participants.participants}
                    error={participants.error}
                    onRetry={participants.retry}
                    isHeadingHidden={isHeadingHidden}
                  />
                )}
              />
            ) : (
              <ManagedParticipants
                participants={participants.participants}
                error={participants.error}
                onRetry={participants.retry}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}

type RequestsAndParticipantsProps = {
  isDesktop: boolean
  /** The counts for the tab labels; undefined while loading. */
  participants: number | undefined
  requests: number | undefined
  requestList: (isHeadingHidden: boolean) => ReactNode
  participantList: (isHeadingHidden: boolean) => ReactNode
}

/**
 * An event with approval has two lists (D-03): tabs Žádosti / Účastníci on a
 * phone, both one under the other on desktop — as in the group's management.
 */
function RequestsAndParticipants({
  isDesktop,
  participants,
  requests,
  requestList,
  participantList,
}: RequestsAndParticipantsProps) {
  if (isDesktop) {
    return (
      <div className="flex flex-col gap-8">
        {requestList(false)}
        {participantList(false)}
      </div>
    )
  }
  const count = (n: number | undefined) => (n === undefined ? "" : ` (${n})`)
  return (
    <Tabs defaultValue="requests">
      <TabBar>
        <TabBarItem value="requests">Žádosti{count(requests)}</TabBarItem>
        <TabBarItem value="participants">Účastníci{count(participants)}</TabBarItem>
      </TabBar>
      <TabsContent
        value="requests"
        className="pt-4"
      >
        {requestList(true)}
      </TabsContent>
      <TabsContent
        value="participants"
        className="pt-4"
      >
        {participantList(true)}
      </TabsContent>
    </Tabs>
  )
}
