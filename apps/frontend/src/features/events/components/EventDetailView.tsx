import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { CalendarDays, MapPin, RefreshCw, UserCheck } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { CapacityBar } from "@/components/CapacityBar/CapacityBar"
import { DetailRow } from "@/components/DetailRow/DetailRow"
import { MapView } from "@/components/map/MapView"
import { PersonRow } from "@/components/PersonRow/PersonRow"
import { StatusBadge } from "@/components/StatusBadge/StatusBadge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"

import type { EventDetail } from "@/features/events/api/eventSchemas"
import { EventParticipants } from "@/features/events/components/EventParticipants"
import { ShareEventButton } from "@/features/events/components/ShareEventButton"
import { approvalModeLabel, formatEventTime, placeName } from "@/features/events/lib/formatEvent"

type EventDetailViewProps = {
  event?: EventDetail
  isLoading?: boolean
  /** Unknown, hidden, or members-only and the viewer is outside the group (API 404). */
  isNotFound?: boolean
  error?: Error
  onRetry?: () => void
  /** Login's `from`, so a visitor who signs in to see the names comes back here. */
  signInFrom: string
  /** The join / leave action (B-032): in the panel on desktop, in the bar above the navigation on a phone; the page builds it. */
  participation?: ReactNode
  /** The organizer's own actions, e.g. „Zrušit akci“ (#52); the page builds them. */
  organizerActions?: ReactNode
}

/**
 * The event detail (Figma A-05, desktop A-05d; B-026): what, when, where, who
 * organizes it and who is coming. The capacity comes right under the title,
 * then the facts and the map. Desktop puts those in a panel on the right with
 * the action; a phone keeps the action in a bar above the bottom navigation,
 * so it stays in sight (#42). A cancelled event keeps its detail (shared
 * links still work) with the „Zrušeno“ label and the reason (#52).
 */
export function EventDetailView({
  event,
  isLoading,
  isNotFound,
  error,
  onRetry,
  signInFrom,
  participation,
  organizerActions,
}: EventDetailViewProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  if (isNotFound) return <EventNotFound />

  if (error) {
    return (
      <>
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
      </>
    )
  }

  if (isLoading || !event) return <EventDetailSkeleton isDesktop={isDesktop} />

  const isCancelled = event.status === "cancelled"
  const heading = (
    <header className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <ActivityTile icon={event.activity.category.icon} />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{event.activity.name}</span>
          <span className="text-sm text-muted-foreground">{event.activity.category.name}</span>
        </div>
        {isCancelled ? <StatusBadge status={{ kind: "cancelled" }} /> : null}
      </div>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{event.title}</h1>
    </header>
  )
  const capacity = isCancelled ? (
    // instead of the capacity: „Chybí ještě 2“ would read as if it still happens
    <Alert>
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
    </dl>
  )
  const map = (
    <div className="h-40 overflow-hidden rounded-lg border border-border">
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
  const organizer = <EventOrganizer event={event} />
  const about = event.description ? (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight">O akci</h2>
      <p className="whitespace-pre-line">{event.description}</p>
    </section>
  ) : null
  const participants = (
    <EventParticipants
      approvedCount={event.approvedCount}
      participants={event.participants}
      signInFrom={signInFrom}
    />
  )

  // Figma lays the two out differently (as the group page, A-08 / A-08d), so
  // each gets its own order rather than one order bent by the grid.
  if (isDesktop) {
    return (
      <article className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-12">
        <div className="flex flex-col gap-6">
          {heading}
          {about}
          {participants}
          {organizer}
        </div>
        {/* Figma: Panel akce */}
        <section
          aria-label="Termín, místo a účast"
          className="flex w-100 flex-col gap-4 rounded-lg border border-border bg-card p-6 text-card-foreground"
        >
          {capacity}
          {facts}
          {map}
          {participation}
          <ShareEventButton label="Sdílet odkaz" />
          {organizerActions}
        </section>
      </article>
    )
  }

  return (
    <article className="flex flex-col gap-5">
      {heading}
      <section
        aria-label="Termín, místo a účast"
        className="flex flex-col gap-5"
      >
        {capacity}
        {facts}
        {map}
        {organizerActions}
      </section>
      {organizer}
      {about}
      {participants}
      {/* Figma: Lišta s akcí — above the bottom navigation, it stays while
          scrolling; empty (a cancelled event for a visitor) it isn't drawn */}
      <div className="sticky bottom-16 -mx-4 border-t border-border bg-background px-4 py-3 empty:hidden">
        {participation}
      </div>
    </article>
  )
}

/** Figma: „Pořádá“ and a Person row ending with a hairline, as „Spravuje“ on a group. */
function EventOrganizer({ event }: { event: EventDetail }) {
  return (
    <section
      aria-labelledby="event-organizer"
      className="flex flex-col gap-1"
    >
      <h2
        id="event-organizer"
        className="text-xs font-medium text-muted-foreground"
      >
        Pořádá
      </h2>
      <div className="border-b border-border py-3">
        {/* a group's event is organized by the group (B-055); links come with
            the group detail and public profiles */}
        {event.group ? (
          <PersonRow
            name={event.group.name}
            description="Skupina"
          />
        ) : (
          // creating an event takes a verified e-mail (VerifiedUserGuard)
          <PersonRow
            name={event.organizer.name}
            description="Organizátor · ověřený e-mail"
          />
        )}
      </div>
    </section>
  )
}

function EventNotFound() {
  return (
    <section className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Akce nenalezena</h1>
      <p className="text-muted-foreground">
        Odkaz je neplatný, nebo je akce jen pro členy skupiny.
      </p>
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
      {isDesktop ? <div className="w-100 rounded-lg border border-border p-6">{panel}</div> : panel}
    </div>
  )
}
