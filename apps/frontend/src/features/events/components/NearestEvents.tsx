import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { eventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { EventCard } from "@/features/events/components/EventCard"
import { EventCardSkeleton } from "@/features/events/components/EventList"

const NEAREST_COUNT = 3

// the whole public list, soonest first, like /akce without filters
const NO_FILTERS = { activityIds: [], categoryIds: [] }

/**
 * „Nejbližší akce“ next to the sign-in and sign-up forms on desktop (Figma
 * B-01d, B-03d): what the account is for, instead of an empty half of the
 * screen. A card opens the event's detail.
 */
export function NearestEvents() {
  const headingId = useId()
  const query = useQuery(eventsQueryOptions(NO_FILTERS))
  const events = query.data?.slice(0, NEAREST_COUNT)

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <h2
        id={headingId}
        className="text-lg font-semibold tracking-tight"
      >
        Nejbližší akce
      </h2>
      {query.error ? (
        <Alert variant="destructive">
          <AlertTitle>Akce se nepodařilo načíst</AlertTitle>
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
      ) : !events ? (
        <div
          className="flex flex-col gap-3"
          aria-busy
          aria-label="Načítám akce"
        >
          {Array.from({ length: NEAREST_COUNT }, (_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Teď nejsou žádné nadcházející akce.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard
                event={event}
                titleAs="h3"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
