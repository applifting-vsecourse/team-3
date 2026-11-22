import { useId, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { MapPin, RefreshCw } from "lucide-react"

import { LocalityFilter } from "@/components/LocalityFilter/LocalityFilter"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { localityDefault, type LocalityState } from "@/hooks/useLocality"
import { localitiesQueryOptions } from "@/lib/catalog/catalogQueryOptions"
import { ALL_LOCALITIES_SLUG } from "@/lib/catalog/localityOptions"

import type { EventFilters } from "@/features/events/api/eventSchemas"
import { eventsQueryOptions } from "@/features/events/api/eventsQueryOptions"
import { EventCard } from "@/features/events/components/EventCard"
import { EventCardSkeleton } from "@/features/events/components/EventList"

const UPCOMING_COUNT = 3

// the whole public list, soonest first, like /akce without filters
const NO_FILTERS = { activityIds: [], categoryIds: [] }

type UpcomingEventsProps = {
  /**
   * The landing page's locality (useLocality, #55): only its events (a city
   * includes its districts), changeable with the locality chip. Without it,
   * the whole public list and no chip (sign-in, sign-up).
   */
  locality?: LocalityState
  /** Under the list, e.g. a link to all events. */
  footer?: ReactNode
  /**
   * `column`: row cards under each other, beside a form (sign-in, sign-up). `grid`: the page's
   * width, three cards side by side from md, a column of rows on a phone (the 404, #348).
   */
  layout?: "column" | "grid"
}

/**
 * „Nadcházející akce“ (#370: not „Nejbližší“, which reads as nearest to me): the three soonest public events. Next to the sign-in and
 * sign-up forms on desktop (Figma B-01d, B-03d), what the account is for,
 * and on the landing page (A-01, A-01d). A card opens the event's detail.
 */
export function UpcomingEvents({
  locality: shown,
  footer,
  layout = "column",
}: UpcomingEventsProps) {
  const headingId = useId()
  const localitySlug = shown?.slug
  const localitiesQuery = useQuery({
    ...localitiesQueryOptions(),
    enabled: shown !== undefined,
  })
  const locality = localitiesQuery.data?.find((l) => l.slug === localitySlug)
  // nothing for all of Czechia first while the default locality loads
  const filters =
    shown && localitySlug === undefined
      ? undefined
      : resolveFilters(localitySlug, localitiesQuery.data, locality)
  const eventsQuery = useQuery(eventsQueryOptions(filters))
  const events = filters ? eventsQuery.data?.slice(0, UPCOMING_COUNT) : undefined
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
          Nadcházející akce
        </h2>
        {shown && localitySlug && localitiesQuery.data ? (
          <LocalityFilter
            value={localitySlug}
            localities={localitiesQuery.data}
            onChange={shown.pick}
            applyLabel="Zobrazit akce"
            // a guess says so on the chip, „Praha · odhad“ (wireframe A-01: „odhad z IP“)
            localityDefault={localityDefault(shown, shown.forget, shown.pick)}
          />
        ) : /* From the resolved locality, so the label can't name a place the list isn't for. */
        locality ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin
              className="size-4"
              aria-hidden
            />
            {locality.name}
          </span>
        ) : null}
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
          {Array.from({ length: UPCOMING_COUNT }, (_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Teď nejsou žádné nadcházející akce.</p>
      ) : (
        <ul
          className={
            layout === "grid"
              ? "grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-6"
              : "flex flex-col gap-3"
          }
        >
          {events.map((event) => (
            <li key={event.id}>
              <EventCard
                event={event}
                titleAs="h3"
                variant={layout === "grid" ? "responsive" : "row"}
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
  localities: unknown[] | undefined,
  locality: { id: string } | undefined,
): EventFilters | undefined {
  if (localitySlug === undefined || localitySlug === ALL_LOCALITIES_SLUG) return NO_FILTERS
  if (!localities) return undefined
  return locality ? { ...NO_FILTERS, localityId: locality.id } : NO_FILTERS
}
