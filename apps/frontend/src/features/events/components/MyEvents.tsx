import { useId, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { RefreshCw } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { MyEvent } from "@/features/events/api/eventSchemas"
import { EventCard } from "@/features/events/components/EventCard"
import { EventCardSkeleton } from "@/features/events/components/EventList"
import { useMyEvents } from "@/features/events/hooks/useMyEvents"
import { attendingSections, attendingStatus } from "@/features/events/lib/myEvents"

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
      <ul className="flex flex-col gap-3">
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
      className="flex flex-col gap-3"
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
        <span>Zkontrolujte připojení a zkuste to znovu.</span>
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
