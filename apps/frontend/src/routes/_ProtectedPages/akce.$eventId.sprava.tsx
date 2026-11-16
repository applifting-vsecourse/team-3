import type { ReactNode } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Ban, Pencil, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { CapacityBar } from "@/components/CapacityBar/CapacityBar"
import { BandActivity } from "@/components/PageBand/BandActivity"
import { PageBand } from "@/components/PageBand/PageBand"
import { SubBar } from "@/components/PageBand/SubBar"
import { Seo } from "@/components/Seo"
import { TabBar, TabBarItem } from "@/components/TabBar/TabBar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { CancelEventDialog } from "@/features/events/components/CancelEventDialog"
import { EventCard } from "@/features/events/components/EventCard"
import { EventFacts } from "@/features/events/components/EventFacts"
import { ManagedParticipants } from "@/features/events/components/ManagedParticipants"
import { ManagedRatings } from "@/features/events/components/ManagedRatings"
import { ManagedRequests } from "@/features/events/components/ManagedRequests"
import { SendEventMessageButton } from "@/features/events/components/SendEventMessageButton"
import { ShareEventButton } from "@/features/events/components/ShareEventButton"
import { useCancelEvent } from "@/features/events/hooks/useCancelEvent"
import { useDecideRequest } from "@/features/events/hooks/useDecideRequest"
import { useEventDetail } from "@/features/events/hooks/useEventDetail"
import { useEventParticipants } from "@/features/events/hooks/useEventParticipants"
import { editRefusal } from "@/features/events/lib/editRefusal"
import { canWriteToParticipants, messageRecipientCount } from "@/features/events/lib/eventMessages"
import { formatEventTime } from "@/features/events/lib/formatEvent"
import { showsRequests } from "@/features/events/lib/manageEvent"

export const Route = createFileRoute("/_ProtectedPages/akce/$eventId/sprava")({
  component: ManageEventPage,
})

/**
 * Figma D-03, D-03d (#43, #53): the organizer's page of their event — who is
 * coming, against the minimum and the maximum, the requests waiting at an
 * event with approval, and the way to edit or cancel it. Anyone else gets an
 * explanation; the API answers them 403. Removing people is #60.
 *
 * Desktop starts with the band, as the detail (A-05d): the activity, the title and one line
 * — when, where, „Pořádáš ty“. A phone has no band (D-03): the bar „Správa akce“ with
 * „Sdílet“, then the event's card with its photo, without the small bar the big one repeats.
 */
function ManageEventPage() {
  const { eventId } = Route.useParams()
  const session = useSession()
  const viewerId = session.isPending ? undefined : (session.user?.id ?? null)
  // live: new requests, and the capacity when someone joins or leaves meanwhile (#53)
  const { event, isPending, isNotFound, membersOnlyGroupId, error, retry } = useEventDetail(
    eventId,
    viewerId,
    {
      isLive: true,
    },
  )
  // the organizer or, for a group's event, any of its admins (B-055)
  const isOrganizer = event?.canManage === true
  const participants = useEventParticipants(eventId, viewerId, isOrganizer)
  const cancelEvent = useCancelEvent(eventId, session.user?.id ?? "")
  const decide = useDecideRequest(eventId, session.user?.id ?? "")
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const canEdit = event !== undefined && editRefusal(event) === null
  const isManaging =
    isOrganizer && event !== undefined && !membersOnlyGroupId && !isNotFound && !error
  const back = {
    to: ROUTES.eventDetail,
    params: { eventId },
    fallbackLabel: "Na akci",
  } as const
  // who is coming: alone in the right column, or next to the requests (#53)
  const participantList = (isHeadingHidden: boolean) => (
    <ManagedParticipants
      participants={participants.participants}
      error={participants.error}
      onRetry={participants.retry}
      isHeadingHidden={isHeadingHidden}
      isCancelled={event?.status === "cancelled"}
    />
  )

  return (
    <>
      <Seo title="Správa akce" />
      {isManaging ? (
        isDesktop ? (
          <PageBand
            variant="detail"
            back={back}
            title={event.title}
            eyebrow={<BandActivity activity={event.activity} />}
            // Figma D-03d: „St 28. 10. · 18:00–22:00 · Klubovna Holešovice, … · Pořádáš ty“
            description={[
              formatEventTime(event.startsAt, event.endsAt),
              event.address,
              // a group's admin manages it for the group (B-055)
              event.group ? `Akce skupiny ${event.group.name}` : "Pořádáš ty",
            ].join(" · ")}
          />
        ) : (
          <SubBar
            back={back}
            label="Správa akce"
            isHeading
            action={
              <ShareEventButton
                event={event}
                label="Sdílet"
                shouldUseShareSheet
              />
            }
          />
        )
      ) : null}
      <div className={cn(PAGE, "gap-6")}>
        {/* until the event is here and theirs, the page is just its name */}
        {isManaging ? null : (
          <>
            <BackLink {...back} />
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Správa akce</h1>
          </>
        )}
        {isNotFound ? (
          <Alert>
            <AlertTitle>Akce nenalezena</AlertTitle>
          </Alert>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Akci se nepodařilo načíst</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>Zkontroluj připojení a zkus to znovu.</span>
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
        ) : isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : !isOrganizer || !event || membersOnlyGroupId ? (
          <Alert>
            <AlertTitle>
              {membersOnlyGroupId || event?.group
                ? "Akci spravuje jen její organizátor nebo správce skupiny."
                : "Akci spravuje jen její organizátor."}
            </AlertTitle>
          </Alert>
        ) : (
          // D-03d: the event's summary on the left, who is coming on the right
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,27.5rem)_minmax(0,1fr)] md:gap-12">
            <section className="flex flex-col gap-5">
              {isDesktop ? null : (
                <EventCard
                  event={event}
                  hasBar={false}
                />
              )}
              {event.status === "cancelled" ? (
                // instead of the capacity: „Chybí ještě 2“ would read as if it still happens
                <Alert variant="destructive">
                  <Ban />
                  <AlertTitle>Akce je zrušená</AlertTitle>
                  {event.cancelReason ? (
                    <AlertDescription className="whitespace-pre-line">
                      {event.cancelReason}
                    </AlertDescription>
                  ) : null}
                </Alert>
              ) : (
                <CapacityBar
                  // the summary has no panel: the bar lies on the page (D-03, D-03d)
                  surface="background"
                  approvedCount={event.approvedCount}
                  minParticipants={event.minParticipants}
                  maxParticipants={event.maxParticipants}
                  missingToMin={event.missingToMin}
                  freeSpots={event.freeSpots}
                  isFull={event.isFull}
                />
              )}
              {isDesktop ? <EventFacts event={event} /> : null}
              {/* Figma D-03d: Upravit, Sdílet odkaz, Zrušit (ghost); a phone shares from the bar
                  and has Upravit and Zrušit side by side (D-03) */}
              <div
                className={cn(
                  isDesktop ? "flex flex-wrap items-center gap-3" : "grid grid-cols-2 gap-3",
                )}
              >
                {canEdit ? (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                  >
                    <Link
                      to={ROUTES.editEvent}
                      params={{ eventId }}
                    >
                      <Pencil />
                      Upravit akci
                    </Link>
                  </Button>
                ) : null}
                {isDesktop ? (
                  <ShareEventButton
                    event={event}
                    label="Sdílet odkaz"
                  />
                ) : null}
                {canEdit ? (
                  <CancelEventDialog
                    triggerVariant={isDesktop ? "ghost" : "outline"}
                    className="h-11"
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
                ) : null}
              </div>
              {/* Figma D-03d, D-04: „Napsat účastníkům“ under the actions, the whole width;
                  only the organizer of an event that isn't cancelled (#176) */}
              {viewerId && canWriteToParticipants(event, viewerId) ? (
                <SendEventMessageButton
                  eventId={eventId}
                  viewerId={viewerId}
                  recipientCount={messageRecipientCount(
                    participants.participants,
                    event.organizer.id,
                  )}
                  className="w-full"
                />
              ) : null}
              {/* D-05 and what the participants said (B-060, #66) */}
              <ManagedRatings
                event={event}
                viewerId={viewerId ?? null}
                now={new Date()}
              />
            </section>
            {/* the right column (D-03d): an event with approval adds the requests (#53),
                unless it's cancelled — then only who was coming, read-only (#183) */}
            {showsRequests(event) ? (
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
                    // showsRequests already hides the requests of a cancelled event; the
                    // status check stays as a safety net (the API refuses with EVENT_CANCELLED)
                    canDecide={event.status === "published" && event.startsAt > new Date()}
                    isFull={event.isFull}
                    isDeciding={decide.isPending}
                    onDecide={(request, decision) =>
                      decide.mutateAsync({ userId: request.id, decision }).then(
                        () =>
                          toast.success(
                            decision === "approve"
                              ? `Schváleno: ${request.name}`
                              : `Zamítnuto: ${request.name}`,
                          ),
                        // the API's 409 says why, in Czech (e.g. „Akce je plná.“)
                        (decideError: Error) => {
                          toast.error(decideError.message)
                          throw decideError
                        },
                      )
                    }
                  />
                )}
                participantList={participantList}
              />
            ) : (
              participantList(false)
            )}
          </div>
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
