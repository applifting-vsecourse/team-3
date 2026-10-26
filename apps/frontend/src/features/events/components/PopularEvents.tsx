import { useId, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { MapPin, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { popularEventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { EventCard } from "@/features/events/components/EventCard"
import { EventCardSkeleton } from "@/features/events/components/EventList"

/** Two rows of three on desktop. */
export const POPULAR_COUNT = 6

// three columns on desktop like Moje akce, one on mobile
// grid-cols-1 = minmax(0, 1fr): a long title truncates instead of widening the page on mobile
const GRID = "grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3"

type PopularEventsProps = {
  /** Under the list, e.g. a link to all events. */
  footer?: ReactNode
}

/**
 * „O tyhle akce je zájem“ (#156): upcoming public events from all of Czechia
 * with the most people in or waiting for approval, for visitors on the
 * landing page. The API ranks them; the list keeps its order. A card opens
 * the event's detail.
 */
export function PopularEvents({ footer }: PopularEventsProps) {
  const headingId = useId()
  const { data: events, error, refetch } = useQuery(popularEventsQueryOptions(POPULAR_COUNT))

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id={headingId}
          className="text-lg font-semibold tracking-tight"
        >
          O tyhle akce je zájem
        </h2>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin
            className="size-4"
            aria-hidden
          />
          Celé Česko
        </span>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Akce se nepodařilo načíst</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>Zkontroluj připojení a zkus to znovu.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
            >
              <RefreshCw className="size-4" />
              Zkusit znovu
            </Button>
          </AlertDescription>
        </Alert>
      ) : !events ? (
        <div
          className={GRID}
          aria-busy
          aria-label="Načítám akce"
        >
          {Array.from({ length: POPULAR_COUNT }, (_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Teď nejsou žádné nadcházející akce.</p>
      ) : (
        <ul className={GRID}>
          {events.map((event) => (
            <li key={event.id}>
              {/* the cards of a row are as tall as the tallest */}
              <EventCard
                event={event}
                titleAs="h3"
                className="h-full"
              />
            </li>
          ))}
        </ul>
      )}
      {footer}
    </section>
  )
}
