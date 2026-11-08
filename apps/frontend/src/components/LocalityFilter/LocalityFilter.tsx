import { useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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

/** „Okolí“ around the locality's centre (#57, Figma A-02gd): km as strings, e.g. ["10", "25", "50"]. */
export type LocalityRadius = {
  /** The applied radius; undefined = „Jen obec“. */
  value: string | undefined
  options: readonly string[]
}

/** What the panel is picking: the locality and, with `radius`, the okolí around it. */
export type LocalityDraft = { slug: string; radius: string | undefined }

const JUST_THE_LOCALITY = "obec"

type LocalityFilterProps = {
  /** The shown locality's slug, the visitor's default included (useLocality); undefined is Celé Česko. */
  value: string | undefined
  localities: Locality[]
  /** The picked locality, and its okolí when the filter has `radius` (none for Celé Česko). */
  onChange: (slug: string, radius?: string) => void
  /** The apply button, e.g. „Zobrazit 12 akcí“ for the locality being picked. */
  applyLabel: string
  /** What is being picked while the panel is open, undefined once it closes, so the page can preview its result. */
  onDraftChange?: (draft: LocalityDraft | undefined) => void
  /** Offers „Okolí: Jen obec / +10 / +25 / +50 km“ (#57); only /akce has it. */
  radius?: LocalityRadius
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
  radius,
}: LocalityFilterProps) {
  const current = value ?? ALL_LOCALITIES_SLUG
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(current)
  const [draftRadius, setDraftRadius] = useState(radius?.value)
  const searchRef = useRef<HTMLInputElement>(null)

  const currentName = localityName(current, localities)
  // Celé Česko has no centre to measure from
  const appliedRadius = current === ALL_LOCALITIES_SLUG ? undefined : radius?.value
  // okolí is a filter: the chip turns dark even around the default locality
  const isDefault = (localityDefault?.isDefault ?? false) && !appliedRadius
  const chipLabel =
    currentName && appliedRadius
      ? `${currentName} · +${appliedRadius} km`
      : currentName && isDefault && localityDefault?.hint
        ? `${currentName} · ${localityDefault.hint}`
        : currentName
  // follows what is picked: a district goes back to its city, anything else to the
  // visitor's default (or Celé Česko without one)
  const cityReset = localityReset(draft, localities)
  const isResetToDefault = localityDefault && !cityReset.isDistrict
  const reset = isResetToDefault
    ? { label: "Zrušit výběr", isDisabled: !areaLabel && isDefault && draft === current }
    : { label: cityReset.label, isDisabled: cityReset.slug === undefined }
  const radiusFor = (slug: string, km: string | undefined) =>
    slug === ALL_LOCALITIES_SLUG ? undefined : km
  const updateDraft = (slug: string, km = draftRadius) => {
    setDraft(slug)
    setDraftRadius(km)
    onDraftChange?.({ slug, radius: radiusFor(slug, km) })
  }
  // Always the slug, the default's too: a pick is remembered (#55) and „Zrušit vše“ undoes it.
  const apply = (slug: string, km?: string) => {
    if (radius) onChange(slug, radiusFor(slug, km))
    else onChange(slug)
    setIsOpen(false)
    onDraftChange?.(undefined)
  }

  return (
    <FilterPanel
      title="Lokalita"
      isOpen={isOpen}
      onOpenChange={(isOpening) => {
        if (isOpening) updateDraft(current, appliedRadius)
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
          apply(cityReset.slug, draftRadius)
        }
      }}
      applyLabel={applyLabel}
      onApply={() => apply(draft, draftRadius)}
      popoverClassName="w-80"
      initialFocusRef={searchRef}
    >
      <LocalitySearch
        localities={localities}
        draft={draft}
        onPick={(slug) => updateDraft(slug)}
        inputRef={searchRef}
        between={
          radius ? (
            <RadiusPicker
              options={radius.options}
              value={draftRadius}
              // no centre to measure from in all of Czechia
              isDisabled={draft === ALL_LOCALITIES_SLUG}
              onChange={(km) => updateDraft(draft, km)}
            />
          ) : null
        }
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
  between,
}: {
  localities: Locality[]
  draft: string
  onPick: (slug: string) => void
  inputRef: RefObject<HTMLInputElement | null>
  /** Between the search field and the list, e.g. the okolí (Figma A-02gd). */
  between?: ReactNode
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
        {between}
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

/**
 * „Okolí: Jen obec / +10 km / +25 km / +50 km“ (#57, Figma A-02gd): one choice, as chips. It
 * sits inside the locality search, whose keys (Enter, arrows) would otherwise move the list.
 */
function RadiusPicker({
  options,
  value,
  isDisabled,
  onChange,
}: {
  options: readonly string[]
  value: string | undefined
  isDisabled: boolean
  onChange: (km: string | undefined) => void
}) {
  const labelId = useId()
  return (
    <div
      role="presentation"
      onKeyDown={(event) => event.stopPropagation()}
      className="flex flex-col gap-2"
    >
      <p
        id={labelId}
        className="text-sm font-semibold"
      >
        Okolí
      </p>
      <ToggleGroup
        type="single"
        aria-labelledby={labelId}
        value={value ?? JUST_THE_LOCALITY}
        // a single group can be emptied by a second click; „Jen obec“ is its empty state
        onValueChange={(next) => onChange(next && next !== JUST_THE_LOCALITY ? next : undefined)}
        disabled={isDisabled}
        spacing={2}
        className="flex-wrap"
      >
        {[JUST_THE_LOCALITY, ...options].map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            variant="outline"
            // Figma: the chips of the filter bar, dark when picked
            className="h-9 rounded-full px-4 data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-semibold data-[state=on]:text-background"
          >
            {option === JUST_THE_LOCALITY ? "Jen obec" : `+${option} km`}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
