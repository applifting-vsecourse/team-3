import { useId, useState } from "react"

import { FilterChip } from "@/components/FilterChip/FilterChip"
import { FilterPanel } from "@/components/FilterPanel/FilterPanel"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { useEvents } from "@/features/events/hooks/useEvents"
import type { EventsSearch, Occupancy } from "@/features/events/lib/eventsSearch"
import { showEventsLabel } from "@/features/events/lib/formatEvent"

// "" = no limit; RadioGroup values are strings
type Choice = Occupancy | ""

const OPTIONS: { value: Choice; label: string; description: string }[] = [
  { value: "", label: "Všechny", description: "Včetně akcí, které jsou už plné." },
  { value: "volna", label: "Volná místa", description: "Jen akce, kam se ještě dá přihlásit." },
  {
    value: "chybi",
    label: "Chybí lidé",
    description: "Jen akce, které se bez dalších lidí neuskuteční.",
  },
]

/** Chip value; nothing for „Všechny“, which is the default. */
export const occupancyLabel = (occupancy: Occupancy | undefined): string | undefined =>
  occupancy ? OPTIONS.find((option) => option.value === occupancy)?.label : undefined

type OccupancyFilterProps = {
  search: EventsSearch
  onChange: (obsazenost: Occupancy | undefined) => void
}

/**
 * Chip „Obsazenost“ › Všechny / Volná místa / Chybí lidé — one choice, as
 * „Chybí lidé“ is a subset of „Volná místa“. Same pattern as the other filters.
 */
export function OccupancyFilter({ search, onChange }: OccupancyFilterProps) {
  const current: Choice = search.obsazenost ?? ""
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<Choice>(current)
  const preview = useEvents({ ...search, obsazenost: draft || undefined }, { isEnabled: isOpen })
  const idPrefix = useId()
  const label = occupancyLabel(search.obsazenost)

  const apply = (choice: Choice) => {
    onChange(choice || undefined)
    setIsOpen(false)
  }

  return (
    <FilterPanel
      title="Obsazenost"
      isOpen={isOpen}
      onOpenChange={(isOpening) => {
        if (isOpening) setDraft(current)
        setIsOpen(isOpening)
      }}
      trigger={
        <FilterChip
          isSelected={Boolean(label)}
          filterName="Obsazenost"
        >
          {label ?? "Obsazenost"}
        </FilterChip>
      }
      resetLabel="Všechny"
      onReset={() => apply("")}
      applyLabel={showEventsLabel(preview.isPlaceholderData ? undefined : preview.events?.length)}
      onApply={() => apply(draft)}
      popoverClassName="w-80"
    >
      <RadioGroup
        aria-label="Obsazenost"
        value={draft}
        onValueChange={(value) => setDraft(value as Choice)}
        className="gap-2"
      >
        {OPTIONS.map((option) => {
          const id = `${idPrefix}-${option.value || "vse"}`
          return (
            // Figma: Radio card
            <label
              key={option.value}
              htmlFor={id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 has-data-[state=checked]:border-foreground"
            >
              <RadioGroupItem
                id={id}
                value={option.value}
                // the whole card is the click target, but the name is just the title
                aria-labelledby={`${id}-label`}
                aria-describedby={`${id}-description`}
              />
              <span className="flex flex-col gap-0.5 text-sm">
                <span
                  id={`${id}-label`}
                  className="font-semibold"
                >
                  {option.label}
                </span>
                <span
                  id={`${id}-description`}
                  className="text-muted-foreground"
                >
                  {option.description}
                </span>
              </span>
            </label>
          )
        })}
      </RadioGroup>
    </FilterPanel>
  )
}
