import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import { selectionLabel } from "@/lib/catalog/activitySelection"
import { toActivitySelection, type Catalog } from "@/lib/catalog/catalogSearch"
import {
  ALL_LOCALITIES_SLUG,
  DEFAULT_LOCALITY_SLUG,
  localityName,
} from "@/lib/catalog/localityOptions"
import { cn } from "@/lib/utils"

import { occupancyLabel } from "@/features/events/components/OccupancyFilter"
import { useEvents } from "@/features/events/hooks/useEvents"
import { formatDayRange } from "@/features/events/lib/dateRange"
import type { EventsSearch } from "@/features/events/lib/eventsSearch"
import { showEventsLabel } from "@/features/events/lib/formatEvent"

type EmptyEventsProps = {
  search: EventsSearch
  catalog: Catalog | undefined
  /** A visitor creates an event after signing up, so „Založit akci“ goes there first. */
  isVisitor: boolean
  /** Changes some of the URL's filters, like the filter bar. */
  onSearchChange: (patch: Partial<EventsSearch>) => void
}

/** The active filters as the chips name them: „Bruntál · Šipky a bowling · 1.–7. 11.“ */
export function activeFiltersLabel(search: EventsSearch, catalog: Catalog | undefined): string {
  const locality = catalog
    ? localityName(search.lokalita ?? DEFAULT_LOCALITY_SLUG, catalog.localities)
    : undefined
  const activity = catalog
    ? selectionLabel(toActivitySelection(search), catalog.categories)
    : undefined
  return [
    locality,
    activity,
    formatDayRange({ od: search.od, do: search.do }),
    occupancyLabel(search.obsazenost),
  ]
    .filter(Boolean)
    .join(" · ")
}

const hasOtherFilters = (search: EventsSearch) =>
  [search.kategorie, search.aktivita, search.od, search.do, search.obsazenost].some(
    (value) => value !== undefined,
  )

/**
 * /akce without results (NN/g, Carbon: say why and offer a way on): the
 * filters that found nothing, then at most one way to widen the search — the
 * same filters in all of Czechia when that finds something, else dropping the
 * other filters — and „Založit akci“ for what nobody organizes yet.
 */
export function EmptyEvents({ search, catalog, isVisitor, onSearchChange }: EmptyEventsProps) {
  const isEverywhere = search.lokalita === ALL_LOCALITIES_SLUG
  // the same preview as a filter panel's „Zobrazit N akcí“: one request, only for an empty list
  const everywhere = useEvents(
    { ...search, lokalita: ALL_LOCALITIES_SLUG },
    { isEnabled: !isEverywhere },
  )
  // no buttons until the count is known, so none swaps under a finger
  const isCounting = !isEverywhere && (everywhere.isPending || everywhere.isPlaceholderData)
  const everywhereCount = isEverywhere || isCounting ? undefined : everywhere.events?.length

  const widen =
    everywhereCount !== undefined && everywhereCount > 0 ? (
      <Button
        className="h-11"
        onClick={() => onSearchChange({ lokalita: ALL_LOCALITIES_SLUG })}
      >
        {`${showEventsLabel(everywhereCount)} v celém Česku`}
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
          })
        }
      >
        Zrušit ostatní filtry
      </Button>
    ) : null

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Žádná nadcházející akce neodpovídá filtrům:</p>
        <p className="text-sm font-semibold">{activeFiltersLabel(search, catalog)}</p>
      </div>
      {/* hidden, not left out, while counting: „Založit akci“ would show alone as the main
          button and then move aside; the space stays, so the mobile list doesn't jump */}
      <div
        aria-hidden={isCounting || undefined}
        className={cn("flex flex-wrap justify-center gap-3", isCounting && "invisible")}
      >
        {widen}
        {/* the closed mobile list shows the block down to its last button */}
        <Button
          asChild
          variant={widen ? "outline" : "default"}
          className="h-11"
          data-peek-end
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
