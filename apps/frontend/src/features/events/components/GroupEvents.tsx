import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { GroupEvent } from "@/features/events/api/eventSchemas"
import { groupEventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { EventCard } from "@/features/events/components/EventCard"
import { EventCardSkeleton } from "@/features/events/components/EventList"
import { groupEventTail, pastEventFacts } from "@/features/events/lib/formatEvent"

type GroupEventsProps = {
  groupId: string
  /** The signed-in viewer; members-only events come only to the group's members. */
  viewerId: string | null | undefined
  /** The viewer's membership status, so joining or leaving loads the events again. */
  membership?: string | null
}

/**
 * The group's events on its page (#70, Figma A-08e): „Nadcházející akce
 * skupiny“ soonest first and „Proběhlé akce skupiny“, the latest first, so a
 * member sees what the group has done. Members-only ones say so.
 */
export function GroupEvents({ groupId, viewerId, membership = null }: GroupEventsProps) {
  const query = useQuery(groupEventsQueryOptions(groupId, viewerId, membership))

  if (query.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Akce skupiny se nepodařilo načíst</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>Zkontroluj připojení a zkus to znovu.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            <RefreshCw className="size-4" />
            Zkusit znovu
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const events = query.data
  return (
    <>
      <EventsSection
        title="Nadcházející akce skupiny"
        events={events?.upcoming}
        empty="Skupina zatím nemá naplánovanou žádnou akci."
      />
      {/* nothing yet is no news: the section shows once there is history */}
      {events?.past.length ? (
        <EventsSection
          title="Proběhlé akce skupiny"
          events={events.past}
          isPast
        />
      ) : null}
    </>
  )
}

function EventsSection({
  title,
  events,
  empty,
  isPast = false,
}: {
  title: string
  /** Undefined while loading. */
  events: GroupEvent[] | undefined
  empty?: string
  isPast?: boolean
}) {
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
      {events === undefined ? (
        <EventCardSkeleton />
      ) : events.length === 0 ? (
        <p className="text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard
                event={event}
                titleAs="h3"
                // the group's own page: its name is the page's
                isGroupShown={false}
                status={isPast ? { kind: "past" } : undefined}
                rowTail={isPast ? pastEventFacts(event) : groupEventTail(event)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
