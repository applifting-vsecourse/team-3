import { useId, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { localitiesQueryOptions } from "@/lib/catalog/catalogQueryOptions"

import type { EventFilters } from "@/features/events/api/eventSchemas"
import { eventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { EventCard } from "@/features/events/components/EventCard"
import { EventCardSkeleton } from "@/features/events/components/EventList"

const NEAREST_COUNT = 3

// the whole public list, soonest first, like /akce without filters
const NO_FILTERS = { activityIds: [], categoryIds: [] }

type NearestEventsProps = {
  /**
   * Only events in this locality (a city includes its districts), e.g.
   * "praha". Without it, the whole public list.
   */
  localitySlug?: string
  /** Next to the heading, e.g. the locality the list is for. */
  headingAside?: ReactNode
  /** Under the list, e.g. a link to all events. */
  footer?: ReactNode
}

/**
 * „Nejbližší akce“: the three soonest public events. Next to the sign-in and
 * sign-up forms on desktop (Figma B-01d, B-03d), what the account is for,
 * and on the landing page (A-01, A-01d). A card opens the event's detail.
 */
export function NearestEvents({ localitySlug, headingAside, footer }: NearestEventsProps) {
  const headingId = useId()
  const localitiesQuery = useQuery({
    ...localitiesQueryOptions(),
    enabled: localitySlug !== undefined,
  })
  const filters = resolveFilters(localitySlug, localitiesQuery.data)
  const eventsQuery = useQuery(eventsQueryOptions(filters))
  const events = filters ? eventsQuery.data?.slice(0, NEAREST_COUNT) : undefined
  const error = localitiesQuery.error ?? eventsQuery.error

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
          Nejbližší akce
        </h2>
        {headingAside}
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Akce se nepodařilo načíst</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>Zkontroluj připojení a zkus to znovu.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (localitiesQuery.error) void localitiesQuery.refetch()
                else void eventsQuery.refetch()
              }}
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
      {footer}
    </section>
  )
}

/**
 * Undefined while the locality's id is still loading, so the list isn't
 * fetched for the whole country first. An unknown slug falls back to all
 * events rather than an empty list.
 */
function resolveFilters(
  localitySlug: string | undefined,
  localities: { id: string; slug: string }[] | undefined,
): EventFilters | undefined {
  if (localitySlug === undefined) return NO_FILTERS
  if (!localities) return undefined
  const locality = localities.find((l) => l.slug === localitySlug)
  return locality ? { ...NO_FILTERS, localityId: locality.id } : NO_FILTERS
}
