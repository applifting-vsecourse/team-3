import { useId } from "react"
import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { selectionLabel } from "@/lib/catalog/activitySelection"
import { toActivitySelection, type Catalog } from "@/lib/catalog/catalogSearch"
import { ALL_LOCALITIES_SLUG, localityName } from "@/lib/catalog/localityOptions"
import { cn } from "@/lib/utils"

import type { PublicEvent } from "@/features/events/api/eventSchemas"
import { EventCard } from "@/features/events/components/EventCard"
import { occupancyLabel } from "@/features/events/components/OccupancyFilter"
import { useEvents } from "@/features/events/hooks/useEvents"
import { formatDayRange } from "@/features/events/lib/dateRange"
import { PICK_LABELS, type EventsSearch } from "@/features/events/lib/eventsSearch"
import { showEventsLabel } from "@/features/events/lib/formatEvent"

type EmptyEventsProps = {
  search: EventsSearch
  catalog: Catalog | undefined
  /** A visitor creates an event after signing up, so „Založit akci“ goes there first. */
  isVisitor: boolean
  /** Changes some of the URL's filters, like the filter bar. */
  onSearchChange: (patch: Partial<EventsSearch>) => void
  /**
   * The events nearest to the locality's centre with the same filters (useNearestEvents, #299):
   * shown instead of „nothing“. `events` undefined while they load; not available without a
   * centre (Celé Česko, a map area).
   */
  nearest?: { isAvailable: boolean; events: PublicEvent[] | undefined }
  /**
   * Like EventList's: the closed mobile panel reaches the first N nearest cards, the rest of the
   * block below its edge is inert (at 0 EventList makes the whole block inert).
   */
  inertAfter?: number
  /** The card under the mouse, so the map can highlight its pin. */
  highlightedId?: string
  onHighlight?: (eventId: string | undefined) => void
}

/** The active filters as the chips name them: „Bruntál · Šipky a bowling · 1.–7. 11.“ */
export function activeFiltersLabel(search: EventsSearch, catalog: Catalog | undefined): string {
  // the searched area replaces the locality, as on the locality chip (#56)
  const locality = search.oblast
    ? "Výřez mapy"
    : catalog
      ? localityName(search.lokalita ?? ALL_LOCALITIES_SLUG, catalog.localities)
      : undefined
  const activity = catalog
    ? selectionLabel(toActivitySelection(search), catalog.categories)
    : undefined
  return [
    locality,
    // a quick pick narrows the list by its own rules too (interests, well rated, review #321)
    search.vyber && PICK_LABELS[search.vyber],
    activity,
    formatDayRange({ od: search.od, do: search.do }),
    occupancyLabel(search.obsazenost),
  ]
    .filter(Boolean)
    .join(" · ")
}

/** Only the locality makes the list empty: „V lokalitě X teď…“, not „neodpovídá filtrům: X“ (#299). */
const isLocalityOnly = (search: EventsSearch) =>
  !hasOtherFilters(search) &&
  search.q === undefined &&
  search.okoli === undefined &&
  search.oblast === undefined &&
  search.lokalita !== undefined &&
  search.lokalita !== ALL_LOCALITIES_SLUG

/**
 * Filters beside the locality, the quick pick included: „Podle tvých zájmů“, „Od dobře
 * hodnocených“ and „Tady chybíš“ add rules of their own (interests, well rated, not joined), so a
 * pick with nothing in Brno is no „nothing in Brno“ (review #321).
 */
const hasOtherFilters = (search: EventsSearch) =>
  [search.kategorie, search.aktivita, search.od, search.do, search.obsazenost, search.vyber].some(
    (value) => value !== undefined,
  )

/**
 * /akce without results (NN/g, Carbon: say why and offer a way on): the
 * filters that found nothing, then at most one way to widen the search — out
 * of the searched map area into the locality (#56), else the same filters in
 * all of Czechia, when that finds something; else dropping the other filters —
 * and „Založit akci“ for what nobody organizes yet. With a locality, the nearest events with
 * the same filters and their distance come first (#299): an empty locality never looks like an
 * empty app.
 */
export function EmptyEvents({
  search,
  catalog,
  isVisitor,
  onSearchChange,
  nearest,
  inertAfter,
  highlightedId,
  onHighlight,
}: EmptyEventsProps) {
  const isArea = search.oblast !== undefined
  const isEverywhere = search.lokalita === ALL_LOCALITIES_SLUG
  // in a map area: the same filters in the locality (the area replaced it); else in all of Czechia
  const wider: Partial<EventsSearch> = isArea
    ? { oblast: undefined }
    : { lokalita: ALL_LOCALITIES_SLUG }
  const canWiden = isArea || !isEverywhere
  // the same preview as a filter panel's „Zobrazit N akcí“: one request, only for an empty list
  const widened = useEvents({ ...search, ...wider }, { isEnabled: canWiden })
  // no buttons until the count and the nearest events are known, so none swaps under a finger
  const isNearestLoading = Boolean(nearest?.isAvailable) && nearest?.events === undefined
  const isCounting =
    (canWiden && (widened.isPending || widened.isPlaceholderData)) || isNearestLoading
  const headingId = useId()
  const nearestEvents = nearest?.isAvailable ? (nearest.events ?? []) : []
  const hasNearest = nearestEvents.length > 0
  const localityLabel =
    catalog && search.lokalita ? localityName(search.lokalita, catalog.localities) : undefined
  const widenedCount = !canWiden || isCounting ? undefined : widened.events?.length
  const where =
    isArea && !isEverywhere && catalog && search.lokalita
      ? `v lokalitě ${localityName(search.lokalita, catalog.localities)}`
      : "v celém Česku"

  const widen =
    widenedCount !== undefined && widenedCount > 0 ? (
      <Button
        className="h-11"
        onClick={() => onSearchChange(wider)}
      >
        {`${showEventsLabel(widenedCount)} ${where}`}
      </Button>
    ) : !isCounting && hasOtherFilters(search) ? (
      <Button
        className="h-11"
        onClick={() =>
          onSearchChange({
            kategorie: undefined,
            aktivita: undefined,
            od: undefined,
            do: undefined,
            obsazenost: undefined,
            vyber: undefined,
          })
        }
      >
        Zrušit ostatní filtry
      </Button>
    ) : null

  return (
    <div className="flex flex-col gap-4 py-8">
      <div className="flex flex-col gap-1 text-center">
        {isLocalityOnly(search) && localityLabel ? (
          <p className="text-sm text-muted-foreground">
            V lokalitě <span className="font-semibold text-foreground">{localityLabel}</span> teď
            žádná nadcházející akce není.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Žádná nadcházející akce neodpovídá filtrům:
            </p>
            <p className="text-sm font-semibold">{activeFiltersLabel(search, catalog)}</p>
          </>
        )}
      </div>
      {hasNearest ? (
        <section
          aria-labelledby={headingId}
          className="flex flex-col gap-3"
        >
          <h2
            id={headingId}
            className="type-card-heading"
          >
            Nejbližší akce
          </h2>
          <ul className="flex flex-col gap-3">
            {nearestEvents.map((event, index) => (
              <li
                key={event.id}
                // the closed mobile list shows the sentence and the nearest card
                data-peek-end={index === 0 ? "" : undefined}
                inert={inertAfter !== undefined && index >= inertAfter}
              >
                <EventCard
                  event={event}
                  // under the section's „Nejbližší akce“ (h2), not beside it (review #321)
                  titleAs="h3"
                  // ordered by distance: the cards say how far (DESIGN.md › Okolí)
                  distanceKm={event.distanceKm}
                  isHighlighted={event.id === highlightedId}
                  onMouseEnter={() => onHighlight?.(event.id)}
                  onMouseLeave={() => onHighlight?.(undefined)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {/* hidden, not left out, while counting: „Založit akci“ would show alone as the main
          button and then move aside; the space stays, so the mobile list doesn't jump */}
      <div
        aria-hidden={isCounting || undefined}
        // below the closed mobile list's edge when the nearest cards come first
        inert={(hasNearest && inertAfter !== undefined) || undefined}
        className={cn("flex flex-wrap justify-center gap-3", isCounting && "invisible")}
      >
        {widen}
        {/* the closed mobile list shows the block down to its last button, unless the nearest
            events come first */}
        <Button
          asChild
          variant={widen ? "outline" : "default"}
          className="h-11"
          data-peek-end={hasNearest ? undefined : ""}
        >
          {isVisitor ? (
            // the router encodes `from` once (a hand-built ?from= ended up as %252F)
            <Link
              to={ROUTES.signup}
              search={{ from: ROUTES.newEvent }}
            >
              Založit akci
            </Link>
          ) : (
            <Link to={ROUTES.newEvent}>Založit akci</Link>
          )}
        </Button>
      </div>
    </div>
  )
}
