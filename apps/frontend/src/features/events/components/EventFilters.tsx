import { useState } from "react"

import { ActivityFilter } from "@/components/ActivityFilter/ActivityFilter"
import { FilterChip } from "@/components/FilterChip/FilterChip"
import { LocalityFilter } from "@/components/LocalityFilter/LocalityFilter"
import { Button } from "@/components/ui/button"
import type { ActivitySelection } from "@/lib/catalog/activitySelection"
import type { ActivityCategory, Locality } from "@/lib/catalog/catalogSchemas"
import { toActivitySearch, toActivitySelection } from "@/lib/catalog/catalogSearch"
import { cn } from "@/lib/utils"

import { DateFilter } from "@/features/events/components/DateFilter"
import { OccupancyFilter } from "@/features/events/components/OccupancyFilter"
import { useEvents } from "@/features/events/hooks/useEvents"
import { hasActiveFilters, type EventsSearch } from "@/features/events/lib/eventsSearch"
import { showEventsLabel } from "@/features/events/lib/formatEvent"

type EventFiltersProps = {
  search: EventsSearch
  catalog: { localities: Locality[]; categories: ActivityCategory[] } | undefined
  onChange: (patch: Partial<EventsSearch>) => void
  onClearAll: () => void
  /** Mobile: the chips float over the map (Figma A-02) and need their own shadow. */
  isFloating?: boolean
  className?: string
}

/** The filter chips of /akce (Figma: Lišta filtrů). They apply to the list and the map. */
export function EventFilters({
  search,
  catalog,
  onChange,
  onClearAll,
  isFloating,
  className,
}: EventFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Filtry"
      className={cn("flex items-center gap-2", isFloating && "*:shadow-md", className)}
    >
      {catalog ? (
        <EventLocalityFilter
          search={search}
          localities={catalog.localities}
          onChange={(lokalita) => onChange({ lokalita })}
        />
      ) : (
        // keeps the bar from shifting while the catalog loads
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
      <OccupancyFilter
        search={search}
        onChange={(obsazenost) => onChange({ obsazenost })}
      />
      {hasActiveFilters(search) ? (
        <Button
          variant="ghost"
          // desktop only: on mobile it sits by the event count (EventList), always in view
          className={cn(
            "hidden h-9 shrink-0 md:inline-flex",
            isFloating && "rounded-full bg-background",
          )}
          onClick={onClearAll}
        >
          Zrušit vše
        </Button>
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
}: {
  search: EventsSearch
  localities: Locality[]
  onChange: (lokalita: string | undefined) => void
}) {
  const [draft, setDraft] = useState<string>()
  const applyLabel = usePreviewLabel(
    draft === undefined ? undefined : { ...search, lokalita: draft },
  )
  return (
    <LocalityFilter
      value={search.lokalita}
      localities={localities}
      onChange={onChange}
      onDraftChange={setDraft}
      applyLabel={applyLabel}
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
