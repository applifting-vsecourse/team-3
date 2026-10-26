import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react"
import { Check, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { foldText, matchRank } from "@/lib/catalog/textSearch"
import { cn } from "@/lib/utils"

export type CatalogComboboxItem = {
  id: string
  name: string
  /** What the field shows once it is picked, when it says more than the name („Hry › Deskové hry“). */
  label?: string
  /** Searched besides the name, e.g. an activity's synonyms. */
  keywords?: string[]
  /** A district under its city. */
  isIndented?: boolean
}

export type CatalogComboboxGroup = {
  /** A category above its activities; none for one plain list. */
  heading?: string
  items: CatalogComboboxItem[]
}

export type CatalogComboboxProps = Omit<
  ComponentProps<"button">,
  "value" | "onChange" | "children" | "placeholder"
> & {
  /** The picked item's id, "" for none. */
  value: string
  onChange: (id: string) => void
  groups: CatalogComboboxGroup[]
  placeholder: string
  /** Names the search field, e.g. „Hledat lokalitu“. */
  searchLabel: string
  searchPlaceholder: string
  /** Names the list, e.g. „Lokality“. */
  listLabel: string
  /** Says what to do when nothing matches. */
  emptyMessage: string
  /** Offered under `emptyMessage`, e.g. the „Jiné…“ activities. */
  fallback?: CatalogComboboxItem[]
  /** More choices for the typed text under the catalog's, e.g. places from an online search. */
  renderMore?: (query: string, pick: (id: string) => void) => ReactNode
}

type SearchedItem = CatalogComboboxItem & { terms: string[] }
type SearchedGroup = { heading?: string; items: SearchedItem[] }

/** Matching items, best match first within each group; every item for an empty query. */
const search = (groups: SearchedGroup[], query: string): SearchedGroup[] => {
  const needle = foldText(query)
  if (!needle) return groups
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => ({
          item,
          rank: Math.min(...item.terms.map((term) => matchRank(term, needle) ?? Infinity)),
        }))
        .filter(({ rank }) => rank !== Infinity)
        // stable: equally good matches keep the catalog's order
        .sort((a, b) => a.rank - b.rank)
        .map(({ item }) => item),
    }))
    .filter((group) => group.items.length > 0)
}

/**
 * Rows the list shows at most: all ~550 towns make opening and typing sluggish
 * on a phone (a cmdk row is not cheap), and nobody scrolls that far anyway.
 */
const MAX_ROWS = 100

/**
 * The first `MAX_ROWS` items, and how many are left out. The picked one stays
 * in view even past the cut-off (editing an event in Zlín).
 */
const firstRows = (groups: SearchedGroup[], pickedId: string) => {
  let left = MAX_ROWS
  const shown = groups
    .map((group) => {
      const items = group.items.slice(0, left)
      left -= items.length
      const picked = group.items.find((item) => item.id === pickedId)
      return { ...group, items: picked && !items.includes(picked) ? [...items, picked] : items }
    })
    .filter((group) => group.items.length > 0)
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)
  const shownCount = shown.reduce((sum, group) => sum + group.items.length, 0)
  return { shown, hiddenCount: Math.max(0, total - shownCount) }
}

/**
 * A form field that picks one catalog item by typing (našeptávač): the field
 * looks like a select, the popover has a search over names and keywords that
 * ignores case and diacritics, the list and an empty state. Pass the field's
 * id and aria props (FormControl does), so its <label> names it.
 */
export function CatalogCombobox({
  value,
  onChange,
  groups,
  placeholder,
  searchLabel,
  searchPlaceholder,
  listLabel,
  emptyMessage,
  fallback,
  renderMore,
  className,
  ...buttonProps
}: CatalogComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  /** A letter typed on the closed field starts the search. */
  const [firstLetter, setFirstLetter] = useState("")
  // folded once per catalog, not on every keystroke
  const searched = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          terms: [item.name, ...(item.keywords ?? [])].map(foldText),
        })),
      })),
    [groups],
  )
  const picked = groups.flatMap((group) => group.items).find((item) => item.id === value)

  return (
    <Popover
      open={isOpen}
      onOpenChange={(isOpening) => {
        setFirstLetter("")
        setIsOpen(isOpening)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          {...buttonProps}
          type="button"
          variant="outline"
          role="combobox"
          onKeyDown={(event) => {
            // like a select, the arrows open the list; a letter opens it and searches
            const isLetter =
              event.key.length === 1 &&
              event.key !== " " &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            if (event.key === "ArrowDown" || event.key === "ArrowUp" || isLetter) {
              event.preventDefault()
              setFirstLetter(isLetter ? event.key : "")
              setIsOpen(true)
            }
          }}
          // looks like the other fields of the form (the date picker, 15 px type)
          className={cn(
            "h-11 w-full justify-between px-3 text-base font-normal md:text-sm",
            !picked && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{picked ? (picked.label ?? picked.name) : placeholder}</span>
          <ChevronDown
            aria-hidden
            className="text-muted-foreground"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        // Radix makes it a dialog; named, so it isn't an anonymous one around the list
        aria-label={searchLabel}
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-72 p-0"
      >
        <CatalogSearch
          groups={searched}
          value={value}
          initialQuery={firstLetter}
          searchLabel={searchLabel}
          searchPlaceholder={searchPlaceholder}
          listLabel={listLabel}
          emptyMessage={emptyMessage}
          fallback={fallback}
          renderMore={renderMore}
          onPick={(id) => {
            onChange(id)
            setIsOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

/** The popover's inside; mounted on opening, so every opening starts with an empty search. */
function CatalogSearch({
  groups,
  value,
  initialQuery,
  searchLabel,
  searchPlaceholder,
  listLabel,
  emptyMessage,
  fallback = [],
  renderMore,
  onPick,
}: {
  groups: SearchedGroup[]
  value: string
  initialQuery: string
  searchLabel: string
  searchPlaceholder: string
  listLabel: string
  emptyMessage: string
  fallback?: CatalogComboboxItem[]
  renderMore?: CatalogComboboxProps["renderMore"]
  onPick: (id: string) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const listRef = useRef<HTMLDivElement>(null)
  const { shown, hiddenCount } = useMemo(
    () => firstRows(search(groups, query), value),
    [groups, query, value],
  )

  // the picked town may be far down the alphabet: the list opens on it
  useLayoutEffect(() => {
    const list = listRef.current
    const picked = list?.querySelector("[data-picked]")
    if (!list || !picked) return
    list.scrollTop +=
      picked.getBoundingClientRect().top - list.getBoundingClientRect().top - list.clientHeight / 2
  }, [])

  const renderItem = (item: CatalogComboboxItem) => {
    const isPicked = item.id === value
    return (
      <CommandItem
        key={item.id}
        value={item.id}
        data-picked={isPicked || undefined}
        onSelect={() => onPick(item.id)}
        className={cn(
          "rounded-md px-3 py-2 text-base md:text-sm",
          item.isIndented && "pl-8",
          isPicked && "font-semibold",
        )}
      >
        <span className="flex-1 truncate">{item.name}</span>
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
    <Command
      // the search is ours: cmdk's own ignores neither diacritics nor keywords
      shouldFilter={false}
      label={searchLabel}
      // the picked item is highlighted, so Enter keeps it
      defaultValue={value || undefined}
      className="**:data-[slot=command-input-wrapper]:h-11"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={searchPlaceholder}
        // 16 px on phones, or iOS zooms in on the field
        className="text-base md:text-sm"
      />
      <CommandList
        ref={listRef}
        label={listLabel}
        className="max-h-72"
      >
        {shown.length === 0 ? (
          <>
            <p
              role="status"
              className="px-3 py-4 text-sm text-muted-foreground"
            >
              {emptyMessage}
            </p>
            {fallback.length > 0 ? <CommandGroup>{fallback.map(renderItem)}</CommandGroup> : null}
          </>
        ) : (
          shown.map((group, index) => (
            <CommandGroup
              key={group.heading ?? index}
              heading={group.heading}
            >
              {group.items.map(renderItem)}
            </CommandGroup>
          ))
        )}
        {renderMore?.(query, onPick)}
      </CommandList>
      {hiddenCount > 0 ? (
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {query ? "Další najdeš, když napíšeš víc." : "Další najdeš, když začneš psát."}
        </p>
      ) : null}
    </Command>
  )
}
