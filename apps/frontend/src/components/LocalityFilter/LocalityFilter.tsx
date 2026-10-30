import { useMemo, useRef, useState, type RefObject } from "react"
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
import { useScrollToPicked } from "@/hooks/useScrollToPicked"
import type { Locality } from "@/lib/catalog/catalogSchemas"
import {
  ALL_LOCALITIES_NAME,
  ALL_LOCALITIES_SLUG,
  DEFAULT_LOCALITY_SLUG,
  localityName,
  localityOptions,
  localityReset,
} from "@/lib/catalog/localityOptions"
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

/** Chip „Praha“ › one locality or Celé Česko; a city includes its districts. */
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
  const searchRef = useRef<HTMLInputElement>(null)

  const currentName = localityName(current, localities)
  // follows what is picked: a district goes back to its city, anything else to Celé Česko
  const reset = localityReset(draft, localities)
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
      resetLabel={reset.label}
      isResetDisabled={reset.slug === undefined}
      onReset={() => {
        if (reset.slug !== undefined) apply(reset.slug)
      }}
      applyLabel={applyLabel}
      onApply={() => apply(draft)}
      popoverClassName="w-80"
      initialFocusRef={searchRef}
    >
      <LocalitySearch
        localities={localities}
        draft={draft}
        onPick={updateDraft}
        inputRef={searchRef}
      />
    </FilterPanel>
  )
}

/** The panel's inside; mounted on opening, so the list opens on the picked row. */
function LocalitySearch({
  localities,
  draft,
  onPick,
  inputRef,
}: {
  localities: Locality[]
  draft: string
  onPick: (slug: string) => void
  inputRef: RefObject<HTMLInputElement | null>
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const options = useMemo(() => localityOptions(localities), [localities])
  // cmdk filters by itself; the query is kept only to scroll the list back up
  const [query, setQuery] = useState("")
  useScrollToPicked(listRef, query)

  const row = (slug: string, name: string, { isDistrict = false, keywords = [name] } = {}) => {
    const isPicked = slug === draft
    return (
      <CommandItem
        key={slug}
        // the slug is unique, names aren't (two villages can share one)
        value={slug}
        keywords={keywords}
        data-picked={isPicked || undefined}
        onSelect={() => onPick(slug)}
        // Figma: Picker row/Locality – districts indented under their city
        className={cn(
          "rounded-lg px-4 py-3 text-base",
          isDistrict && "pl-8",
          isPicked && "font-semibold",
        )}
      >
        <span className="flex-1">{name}</span>
        {isPicked ? (
          <>
            <Check
              aria-hidden
              className="text-foreground"
            />
            <span className="sr-only">vybráno</span>
          </>
        ) : null}
      </CommandItem>
    )
  }

  return (
    <>
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
        // the picked row is the active one, so Enter keeps it instead of picking Praha (t072)
        defaultValue={draft}
        // Figma: Input/Search – a bordered field rather than cmdk's underline, 44 px to tap,
        // with the focus ring of the other fields (it has the focus on opening), not clipped
        className="gap-2 overflow-visible **:data-[slot=command-input-wrapper]:h-11 **:data-[slot=command-input-wrapper]:rounded-md **:data-[slot=command-input-wrapper]:border **:data-[slot=command-input-wrapper]:border-input **:data-[slot=command-input-wrapper]:focus-within:border-ring **:data-[slot=command-input-wrapper]:focus-within:ring-[3px] **:data-[slot=command-input-wrapper]:focus-within:ring-ring/50"
        // Slug or name, without diacritics, so "plzen" finds Plzeň and
        // "usti nad orl" Ústí nad Orlicí. Celé Česko after the towns: „Česk“
        // is on its way to Česká Lípa, and Enter picks the first row.
        filter={(value, search, keywords) => {
          const needle = foldText(search)
          const texts = [value, ...(keywords ?? [])]
          if (!texts.some((text) => foldText(text).includes(needle))) return 0
          return value === ALL_LOCALITIES_SLUG ? 0.5 : 1
        }}
      >
        <CommandInput
          ref={inputRef}
          onValueChange={setQuery}
          placeholder="Např. Praha 8 nebo Brno"
          // 16 px on phones, or iOS zooms in on the field
          className="text-base md:text-sm"
        />
        <CommandList
          ref={listRef}
          className="max-h-72"
        >
          <CommandEmpty>Takovou lokalitu neznáme.</CommandEmpty>
          {row(ALL_LOCALITIES_SLUG, ALL_LOCALITIES_NAME, {
            keywords: [ALL_LOCALITIES_NAME, "Česká republika", "všechny lokality"],
          })}
          {options.map((locality) =>
            row(locality.slug, locality.name, { isDistrict: locality.isDistrict }),
          )}
        </CommandList>
      </Command>
    </>
  )
}
