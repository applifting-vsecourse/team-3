import { useState } from "react"
import { Check } from "lucide-react"

import { FilterChip } from "@/components/FilterChip/FilterChip"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

import type { Locality } from "@/features/events/api/catalogSchemas"
import { FilterPanel } from "@/features/events/components/FilterPanel"
import { useEvents } from "@/features/events/hooks/useEvents"
import { DEFAULT_LOCALITY_SLUG, type EventsSearch } from "@/features/events/lib/eventsSearch"
import { showEventsLabel } from "@/features/events/lib/formatEvent"
import { localityOptions } from "@/features/events/lib/localityOptions"

type LocalityFilterProps = {
  search: EventsSearch
  localities: Locality[]
  onChange: (lokalita: string | undefined) => void
}

/** Chip „Praha“ › one locality; a city includes its districts. */
export function LocalityFilter({ search, localities, onChange }: LocalityFilterProps) {
  const current = search.lokalita ?? DEFAULT_LOCALITY_SLUG
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(current)
  const preview = useEvents({ ...search, lokalita: draft }, { isEnabled: isOpen })

  const currentName = localities.find((l) => l.slug === current)?.name
  // The default is stored as no parameter, so the link stays /akce.
  const apply = (slug: string) => {
    onChange(slug === DEFAULT_LOCALITY_SLUG ? undefined : slug)
    setIsOpen(false)
  }

  return (
    <FilterPanel
      title="Lokalita"
      isOpen={isOpen}
      onOpenChange={(isOpening) => {
        if (isOpening) setDraft(current)
        setIsOpen(isOpening)
      }}
      trigger={
        <FilterChip
          isSelected={Boolean(currentName)}
          filterName="Lokalita"
        >
          {currentName ?? "Lokalita"}
        </FilterChip>
      }
      resetLabel="Celá Praha"
      onReset={() => apply(DEFAULT_LOCALITY_SLUG)}
      applyLabel={showEventsLabel(preview.isPlaceholderData ? undefined : preview.events?.length)}
      onApply={() => apply(draft)}
      popoverClassName="w-80"
    >
      {/* Visible label per DESIGN.md › Forms; cmdk names the input itself via
          its own hidden label (`label` below), so this copy is aria-hidden. */}
      <p
        aria-hidden
        className="mb-2 text-sm font-medium"
      >
        Hledat lokalitu
      </p>
      <Command
        label="Hledat lokalitu"
        // Figma: Input/Search – a bordered field rather than cmdk's underline
        className="gap-2 **:data-[slot=command-input-wrapper]:h-10 **:data-[slot=command-input-wrapper]:rounded-md **:data-[slot=command-input-wrapper]:border **:data-[slot=command-input-wrapper]:border-input"
        // Slug or name, so "plzen" finds Plzeň.
        filter={(value, query, keywords) => {
          const needle = query.toLocaleLowerCase("cs")
          return [value, ...(keywords ?? [])].some((text) =>
            text.toLocaleLowerCase("cs").includes(needle),
          )
            ? 1
            : 0
        }}
      >
        <CommandInput placeholder="Např. Praha 8 nebo Brno" />
        <CommandList className="max-h-72">
          <CommandEmpty>Takovou lokalitu neznáme.</CommandEmpty>
          {localityOptions(localities).map((locality) => (
            <CommandItem
              key={locality.id}
              // the slug is unique, names aren't (two villages can share one)
              value={locality.slug}
              keywords={[locality.name]}
              onSelect={() => setDraft(locality.slug)}
              // Figma: Picker row/Locality – districts indented under their city
              className={cn(
                "rounded-lg px-4 py-3 text-base",
                locality.isDistrict && "pl-8",
                locality.slug === draft && "font-semibold",
              )}
            >
              <span className="flex-1">{locality.name}</span>
              {locality.slug === draft ? (
                <>
                  <Check
                    aria-hidden
                    className="text-foreground"
                  />
                  <span className="sr-only">vybráno</span>
                </>
              ) : null}
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </FilterPanel>
  )
}
