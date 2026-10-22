import { FilterToggleChip } from "@/components/FilterChip/FilterChip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { ActivityCategory, Locality } from "@/features/events/api/catalogSchemas"
import { ActivityFilter } from "@/features/events/components/ActivityFilter"
import { DateFilter } from "@/features/events/components/DateFilter"
import { LocalityFilter } from "@/features/events/components/LocalityFilter"
import { hasActiveFilters, type EventsSearch } from "@/features/events/lib/eventsSearch"

type EventFiltersProps = {
  search: EventsSearch
  catalog: { localities: Locality[]; categories: ActivityCategory[] } | undefined
  onChange: (patch: Partial<EventsSearch>) => void
  onClearAll: () => void
  className?: string
}

/** The filter chips of /akce (Figma: Lišta filtrů). They apply to the list and the map. */
export function EventFilters({
  search,
  catalog,
  onChange,
  onClearAll,
  className,
}: EventFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Filtry"
      className={cn("flex items-center gap-2", className)}
    >
      {catalog ? (
        <LocalityFilter
          search={search}
          localities={catalog.localities}
          onChange={(lokalita) => onChange({ lokalita })}
        />
      ) : null}
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
      ) : null}
      <FilterToggleChip
        pressed={search.chybi === 1}
        onPressedChange={(isOn) => onChange({ chybi: isOn ? 1 : undefined })}
      >
        Chybí lidé
      </FilterToggleChip>
      {hasActiveFilters(search) ? (
        <Button
          variant="ghost"
          className="h-11 shrink-0"
          onClick={onClearAll}
        >
          Zrušit vše
        </Button>
      ) : null}
    </div>
  )
}
