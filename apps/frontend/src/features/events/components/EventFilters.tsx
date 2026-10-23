import { FilterChip } from "@/components/FilterChip/FilterChip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { ActivityCategory, Locality } from "@/features/events/api/catalogSchemas"
import { ActivityFilter } from "@/features/events/components/ActivityFilter"
import { DateFilter } from "@/features/events/components/DateFilter"
import { LocalityFilter } from "@/features/events/components/LocalityFilter"
import { OccupancyFilter } from "@/features/events/components/OccupancyFilter"
import { hasActiveFilters, type EventsSearch } from "@/features/events/lib/eventsSearch"

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
        <LocalityFilter
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
        <ActivityFilter
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
