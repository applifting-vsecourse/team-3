import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Ban, CalendarDays, Lock, MapPin, RefreshCw, UserCheck } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { ActivityPhoto } from "@/components/ActivityPhoto/ActivityPhoto"
import { BackLink, type BackLinkProps } from "@/components/BackLink/BackLink"
import { CapacityBar } from "@/components/CapacityBar/CapacityBar"
import { DateTile } from "@/components/DateTile/DateTile"
import { DetailRow } from "@/components/DetailRow/DetailRow"
import { HappeningStamp } from "@/components/HappeningStamp/HappeningStamp"
import { MapView } from "@/components/map/MapView"
import { BandActivity } from "@/components/PageBand/BandActivity"
import { PageBand } from "@/components/PageBand/PageBand"
import { SubBar } from "@/components/PageBand/SubBar"
import { PersonRow } from "@/components/PersonRow/PersonRow"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { occupancyInBand } from "@/lib/occupancy"
import { PAGE } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

import type { EventDetail } from "@/features/events/api/eventSchemas"
import { EventParticipants } from "@/features/events/components/EventParticipants"
import { ShareEventButton } from "@/features/events/components/ShareEventButton"
import {
  approvalModeLabel,
  eventDateParts,
  formatEventStart,
  formatEventTime,
  placeName,
} from "@/features/events/lib/formatEvent"

export type EventBack = Omit<BackLinkProps, "isIconOnlyOnMobile">

const EVENTS_BACK: EventBack = {
  to: ROUTES.events,
  fallbackLabel: "Všechny akce",
  label: "Akce",
}

type EventDetailViewProps = {
  event?: EventDetail
  /** Where the arrow leads; the list of events unless the page knows better. */
  back?: EventBack
  isLoading?: boolean
  /** Unknown, hidden or deleted (API 404). */
  isNotFound?: boolean
  error?: Error
  onRetry?: () => void
  /** The join / leave action (B-032): in the panel on desktop, in the bar above the navigation on a phone; the page builds it. */
  participation?: ReactNode
  /** The organizer's own actions, e.g. „Zrušit akci“ (#52); the page builds them. */
  organizerActions?: ReactNode
  /** For tests; the event is over once its end (or, without one, its start) is past it. */
  now?: Date
  /** For a group's event, the group's card and admins under „Pořádá“ (A-05g); the page builds it. */
  organizerGroup?: ReactNode
  /** The signed-in viewer, shown first as „Ty“ in „Kdo jde“ (Figma A-05c). */
  viewerId?: string | null
}

/**
 * The event detail (Figma A-05, desktop A-05d; B-026): what, when, where, who
 * organizes it and who is coming. The dark green band holds the activity and
 * the title, and on desktop one line with when, where and how full it is; the
 * activity's photo with the date tile sits above the band on a phone and at
 * the top of the content on desktop. Then the capacity, the facts and the map:
 * desktop puts those in a panel on the right with the action; a phone keeps
 * the action in a bar above the bottom navigation, so it stays in sight (#42).
 * A cancelled event keeps its detail (shared links still work) with the
 * reason (#52).
 */
export function EventDetailView({
  event,
  back = EVENTS_BACK,
  isLoading,
  isNotFound,
  error,
  onRetry,
  participation,
  organizerActions,
  now = new Date(),
  organizerGroup,
  viewerId,
}: EventDetailViewProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  if (isNotFound) {
    return (
      <StatePage back={back}>
        <EventNotFound />
      </StatePage>
    )
  }

  if (error) {
    return (
      <StatePage back={back}>
        <h1 className="sr-only">Detail akce</h1>
        <Alert variant="destructive">
          <AlertTitle>Akci se nepodařilo načíst</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            {/* ky's message is a URL and a status code; it stays in the console */}
            <span>Zkontroluj připojení a zkus to znovu.</span>
            {onRetry ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
              >
                <RefreshCw className="size-4" />
                Zkusit znovu
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      </StatePage>
    )
  }

  if (isLoading || !event) {
    return (
      <StatePage back={back}>
        <EventDetailSkeleton isDesktop={isDesktop} />
      </StatePage>
    )
  }

  const isCancelled = event.status === "cancelled"
  // the minimum is reached, so the event happens (DESIGN.md › Koná se stamp); a past one
  // says „Proběhlo“ instead (Figma A-05h)
  const isOver = (event.endsAt ?? event.startsAt) <= now
  const isHappening = !isCancelled && !isOver && event.missingToMin === 0
  // Figma A-05d, A-05c: „Ne 25. 10. · 18:00 · Tělocvična ZŠ Na Pankráci · Praha 4 · do minima chybí 1“
  const line = [
    formatEventStart(event.startsAt),
    placeName(event.address),
    event.locality.name,
    isCancelled ? "akce je zrušená" : isOver ? null : occupancyInBand(event),
  ]
    .filter(Boolean)
    .join(" · ")
  const band = (
    <PageBand
      variant="detail"
      back={back}
      title={event.title}
      eyebrow={<BandActivity activity={event.activity} />}
      description={
        <>
          {/* before the line on desktop (A-05c); under the title on a phone (A-05) */}
          {isHappening && isDesktop ? <HappeningStamp className="mr-3 align-middle" /> : null}
          {line}
        </>
      }
    >
      {isHappening && !isDesktop ? <HappeningStamp className="self-start" /> : null}
    </PageBand>
  )
  const capacity = isCancelled ? (
    // instead of the capacity: „Chybí ještě 2“ would read as if it still happens
    // (Figma A-05 · Stavy › Zrušená akce, Alert Destructive)
    <Alert variant="destructive">
      <Ban />
      <AlertTitle>Akce je zrušená</AlertTitle>
      {event.cancelReason ? (
        <AlertDescription className="whitespace-pre-line">{event.cancelReason}</AlertDescription>
      ) : null}
    </Alert>
  ) : (
    <CapacityBar
      approvedCount={event.approvedCount}
      minParticipants={event.minParticipants}
      maxParticipants={event.maxParticipants}
      missingToMin={event.missingToMin}
      freeSpots={event.freeSpots}
      isFull={event.isFull}
    />
  )
  const facts = (
    <dl className="flex flex-col gap-3 md:gap-4">
      <DetailRow
        icon={CalendarDays}
        label="Kdy"
      >
        <time dateTime={event.startsAt.toISOString()}>
          {formatEventTime(event.startsAt, event.endsAt)}
        </time>
      </DetailRow>
      <DetailRow
        icon={MapPin}
        label="Kde"
      >
        {event.address}
      </DetailRow>
      <DetailRow
        icon={UserCheck}
        label="Přihlašování"
      >
        {approvalModeLabel(event.approvalMode)}
      </DetailRow>
      {event.group ? (
        // Figma A-05g: a group's event says who sees it (B-055)
        <DetailRow
          icon={Lock}
          label="Kdo akci vidí"
        >
          {event.visibility === "members" ? "Jen pro členy skupiny" : "Veřejná"}
        </DetailRow>
      ) : null}
    </dl>
  )
  const map = (
    <div className="h-40 overflow-hidden rounded-lg border border-input">
      <MapView
        isStatic
        label="Místo akce na mapě"
        center={{ lat: event.lat, lng: event.lng }}
        pins={[
          {
            id: event.id,
            lat: event.lat,
            lng: event.lng,
            variant: "default",
            label: placeName(event.address),
          },
        ]}
      />
    </div>
  )
  const organizer = (
    <EventOrganizer
      event={event}
      group={organizerGroup}
    />
  )
  const about = event.description ? (
    <section className="flex flex-col gap-2">
      <h2 className="type-card-heading">O akci</h2>
      <p className="text-body whitespace-pre-line">{event.description}</p>
    </section>
  ) : null
  // without the names (#174) the count and when the names show (Figma A-05, A-05d)
  const date = eventDateParts(event.startsAt)
  const photo = (
    <ActivityPhoto slug={event.activity.slug}>
      <DateTile
        weekday={date.weekday}
        day={date.day}
        time={date.time}
        size="l"
        className="absolute bottom-4 left-4"
      />
    </ActivityPhoto>
  )
  const participants = isCancelled ? null : (
    <EventParticipants
      approvedCount={event.approvedCount}
      maxParticipants={event.maxParticipants}
      participants={event.participants}
      isWaitingForApproval={event.myParticipation === "pending"}
      viewerId={viewerId}
    />
  )

  // Figma lays the two out differently (as the group page, A-08 / A-08d), so
  // each gets its own order rather than one order bent by the grid.
  if (isDesktop) {
    return (
      <>
        {band}
        <div className={PAGE}>
          <article className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-12">
            <div className="flex flex-col gap-6">
              {photo}
              {about}
              {participants}
              {organizer}
            </div>
            {/* Figma: Panel akce */}
            <section
              aria-label="Termín, místo a účast"
              className="flex w-100 flex-col gap-4 rounded-2xl border border-card-border bg-card p-6 text-card-foreground"
            >
              {capacity}
              {facts}
              {map}
              {participation}
              <ShareEventButton label="Sdílet odkaz" />
              {organizerActions}
            </section>
          </article>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Figma Header/Sub: back, what the page is and „Sdílet“; the photo comes before the band */}
      <SubBar
        back={back}
        label="Detail akce"
        action={
          <ShareEventButton
            label="Sdílet"
            shouldUseShareSheet
          />
        }
      />
      {photo}
      {band}
      <article className="flex flex-col gap-5 px-4 pt-5">
        <section
          aria-label="Termín, místo a účast"
          className="flex flex-col gap-5"
        >
          {capacity}
          {facts}
          {map}
          {organizerActions}
        </section>
        {about}
        {participants}
        {organizer}
        {/* Figma: Lišta s akcí — above the bottom navigation, it stays while
            scrolling; empty (a cancelled event for a visitor) it isn't drawn */}
        <div className="sticky bottom-16 -mx-4 border-t border-border bg-background px-4 py-3 empty:hidden">
          {participation}
        </div>
      </article>
    </>
  )
}

/** Loading, an error or „not found“: the page's column with the way back, before there is a band. */
function StatePage({ back, children }: { back: EventBack; children: ReactNode }) {
  return (
    <div className={cn(PAGE, "gap-4")}>
      <BackLink {...back} />
      {children}
    </div>
  )
}

/**
 * Figma: „Pořádá“ and a Person row ending with a hairline, as „Spravuje“ on
 * a group. A group's event (A-05g, B-055) has the group's card, linking to
 * its page, and under it who runs the group.
 */
function EventOrganizer({ event, group }: { event: EventDetail; group?: ReactNode }) {
  if (event.group) {
    return (
      <section
        aria-labelledby="event-organizer"
        className="flex flex-col gap-2"
      >
        <h2
          id="event-organizer"
          className="text-caption font-medium text-muted-foreground"
        >
          Pořádá
        </h2>
        {group ?? (
          // until the group loads (or if it doesn't), its name still leads to it
          <Link
            to="/skupiny/$groupId"
            params={{ groupId: event.group.id }}
            className="rounded-2xl border border-card-border bg-card p-3 font-semibold text-card-foreground hover:border-foreground"
          >
            {event.group.name}
          </Link>
        )}
      </section>
    )
  }
  return (
    <section
      aria-labelledby="event-organizer"
      className="flex flex-col gap-1"
    >
      <h2
        id="event-organizer"
        className="text-caption font-medium text-muted-foreground"
      >
        Pořádá
      </h2>
      <div className="border-b border-border py-3">
        {/* „Pořádá“ above already names the role, and every organizer has a
            verified e-mail (VerifiedUserGuard), so the second line says only
            what the viewer can't tell otherwise: who decides on a request.
            A verb, not „Organizátor“, so it fits any name (DESIGN.md › Copy).
            Figma's „Organizátor · ★ 4,5 (6 hodnocení)“ comes with the ratings (#66). */}
        <PersonRow
          name={event.organizer.name}
          description={event.approvalMode === "approval" ? "Schvaluje žádosti o účast" : undefined}
        />
      </div>
    </section>
  )
}

function EventNotFound() {
  return (
    <section className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Akce nenalezena</h1>
      <p className="text-muted-foreground">Odkaz je neplatný, nebo akce neexistuje.</p>
      <Button
        asChild
        className="mt-3"
      >
        <Link to={ROUTES.events}>Prohlédnout akce</Link>
      </Button>
    </section>
  )
}

function EventDetailSkeleton({ isDesktop }: { isDesktop: boolean }) {
  const heading = (
    <div className="flex flex-col gap-5">
      <Skeleton className="size-16 rounded-lg" />
      <Skeleton className="h-9 w-3/4" />
    </div>
  )
  const panel = (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  )
  return (
    <div
      aria-busy
      aria-label="Načítám akci"
      className={
        isDesktop ? "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-12" : "flex flex-col gap-5"
      }
    >
      <h1 className="sr-only">Detail akce</h1>
      {heading}
      {isDesktop ? (
        <div className="w-100 rounded-2xl border border-card-border p-6">{panel}</div>
      ) : (
        panel
      )}
    </div>
  )
}
