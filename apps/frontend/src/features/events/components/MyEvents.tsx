import { useId, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Info, RefreshCw } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { MyEvent } from "@/features/events/api/eventSchemas"
import { EventCard } from "@/features/events/components/EventCard"
import { EventCardSkeleton } from "@/features/events/components/EventList"
import {
  useAttendingEvents,
  useGroupsEvents,
  useOrganizingEvents,
} from "@/features/events/hooks/useMyEvents"
import {
  attendingNumbers,
  attendingRowLead,
  attendingStatus,
  organizingNumbers,
  organizingRowTail,
  organizingStatus,
  pendingRequestsSummary,
} from "@/features/events/lib/myEvents"

// Figma C-01d, C-02d: three columns on a wide desktop like Moje skupiny, one on mobile
// grid-cols-1 = minmax(0, 1fr): a long title truncates instead of widening the page on mobile
const GRID = "grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3"

/**
 * Přihlášen (Figma C-01): sections, each soonest first — requests
 * waiting for approval on top, then the places I have, then the events of my
 * groups I don't go to yet (#304), then cancelled events (#183). A card opens
 * the detail, where the request can be withdrawn, the place given up, or —
 * from my groups — a place asked for.
 */
export function AttendingEvents({ viewerId }: { viewerId: string }) {
  const { sections, isPending, error, retry } = useAttendingEvents(viewerId)
  // a section on its own: while it loads or when it fails, the rest of the tab stays
  const fromGroups = useGroupsEvents(viewerId).events ?? []
  if (error) return <MyEventsError onRetry={retry} />
  if (isPending || !sections) return <MyEventsLoading />

  const { pending, approved, cancelled } = sections
  return (
    <div className="flex flex-col gap-6">
      {/* nothing to go to, even when cancelled events are left below (#183) */}
      {pending.length + approved.length === 0 ? (
        // Hlas aplikace: where people are missing is where to go next
        <MyEventsEmpty>
          <p>Zatím nejdeš na žádnou akci. Mrkni, komu v okolí chybí lidé.</p>
          <Button
            asChild
            variant="outline"
          >
            <Link
              to={ROUTES.events}
              search={{ obsazenost: "chybi" }}
            >
              Projít akce
            </Link>
          </Button>
        </MyEventsEmpty>
      ) : null}
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
      {fromGroups.length > 0 ? (
        <EventsSection
          title={`Z mých skupin (${fromGroups.length})`}
          // Figma C-01: they aren't mine yet, and the badge is the occupancy, not „Jdu“
          note="Na tyhle akce zatím nejdeš. Jsou ze skupin, kde jsi členem – přihlásíš se na detailu akce."
        >
          {fromGroups.map((event) => (
            <li key={event.id}>
              <EventCard
                event={event}
                variant="responsive"
                isGroupShown
                titleAs="h3"
              />
            </li>
          ))}
        </EventsSection>
      ) : null}
      {cancelled.length > 0 ? (
        <AttendingSection
          title={`Zrušené (${cancelled.length})`}
          events={cancelled}
        />
      ) : null}
    </div>
  )
}

function AttendingSection({ title, events }: { title: string; events: MyEvent[] }) {
  return (
    <EventsSection title={title}>
      {events.map((event) => (
        <li key={event.id}>
          <EventCard
            event={event}
            variant="responsive"
            isGroupShown
            status={attendingStatus(event)}
            numbers={attendingNumbers(event)}
            rowLead={attendingRowLead(event)}
            titleAs="h3"
          />
        </li>
      ))}
    </EventsSection>
  )
}

/** A section of cards under its heading, Figma Display/Feature („Potvrzené (5)“, C-01, C-01d). */
function EventsSection({
  title,
  note,
  children,
}: {
  title: string
  /** One line under the heading, e.g. why Z mých skupin is here. */
  note?: string
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 md:gap-4"
    >
      <h2
        id={headingId}
        className="type-feature"
      >
        {title}
      </h2>
      {note ? <p className="-mt-1 text-sm text-muted-foreground md:-mt-2">{note}</p> : null}
      <ul className={GRID}>{children}</ul>
    </section>
  )
}

/** The cards' places while a tab loads — also while the page picks its tab (#188). */
export function MyEventsLoading() {
  return (
    <div
      className={GRID}
      aria-busy
      aria-label="Načítám akce"
    >
      {[0, 1, 2].map((i) => (
        <EventCardSkeleton
          key={i}
          variant="responsive"
        />
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
 * Pořádám (Figma C-02): the events I created and those of the groups I run
 * (#70), soonest first — Nadcházející, then Zrušené (decided 4. 11.). The
 * strip on top sums up the requests to decide; a card opens the event's
 * management. „Založit akci“ is the page's, in both tabs.
 */
export function OrganizingEvents({ viewerId }: { viewerId: string }) {
  const { events, sections, isPending, error, retry } = useOrganizingEvents(viewerId)
  const summary = events ? pendingRequestsSummary(events) : null

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <MyEventsError onRetry={retry} />
      ) : isPending || !events || !sections ? (
        <MyEventsLoading />
      ) : events.length === 0 ? (
        // Hlas aplikace; „Založit akci“ is right there, in the band or floating
        <MyEventsEmpty>
          <p>Zatím nepořádáš žádnou akci. Stačí název, místo a čas – parta se sejde.</p>
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
          <OrganizingSection
            title="Nadcházející"
            events={sections.upcoming}
          />
          <OrganizingSection
            title="Zrušené"
            events={sections.cancelled}
          />
        </>
      )}
    </div>
  )
}

/** A section of Pořádám, left out while empty (C-02); a card opens the event's management. */
function OrganizingSection({ title, events }: { title: string; events: MyEvent[] }) {
  if (events.length === 0) return null
  return (
    <EventsSection title={`${title} (${events.length})`}>
      {events.map((event) => (
        <li key={event.id}>
          <EventCard
            event={event}
            variant="responsive"
            isGroupShown
            status={organizingStatus(event)}
            numbers={organizingNumbers(event)}
            rowTail={organizingRowTail(event)}
            linkTo="manage"
            titleAs="h3"
          />
        </li>
      ))}
    </EventsSection>
  )
}
