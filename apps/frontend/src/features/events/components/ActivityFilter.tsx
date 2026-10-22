import { useId, useState } from "react"
import { ChevronRight, Search } from "lucide-react"

import { ActivityTile } from "@/components/ActivityTile/ActivityTile"
import { FilterChip } from "@/components/FilterChip/FilterChip"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

import type { ActivityCategory } from "@/features/events/api/catalogSchemas"
import { FilterPanel } from "@/features/events/components/FilterPanel"
import { useEvents } from "@/features/events/hooks/useEvents"
import {
  categoryState,
  isActivityChecked,
  searchActivities,
  selectionLabel,
  toggleActivity,
  toggleCategory,
  type ActivitySelection,
  type CheckState,
} from "@/features/events/lib/activitySelection"
import { joinSlugs, splitSlugs, type EventsSearch } from "@/features/events/lib/eventsSearch"
import { showEventsLabel } from "@/features/events/lib/formatEvent"

type ActivityFilterProps = {
  search: EventsSearch
  categories: ActivityCategory[]
  onChange: (patch: Pick<EventsSearch, "kategorie" | "aktivita">) => void
}

const toSearch = (selection: ActivitySelection) => ({
  kategorie: joinSlugs(selection.categories),
  aktivita: joinSlugs(selection.activities),
})

/**
 * Chip „Typ aktivity“ › category › activity (Figma: Popover – typ aktivity,
 * A-02a, A-02b). Counts per item need /api/events/facets, so they are hidden.
 */
export function ActivityFilter({ search, categories, onChange }: ActivityFilterProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const current: ActivitySelection = {
    categories: splitSlugs(search.kategorie),
    activities: splitSlugs(search.aktivita),
  }
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(current)
  const [query, setQuery] = useState("")
  // desktop: the category shown on the right; mobile: the opened second level
  const [shownSlug, setShownSlug] = useState<string | undefined>()
  const preview = useEvents({ ...search, ...toSearch(draft) })

  const shown = categories.find((c) => c.slug === shownSlug)
  const isSecondLevel = !isDesktop && shown !== undefined && !query
  const label = selectionLabel(current, categories)

  const apply = (selection: ActivitySelection) => {
    onChange(toSearch(selection))
    setIsOpen(false)
  }

  return (
    <FilterPanel
      title={isSecondLevel ? shown.name : "Typ aktivity"}
      onBack={isSecondLevel ? () => setShownSlug(undefined) : undefined}
      backLabel="Zpět na kategorie"
      isOpen={isOpen}
      onOpenChange={(isOpening) => {
        if (isOpening) {
          setDraft(current)
          setQuery("")
          // desktop opens on the first category with something selected
          setShownSlug(
            isDesktop
              ? (categories.find((c) => categoryState(current, c) !== "off") ?? categories[0])?.slug
              : undefined,
          )
        }
        setIsOpen(isOpening)
      }}
      trigger={<FilterChip isSelected={Boolean(label)}>{label ?? "Typ aktivity"}</FilterChip>}
      resetLabel="Zrušit výběr"
      onReset={() => apply({ categories: [], activities: [] })}
      applyLabel={preview.events ? showEventsLabel(preview.events.length) : "Zobrazit akce"}
      onApply={() => apply(draft)}
      popoverClassName="w-auto"
    >
      {isSecondLevel ? null : (
        <SearchField
          value={query}
          onChange={setQuery}
        />
      )}

      {query ? (
        <SearchResults
          categories={categories}
          query={query}
          selection={draft}
          onChange={setDraft}
        />
      ) : isDesktop ? (
        <div className="mt-2 flex">
          <ul className="flex w-80 flex-col">
            {categories.map((category) => (
              <li key={category.id}>
                <CategoryRow
                  category={category}
                  state={categoryState(draft, category)}
                  isHighlighted={category.slug === shownSlug}
                  onToggle={() => setDraft(toggleCategory(draft, category))}
                  onOpen={() => setShownSlug(category.slug)}
                />
              </li>
            ))}
          </ul>
          <div
            aria-hidden
            className="mx-2 w-px self-stretch bg-border"
          />
          {shown ? (
            <CategoryActivities
              category={shown}
              selection={draft}
              onChange={setDraft}
              className="w-80"
            />
          ) : null}
        </div>
      ) : shown ? (
        <CategoryActivities
          category={shown}
          selection={draft}
          onChange={setDraft}
        />
      ) : (
        <ul className="mt-2 flex flex-col">
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryRow
                category={category}
                state={categoryState(draft, category)}
                onToggle={() => setDraft(toggleCategory(draft, category))}
                onOpen={() => setShownSlug(category.slug)}
              />
            </li>
          ))}
        </ul>
      )}
    </FilterPanel>
  )
}

const checked = (state: CheckState) =>
  state === "on" ? true : state === "mixed" ? "indeterminate" : false

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Hledat aktivitu</Label>
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="např. nohejbal"
          autoComplete="off"
          className="h-11 pl-9"
        />
      </div>
    </div>
  )
}

/** Figma: Picker row/Category — the checkbox selects all of it, the rest opens its activities. */
function CategoryRow({
  category,
  state,
  isHighlighted,
  onToggle,
  onOpen,
}: {
  category: ActivityCategory
  state: CheckState
  isHighlighted?: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  return (
    <div
      className={cn(
        "flex h-14 items-center gap-3 rounded-lg pl-4",
        isHighlighted ? "bg-muted" : "hover:bg-accent",
      )}
    >
      <Checkbox
        checked={checked(state)}
        onCheckedChange={onToggle}
        aria-label={`Celá kategorie ${category.name}`}
      />
      <button
        type="button"
        onClick={onOpen}
        aria-current={isHighlighted ? "true" : undefined}
        className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-lg pr-4 text-left text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ActivityTile
          icon={category.icon}
          className="size-10"
        />
        <span className="flex-1 truncate">{category.name}</span>
        <ChevronRight
          aria-hidden
          className="size-4 text-muted-foreground"
        />
      </button>
    </div>
  )
}

function CategoryActivities({
  category,
  selection,
  onChange,
  className,
}: {
  category: ActivityCategory
  selection: ActivitySelection
  onChange: (selection: ActivitySelection) => void
  className?: string
}) {
  const wholeId = useId()
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex h-14 items-center gap-3 rounded-lg px-4 hover:bg-accent">
        <Checkbox
          id={wholeId}
          checked={checked(categoryState(selection, category))}
          onCheckedChange={() => onChange(toggleCategory(selection, category))}
        />
        <label
          htmlFor={wholeId}
          className="flex flex-1 cursor-pointer items-center gap-3 text-sm font-medium"
        >
          <ActivityTile
            icon={category.icon}
            className="size-10"
          />
          Celá kategorie
        </label>
      </div>
      <div
        aria-hidden
        className="h-px bg-border"
      />
      <ul className="flex flex-col">
        {category.activities.map((activity) => (
          <li key={activity.id}>
            <ActivityRow
              name={activity.name}
              isChecked={isActivityChecked(selection, category, activity)}
              onToggle={() => onChange(toggleActivity(selection, category, activity))}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function SearchResults({
  categories,
  query,
  selection,
  onChange,
}: {
  categories: ActivityCategory[]
  query: string
  selection: ActivitySelection
  onChange: (selection: ActivitySelection) => void
}) {
  const results = searchActivities(categories, query)
  if (results.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Takovou aktivitu neznáme.</p>
    )
  }
  return (
    <ul className="mt-2 flex flex-col md:w-80">
      {results.map(({ category, activity }) => (
        <li key={activity.id}>
          <ActivityRow
            name={activity.name}
            hint={category.name}
            isChecked={isActivityChecked(selection, category, activity)}
            onToggle={() => onChange(toggleActivity(selection, category, activity))}
          />
        </li>
      ))}
    </ul>
  )
}

/** Figma: Picker row/Activity */
function ActivityRow({
  name,
  hint,
  isChecked,
  onToggle,
}: {
  name: string
  hint?: string
  isChecked: boolean
  onToggle: () => void
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-4 py-2 hover:bg-accent">
      <Checkbox
        checked={isChecked}
        onCheckedChange={onToggle}
      />
      <span className="flex-1 text-base">{name}</span>
      {hint ? <span className="text-sm text-muted-foreground">{hint}</span> : null}
    </label>
  )
}
