import { useId, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Info, RefreshCw } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { MyEvent } from "@/features/events/api/eventSchemas"
import { EventCard } from "@/features/events/components/EventCard"
import { EventCardSkeleton } from "@/features/events/components/EventList"
import { useMyEvents } from "@/features/events/hooks/useMyEvents"
import {
  attendingSections,
  attendingStatus,
  organizingFacts,
  organizingStatus,
  pendingRequestsSummary,
} from "@/features/events/lib/myEvents"

// Figma C-01d, C-02d: three columns on a wide desktop like Moje skupiny, one on mobile
const GRID = "grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3"

/**
 * Přihlášen (Figma C-01): requests waiting for approval on top, then the
 * places I have, each soonest first. A card opens the detail, where the
 * request can be withdrawn or the place given up.
 */
export function AttendingEvents({ viewerId }: { viewerId: string }) {
  const { events, isPending, error, retry } = useMyEvents("attending", viewerId)
  if (error) return <MyEventsError onRetry={retry} />
  if (isPending || !events) return <MyEventsLoading />
  if (events.length === 0) {
    return (
      <MyEventsEmpty>
        <p>Zatím nejdeš na žádnou akci.</p>
        <Button
          asChild
          variant="outline"
        >
          <Link to={ROUTES.events}>Projít akce</Link>
        </Button>
      </MyEventsEmpty>
    )
  }

  const { pending, approved } = attendingSections(events)
  return (
    <div className="flex flex-col gap-6">
      {pending.length > 0 ? (
        <AttendingSection
          title={`Čeká na schválení (${pending.length})`}
          events={pending}
        />
      ) : null}
      {approved.length > 0 ? (
        <AttendingSection
          title={`Potvrzené (${approved.length})`}
          events={approved}
        />
      ) : null}
    </div>
  )
}

function AttendingSection({ title, events }: { title: string; events: MyEvent[] }) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <h2
        id={headingId}
        className="text-lg font-semibold tracking-tight"
      >
        {title}
      </h2>
      <ul className={GRID}>
        {events.map((event) => (
          <li key={event.id}>
            <EventCard
              event={event}
              status={attendingStatus(event)}
              titleAs="h3"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function MyEventsLoading() {
  return (
    <div
      className={GRID}
      aria-busy
      aria-label="Načítám akce"
    >
      {[0, 1, 2].map((i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  )
}

function MyEventsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Akce se nepodařilo načíst</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>Zkontroluj připojení a zkus to znovu.</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
        >
          <RefreshCw className="size-4" />
          Zkusit znovu
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function MyEventsEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

/**
 * Pořádám (Figma C-02): the events I created, soonest first, cancelled ones
 * with their label. The strip on top sums up the requests to decide; a card
 * opens the event's management. „Založit akci“ is the page's, in both tabs.
 */
export function OrganizingEvents({ viewerId }: { viewerId: string }) {
  const { events, isPending, error, retry } = useMyEvents("organizing", viewerId)
  const summary = events ? pendingRequestsSummary(events) : null

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <MyEventsError onRetry={retry} />
      ) : isPending || !events ? (
        <MyEventsLoading />
      ) : events.length === 0 ? (
        <MyEventsEmpty>
          <p>Zatím nepořádáš žádnou akci.</p>
        </MyEventsEmpty>
      ) : (
        <>
          {summary ? (
            <Alert
              variant="info"
              role="status"
            >
              <Info />
              <AlertTitle>{summary.title}</AlertTitle>
              <AlertDescription>{summary.events}</AlertDescription>
            </Alert>
          ) : null}
          <ul className={GRID}>
            {events.map((event) => (
              <li key={event.id}>
                <EventCard
                  event={event}
                  status={organizingStatus(event)}
                  facts={organizingFacts(event)}
                  linkTo="manage"
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
