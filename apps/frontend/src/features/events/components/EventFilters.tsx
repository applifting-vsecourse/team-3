import { useState, type ReactNode } from "react"

import { ActivityFilter } from "@/components/ActivityFilter/ActivityFilter"
import { FilterChip } from "@/components/FilterChip/FilterChip"
import {
  LocalityFilter,
  type LocalityDefault,
  type LocalityDraft,
} from "@/components/LocalityFilter/LocalityFilter"
import { Button } from "@/components/ui/button"
import type { ActivitySelection } from "@/lib/catalog/activitySelection"
import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"
import { toActivitySearch, toActivitySelection } from "@/lib/catalog/catalogSearch"
import { cn } from "@/lib/utils"

import { DateFilter } from "@/features/events/components/DateFilter"
import { OccupancyFilter } from "@/features/events/components/OccupancyFilter"
import { useEvents } from "@/features/events/hooks/useEvents"
import { RADII, type EventsSearch, type Radius } from "@/features/events/lib/eventsSearch"
import { showEventsLabel } from "@/features/events/lib/formatEvent"

type EventFiltersProps = {
  /** The URL's filters with the shown locality in `lokalita`, the visitor's default included. */
  search: EventsSearch
  catalog: { localities: Locality[]; categories: ActivityCategory[] } | undefined
  onChange: (patch: Partial<EventsSearch>) => void
  /** A pick in the locality chip, which the page remembers (#55), with its okolí (#57); without it, `onChange`. */
  onLocalityChange?: (slug: string, radius?: Radius) => void
  /** „Zrušit vše“; only when something was picked (a default locality isn't). */
  onClearAll?: () => void
  /** The visitor's default locality on the chip (#55). */
  localityDefault?: LocalityDefault
  /** Mobile: the chips float over the map (Figma A-02) and need their own shadow. */
  isFloating?: boolean
  /** Desktop: the search at the right end of the bar (Figma A-02d, #57). */
  searchControl?: ReactNode
  className?: string
}

/** The filter chips of /akce (Figma: Lišta filtrů). They apply to the list and the map. */
export function EventFilters({
  search,
  catalog,
  onChange,
  onClearAll,
  onLocalityChange,
  localityDefault,
  isFloating,
  searchControl,
  className,
}: EventFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Filtry"
      className={cn("flex items-center gap-2", isFloating && "*:shadow-md", className)}
    >
      {/* until the default locality is known, no name: never „Celé Česko“ for a moment */}
      {catalog && search.lokalita !== undefined ? (
        <EventLocalityFilter
          search={search}
          localities={catalog.localities}
          onChange={onLocalityChange ?? ((lokalita, okoli) => onChange({ lokalita, okoli }))}
          localityDefault={localityDefault}
        />
      ) : (
        // keeps the bar from shifting while the catalog or the default locality loads
        <FilterChip disabled>Lokalita</FilterChip>
      )}
      <DateFilter
        search={search}
        onChange={onChange}
      />
      {catalog ? (
        <EventActivityFilter
          search={search}
          categories={catalog.categories}
          onChange={onChange}
        />
      ) : (
        <FilterChip disabled>Typ aktivity</FilterChip>
      )}
      {/* a past event has no places to fill: no occupancy with Proběhlé (Figma A-02h, #61) */}
      {search.termin ? null : (
        <OccupancyFilter
          search={search}
          onChange={(obsazenost) => onChange({ obsazenost })}
        />
      )}
      {onClearAll ? (
        <Button
          variant="ghost"
          // desktop only: on mobile it sits by the event count (EventList), always in view
          className={cn("hidden h-9 shrink-0 md:inline-flex", isFloating && "bg-background")}
          onClick={onClearAll}
        >
          Zrušit vše
        </Button>
      ) : null}
      {searchControl ? (
        <div className="ml-auto hidden w-72 shrink-0 md:block">{searchControl}</div>
      ) : null}
    </div>
  )
}

/** „Zobrazit N akcí“ for what the panel shows; nothing is fetched while it is closed. */
const usePreviewLabel = (search: EventsSearch | undefined) => {
  const preview = useEvents(search ?? {}, { isEnabled: search !== undefined })
  return showEventsLabel(preview.isPlaceholderData ? undefined : preview.events?.length)
}

function EventLocalityFilter({
  search,
  localities,
  onChange,
  localityDefault,
}: {
  search: EventsSearch
  localities: Locality[]
  onChange: (lokalita: string, okoli?: Radius) => void
  localityDefault?: LocalityDefault
}) {
  const [draft, setDraft] = useState<LocalityDraft>()
  // the preview counts what the picked locality and okolí would show, without the map area
  const applyLabel = usePreviewLabel(
    draft === undefined
      ? undefined
      : { ...search, lokalita: draft.slug, okoli: toRadius(draft.radius), oblast: undefined },
  )
  return (
    <LocalityFilter
      value={search.lokalita}
      localities={localities}
      onChange={(slug, km) => onChange(slug, toRadius(km))}
      onDraftChange={setDraft}
      radius={{ value: search.okoli, options: RADII }}
      applyLabel={applyLabel}
      localityDefault={localityDefault}
      areaLabel={search.oblast ? "Výřez mapy" : undefined}
    />
  )
}

function EventActivityFilter({
  search,
  categories,
  onChange,
}: {
  search: EventsSearch
  categories: ActivityCategory[]
  onChange: (patch: Pick<EventsSearch, "kategorie" | "aktivita">) => void
}) {
  const [draft, setDraft] = useState<ActivitySelection>()
  const applyLabel = usePreviewLabel(
    draft === undefined ? undefined : { ...search, ...toActivitySearch(draft) },
  )
  return (
    <ActivityFilter
      selection={toActivitySelection(search)}
      categories={categories}
      onChange={(selection) => onChange(toActivitySearch(selection))}
      onDraftChange={setDraft}
      applyLabel={applyLabel}
    />
  )
}

/** A radius from the locality panel as ?okoli=; one it doesn't know is „Jen obec“. */
const toRadius = (km: string | undefined): Radius | undefined =>
  RADII.find((radius) => radius === km)
