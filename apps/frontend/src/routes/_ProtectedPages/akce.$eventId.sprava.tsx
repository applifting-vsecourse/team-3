import { createFileRoute, Link } from "@tanstack/react-router"
import { Ban, Lock, Pencil, RefreshCw, UserCheck } from "lucide-react"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink/BackLink"
import { CapacityBar } from "@/components/CapacityBar/CapacityBar"
import { DetailRow } from "@/components/DetailRow/DetailRow"
import { ManagementSteps } from "@/components/ManagementSteps/ManagementSteps"
import { ManagementTabs } from "@/components/ManagementTabs/ManagementTabs"
import { BandActivity } from "@/components/PageBand/BandActivity"
import { PageBand } from "@/components/PageBand/PageBand"
import { SubBar } from "@/components/PageBand/SubBar"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { CancelEventDialog } from "@/features/events/components/CancelEventDialog"
import { EventCard } from "@/features/events/components/EventCard"
import { ManagedParticipants } from "@/features/events/components/ManagedParticipants"
import { ManagedRatings } from "@/features/events/components/ManagedRatings"
import { ManagedRequests } from "@/features/events/components/ManagedRequests"
import { SendEventMessageButton } from "@/features/events/components/SendEventMessageButton"
import { eventDetailPath, ShareEventButton } from "@/features/events/components/ShareEventButton"
import { useCancelEvent } from "@/features/events/hooks/useCancelEvent"
import { useDecideRequest } from "@/features/events/hooks/useDecideRequest"
import { useEventDetail } from "@/features/events/hooks/useEventDetail"
import { useEventParticipants } from "@/features/events/hooks/useEventParticipants"
import { editRefusal } from "@/features/events/lib/editRefusal"
import { canWriteToParticipants, messageRecipientCount } from "@/features/events/lib/eventMessages"
import { approvalModeLabel, formatEventTime } from "@/features/events/lib/formatEvent"
import { eventEmptySteps, eventNextStep, showsRequests } from "@/features/events/lib/manageEvent"

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
 * „Sdílet“. Then, on both (#371): the event's card with its photo, without the small bar the
 * big one repeats, and one next step by the event's state — share the link while people are
 * missing, write to the participants once it happens; an empty list says what comes next.
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
  const now = new Date()
  // nothing is shared or written once it's cancelled or has started (#183)
  const canShare = event?.status === "published" && event.startsAt > now
  const canWrite = event !== undefined && canWriteToParticipants(event, viewerId)
  const recipientCount = event
    ? messageRecipientCount(participants.participants, event.organizer.id)
    : undefined
  const nextStep = event ? eventNextStep(event, recipientCount, canWrite, now) : null
  // until the participants are here, whether sharing becomes the primary button is unknown:
  // the other share buttons wait, so nothing appears and moves away (review #382)
  const isNextStepKnown =
    event !== undefined &&
    (event.missingToMin > 0 || recipientCount !== undefined || participants.error !== undefined)
  const canShareAside = canShare && isNextStepKnown && nextStep?.action !== "share"
  // nobody coming and nothing waiting: the link and what comes next, under the lists — on a
  // phone too, whichever tab is open (D-03d – nikdo nejde, #371)
  const isNobodyYet =
    event !== undefined &&
    canShare &&
    // the organizer may have a place at their own event (Q12): nobody else counts here
    recipientCount === 0 &&
    (!showsRequests(event) || participants.requests?.length === 0)
  // who is coming: alone in the right column, or next to the requests (#53)
  const participantList = (isHeadingHiddenOnPhone: boolean) => (
    <ManagedParticipants
      participants={participants.participants}
      error={participants.error}
      onRetry={participants.retry}
      isHeadingHiddenOnPhone={isHeadingHiddenOnPhone}
      isCancelled={event?.status === "cancelled"}
    />
  )

  return (
    <>
      <Seo title="Správa akce" />
      {/* PO 26. 11.: while loading a phone has the bar the page will have, so the header
          doesn't show first and then jump away */}
      {isPending && !isDesktop && !isManaging ? (
        <SubBar
          back={back}
          label="Správa akce"
          isHeading
        />
      ) : null}
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
            // not when sharing is the next step's own button (D-03 – nikdo nejde, #371)
            action={
              canShareAside ? (
                <ShareEventButton
                  event={event}
                  label="Sdílet"
                  shouldUseShareSheet
                />
              ) : undefined
            }
          />
        )
      ) : null}
      <div className={cn(PAGE, "gap-6")}>
        {/* until the event is here and theirs, the page is just its name */}
        {isManaging || (isPending && !isDesktop) ? null : (
          <>
            <BackLink {...back} />
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Správa akce</h1>
          </>
        )}
        {isNotFound ? (
          <Alert>
            <AlertTitle>Akce není dostupná</AlertTitle>
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
          // D-03d (#371): the event as others see it and the next step on the left, who is
          // coming on the right — one tree for a phone and desktop, only CSS rearranges it, so
          // an open dialog survives crossing 768 px (#316)
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,27.5rem)_minmax(0,1fr)] lg:gap-12">
            <section className="flex flex-col gap-5">
              {/* its photo too (#77): a phone's row card, desktop's grid card; the big bar
                  below makes the card's own one redundant */}
              <EventCard
                event={event}
                variant="responsive"
                hasBar={false}
              />
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
              {/* when and where are in the band and on the card (#371) */}
              <dl className="flex flex-col gap-3 md:gap-4">
                <DetailRow
                  icon={UserCheck}
                  label="Přihlašování"
                >
                  {approvalModeLabel(event.approvalMode)}
                </DetailRow>
                {event.group ? (
                  <DetailRow
                    icon={Lock}
                    label="Kdo akci vidí"
                  >
                    {event.visibility === "members" ? "Jen pro členy skupiny" : "Veřejná"}
                  </DetailRow>
                ) : null}
              </dl>
              {/* the one primary button, by the event's state (#371) */}
              {nextStep ? (
                <div className="flex flex-col gap-3">
                  <p>{nextStep.text}</p>
                  {nextStep.action === "share" ? (
                    <ShareEventButton
                      event={event}
                      label="Sdílet odkaz"
                      variant="default"
                      // a phone's share sheet; desktop copies the link
                      shouldUseShareSheet={!isDesktop}
                      className="h-11 w-full"
                    />
                  ) : viewerId ? (
                    <SendEventMessageButton
                      eventId={eventId}
                      viewerId={viewerId}
                      recipientCount={recipientCount}
                      variant="default"
                      className="w-full"
                    />
                  ) : null}
                </div>
              ) : null}
              {/* Figma D-03d: Upravit, Sdílet odkaz, Zrušit (ghost) beside each other; a phone
                  shares from the bar and has Upravit and Zrušit side by side (D-03) */}
              <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center">
                {canEdit ? (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11"
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
                {/* someone is coming, but sharing comes first: writing stays at hand (#371) */}
                {viewerId && canWrite && nextStep?.action !== "write" && recipientCount ? (
                  <SendEventMessageButton
                    eventId={eventId}
                    viewerId={viewerId}
                    recipientCount={recipientCount}
                    className="col-span-2 md:col-span-1"
                  />
                ) : null}
                {canShareAside ? (
                  <ShareEventButton
                    event={event}
                    label="Sdílet odkaz"
                    className="hidden h-11 md:inline-flex"
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
              {/* D-05 and what the participants said (B-060, #66) */}
              <ManagedRatings
                event={event}
                viewerId={viewerId ?? null}
                now={now}
              />
            </section>
            {/* the right column (D-03d): an event with approval adds the requests (#53),
                unless it's cancelled — then only who was coming, read-only (#183) */}
            <div className="flex flex-col gap-8">
              {showsRequests(event) ? (
                <ManagementTabs
                  tabs={[
                    {
                      value: "requests",
                      label: `Žádosti${tabCount(participants.requests?.length)}`,
                      content: (
                        <ManagedRequests
                          requests={participants.requests}
                          error={participants.error}
                          onRetry={participants.retry}
                          isHeadingHiddenOnPhone
                          // showsRequests already hides the requests of a cancelled event; the
                          // status check stays as a safety net (the API refuses with EVENT_CANCELLED)
                          canDecide={event.status === "published" && event.startsAt > now}
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
                      ),
                    },
                    {
                      value: "participants",
                      label: `Účastníci${tabCount(participants.participants?.length)}`,
                      content: participantList(true),
                    },
                  ]}
                />
              ) : (
                participantList(false)
              )}
              {isNobodyYet ? (
                <ManagementSteps
                  steps={eventEmptySteps(event)}
                  link={{
                    path: eventDetailPath(event.id),
                    title: event.title,
                    label: "Odkaz na akci",
                  }}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/** A tab's count: „ (2)“, nothing while it loads. */
const tabCount = (n: number | undefined) => (n === undefined ? "" : ` (${n})`)
