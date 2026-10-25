import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react"
import { useQuery } from "@tanstack/react-query"
import { useCommandState } from "cmdk"

import type { LatLng } from "@/components/map/LocationPicker"
import { Command, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"

import {
  ADDRESS_SEARCH_MIN_LENGTH,
  addressSuggestionsQueryOptions,
  type AddressSearch,
  type AddressSuggestion,
} from "@/features/events/api/addressSearch"

const DEBOUNCE_MS = 300
// cmdk highlights the first item unless something else is set; this matches no item
const NONE = "-"

type AddressComboboxProps = Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string
  onChange: (value: string) => void
  /** Addresses near this point come first: the picked place or the chosen locality. */
  near: LatLng
  /** A suggestion was picked: its address and where it is. */
  onPick: (suggestion: AddressSuggestion) => void
}

/**
 * The address field with suggestions of real addresses (OpenStreetMap). Typing
 * your own text still works, a suggestion is never required; when the service
 * fails or is slow, there are just no suggestions.
 */
export function AddressCombobox({
  value,
  onChange,
  near,
  onPick,
  ref,
  ...inputProps
}: AddressComboboxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  /** What the user typed last; empty after a pick, so the pick isn't searched again. */
  const [typed, setTyped] = useState("")
  const [search, setSearch] = useState<AddressSearch | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [active, setActive] = useState(NONE)
  // cmdk names the list itself; the field points at it while it is open
  const [listId, setListId] = useState<string>()

  useEffect(() => {
    const text = typed.trim()
    const timeout = setTimeout(
      () =>
        setSearch(
          text.length >= ADDRESS_SEARCH_MIN_LENGTH
            ? { text, near: { lat: near.lat, lng: near.lng } }
            : null,
        ),
      DEBOUNCE_MS,
    )
    return () => clearTimeout(timeout)
  }, [typed, near.lat, near.lng])

  const query = useQuery(addressSuggestionsQueryOptions(search))
  const suggestions =
    search && !query.isError && typed.trim().length >= ADDRESS_SEARCH_MIN_LENGTH
      ? (query.data ?? [])
      : []
  const isExpanded = isOpen && suggestions.length > 0

  const pick = (suggestion: AddressSuggestion) => {
    setTyped("")
    setSearch(null)
    setIsOpen(false)
    setActive(NONE)
    onPick(suggestion)
  }

  return (
    <Command
      shouldFilter={false}
      vimBindings={false}
      value={active}
      onValueChange={(next) => setActive(next || NONE)}
      // only holds the field; the look is the input's and the list's
      className="overflow-visible bg-transparent text-foreground"
    >
      <Popover
        open={isExpanded}
        onOpenChange={setIsOpen}
      >
        <PopoverAnchor asChild>
          <AddressInput
            {...inputProps}
            ref={setRefs}
            value={value}
            isExpanded={isExpanded}
            listId={listId}
            hasActive={active !== NONE}
            onChange={(event) => {
              onChange(event.target.value)
              setTyped(event.target.value)
              setActive(NONE)
              setIsOpen(true)
            }}
            onKeyDown={(event) => {
              // without a list, or without a highlighted suggestion, keys do what
              // they do in any text field: Enter sends the form, Home/End move the caret
              if (event.key === "ArrowDown" && !isExpanded && suggestions.length > 0) {
                event.preventDefault()
                setIsOpen(true)
              }
              if (
                !isExpanded ||
                event.key === "Home" ||
                event.key === "End" ||
                (event.key === "Enter" && active === NONE)
              ) {
                if (event.key === "Enter") setIsOpen(false)
                event.stopPropagation()
              }
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          // the focus stays in the field, so typing goes on
          onOpenAutoFocus={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (event.target instanceof Node && inputRef.current?.contains(event.target)) {
              event.preventDefault()
            }
          }}
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <CommandList
            ref={(node) => setListId(node?.id)}
            label="Návrhy adres"
          >
            {suggestions.map((suggestion) => (
              <CommandItem
                key={suggestion.address}
                value={suggestion.address}
                onSelect={() => pick(suggestion)}
                className="flex-col items-start gap-0 px-3 py-2"
              >
                <span>{suggestion.title}</span>
                {suggestion.area ? (
                  <span className="text-xs text-muted-foreground">{suggestion.area}</span>
                ) : null}
              </CommandItem>
            ))}
          </CommandList>
          <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            Adresy z OpenStreetMap
          </p>
        </PopoverContent>
      </Popover>
    </Command>
  )
}

type AddressInputProps = ComponentProps<typeof Input> & {
  isExpanded: boolean
  listId: string | undefined
  hasActive: boolean
}

/** The kit's input as an ARIA combobox (list autocomplete), named by its own <label>. */
function AddressInput({ isExpanded, listId, hasActive, ...props }: AddressInputProps) {
  const activeId = useCommandState((state) => state.selectedItemId)
  return (
    <Input
      {...props}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={isExpanded}
      aria-controls={isExpanded ? listId : undefined}
      aria-activedescendant={isExpanded && hasActive ? activeId : undefined}
    />
  )
}
