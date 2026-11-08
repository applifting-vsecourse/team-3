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
  localityName,
  localityOptions,
  localityReset,
} from "@/lib/catalog/localityOptions"
import { foldText, matchRank } from "@/lib/catalog/textSearch"
import { cn } from "@/lib/utils"

/**
 * The visitor's default locality (#55, Figma A-02 notes): shown on a light chip, as it is no
 * filter, with where it came from („Praha · podle polohy“); „Zrušit výběr“ goes back to it.
 */
export type LocalityDefault = {
  /** The chip shows the default, nothing was picked. */
  isDefault: boolean
  /** After the name on a default chip, e.g. „podle polohy“ for a guess from the IP. */
  hint?: string
  /** „Zrušit výběr“: forget the pick and show the default again. */
  onReset: () => void
}

type LocalityFilterProps = {
  /** The shown locality's slug, the visitor's default included (useLocality); undefined is Celé Česko. */
  value: string | undefined
  localities: Locality[]
  onChange: (slug: string) => void
  /** The apply button, e.g. „Zobrazit 12 akcí“ for the locality being picked. */
  applyLabel: string
  /** The slug being picked while the panel is open, undefined once it closes, so the page can preview its result. */
  onDraftChange?: (draft: string | undefined) => void
  /** On the lists and the landing page; without it „Zrušit výběr“ goes to Celé Česko. */
  localityDefault?: LocalityDefault
  /** The list is limited to an area of the map instead (#56): the chip names it, e.g. „Výřez mapy“. */
  areaLabel?: string
}

/** Chip „Brno“ › one locality or Celé Česko; a city includes its districts. */
export function LocalityFilter({
  value,
  localities,
  onChange,
  applyLabel,
  onDraftChange,
  localityDefault,
  areaLabel,
}: LocalityFilterProps) {
  const current = value ?? ALL_LOCALITIES_SLUG
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(current)
  const searchRef = useRef<HTMLInputElement>(null)

  const currentName = localityName(current, localities)
  const isDefault = localityDefault?.isDefault ?? false
  const chipLabel =
    currentName && isDefault && localityDefault?.hint
      ? `${currentName} · ${localityDefault.hint}`
      : currentName
  // follows what is picked: a district goes back to its city, anything else to the
  // visitor's default (or Celé Česko without one)
  const cityReset = localityReset(draft, localities)
  const isResetToDefault = localityDefault && cityReset.label === "Zrušit výběr"
  const reset = isResetToDefault
    ? { label: "Zrušit výběr", isDisabled: !areaLabel && isDefault && draft === current }
    : { label: cityReset.label, isDisabled: cityReset.slug === undefined }
  const updateDraft = (slug: string) => {
    setDraft(slug)
    onDraftChange?.(slug)
  }
  // Always the slug, the default's too: a pick is remembered (#55) and „Zrušit vše“ undoes it.
  const apply = (slug: string) => {
    onChange(slug)
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
          // the default is no filter: a light chip, dark only once picked
          isSelected={Boolean(areaLabel) || (Boolean(currentName) && !isDefault)}
          filterName="Lokalita"
        >
          {areaLabel ?? chipLabel ?? "Lokalita"}
        </FilterChip>
      }
      resetLabel={reset.label}
      isResetDisabled={reset.isDisabled}
      onReset={() => {
        if (isResetToDefault) {
          localityDefault.onReset()
          setIsOpen(false)
          onDraftChange?.(undefined)
        } else if (cityReset.slug !== undefined) {
          apply(cityReset.slug)
        }
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
        // "usti nad orl" Ústí nad Orlicí. A name starting with the text
        // first, then a word in it, then anywhere: „nov“ gives Nová Paka
        // before Černovice (#55). Celé Česko after the towns: „Česk“ is on
        // its way to Česká Lípa, and Enter picks the first row.
        filter={(value, search, keywords) => {
          const needle = foldText(search)
          const ranks = [value, ...(keywords ?? [])]
            .map((text) => matchRank(foldText(text), needle))
            .filter((rank) => rank !== undefined)
          if (ranks.length === 0) return 0
          if (value === ALL_LOCALITIES_SLUG) return 0.1
          return 1 - Math.min(...ranks) * 0.3
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
