import { useState } from "react"
import { Check } from "lucide-react"

import { FilterChip } from "@/components/FilterChip/FilterChip"
import { FilterPanel } from "@/components/FilterPanel/FilterPanel"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { Locality } from "@/lib/catalog/catalogSchemas"
import { DEFAULT_LOCALITY_SLUG, localityOptions } from "@/lib/catalog/localityOptions"
import { foldText } from "@/lib/catalog/textSearch"
import { cn } from "@/lib/utils"

type LocalityFilterProps = {
  /** The applied locality's slug; undefined is the default, Praha. */
  value: string | undefined
  localities: Locality[]
  onChange: (slug: string | undefined) => void
  /** The apply button, e.g. „Zobrazit 12 akcí“ for the locality being picked. */
  applyLabel: string
  /** The slug being picked while the panel is open, undefined once it closes, so the page can preview its result. */
  onDraftChange?: (draft: string | undefined) => void
}

/** Chip „Praha“ › one locality; a city includes its districts. */
export function LocalityFilter({
  value,
  localities,
  onChange,
  applyLabel,
  onDraftChange,
}: LocalityFilterProps) {
  const current = value ?? DEFAULT_LOCALITY_SLUG
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(current)

  const currentName = localities.find((l) => l.slug === current)?.name
  const updateDraft = (slug: string) => {
    setDraft(slug)
    onDraftChange?.(slug)
  }
  // The default is stored as no parameter, so the link stays /akce.
  const apply = (slug: string) => {
    onChange(slug === DEFAULT_LOCALITY_SLUG ? undefined : slug)
    setIsOpen(false)
    onDraftChange?.(undefined)
  }

  return (
    <FilterPanel
      title="Lokalita"
      isOpen={isOpen}
      onOpenChange={(isOpening) => {
        if (isOpening) updateDraft(current)
        else onDraftChange?.(undefined)
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
      applyLabel={applyLabel}
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
        // Slug or name, without diacritics, so "plzen" finds Plzeň and
        // "usti nad orl" Ústí nad Orlicí.
        filter={(value, query, keywords) => {
          const needle = foldText(query)
          return [value, ...(keywords ?? [])].some((text) => foldText(text).includes(needle))
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
              onSelect={() => updateDraft(locality.slug)}
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
