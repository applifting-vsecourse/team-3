import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { CalendarDays, MapPin, RefreshCw, UserCheck } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { ActivityTag } from "@/components/ActivityTag/ActivityTag"
import { CapacityBar } from "@/components/CapacityBar/CapacityBar"
import { DetailRow } from "@/components/DetailRow/DetailRow"
import { MapView } from "@/components/map/MapView"
import { PersonRow } from "@/components/PersonRow/PersonRow"
import { StatusBadge } from "@/components/StatusBadge/StatusBadge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import type { EventDetail } from "@/features/events/api/eventSchemas"
import { EventParticipants } from "@/features/events/components/EventParticipants"
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
  /** The join / leave action under the capacity (B-032); the page builds it. */
  participation?: ReactNode
  /** The organizer's own actions, e.g. „Zrušit akci“ (#52); the page builds them. */
  organizerActions?: ReactNode
}

/**
 * The event detail (Figma A-05, desktop A-05d; B-026): what, when, where, who
 * organizes it and who is coming. Desktop puts the map in a column on the
 * right, mobile right below the facts. The join action sits under the
 * capacity (#42). A cancelled event keeps its detail (shared links still
 * work) with the „Zrušeno“ label and the reason (#52).
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
  if (isNotFound) return <EventNotFound />

  if (error) {
    return (
      <>
        <h1 className="sr-only">Detail akce</h1>
        <Alert variant="destructive">
          <AlertTitle>Akci se nepodařilo načíst</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            {/* ky's message is a URL and a status code; it stays in the console */}
            <span>Zkontrolujte připojení a zkuste to znovu.</span>
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

  if (isLoading || !event) return <EventDetailSkeleton />

  return (
    <article className="grid gap-8 md:grid-cols-5 md:gap-x-12">
      <div className="flex flex-col gap-6 md:col-span-3">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ActivityTag name={event.activity.name} />
            {event.status === "cancelled" ? <StatusBadge status={{ kind: "cancelled" }} /> : null}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{event.title}</h1>
        </header>
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
        {participation}
        {organizerActions}
        <dl className="flex flex-col gap-4">
          <DetailRow
            icon={CalendarDays}
            label="Termín"
          >
            <time dateTime={event.startsAt.toISOString()}>
              {formatEventTime(event.startsAt, event.endsAt)}
            </time>
          </DetailRow>
          <DetailRow
            icon={MapPin}
            label="Místo"
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
      </div>

      <div className="h-56 overflow-hidden rounded-lg border border-border md:col-span-2 md:col-start-4 md:row-span-2 md:row-start-1 md:h-72">
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

      <div className="flex flex-col gap-8 md:col-span-3">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Pořádá</h2>
          {/* a group's event is organized by the group (B-055); links come with
              the group detail and public profiles */}
          {event.group ? (
            <PersonRow
              name={event.group.name}
              description="Skupina"
            />
          ) : (
            <PersonRow name={event.organizer.name} />
          )}
        </section>

        {event.description ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">O akci</h2>
            <p className="whitespace-pre-line">{event.description}</p>
          </section>
        ) : null}

        <EventParticipants
          approvedCount={event.approvedCount}
          participants={event.participants}
          signInFrom={signInFrom}
        />
      </div>
    </article>
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

function EventDetailSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Načítám akci"
      className="grid gap-8 md:grid-cols-5 md:gap-x-12"
    >
      <h1 className="sr-only">Detail akce</h1>
      <div className="flex flex-col gap-6 md:col-span-3">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-10 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-56 rounded-lg md:col-span-2 md:h-72" />
    </div>
  )
}
