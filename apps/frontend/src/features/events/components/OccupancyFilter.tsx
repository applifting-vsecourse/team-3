import { useRef } from "react"

import { FilterToggleChip } from "@/components/FilterChip/FilterChip"

import type { EventsSearch, Occupancy } from "@/features/events/lib/eventsSearch"

/**
 * What the chip says for each ?obsazenost=. Only „volna“ is offered; „chybi“ comes from the
 * quick pick „Tady chybíš“ and the links under the landing page's section of that name, and
 * the chip names it so the list never filters by something the bar doesn't show (#305, Q9).
 */
const LABELS: Record<Occupancy, string> = {
  volna: "Jen s volným místem",
  chybi: "Chybí lidé",
}

/** The filter's name in a summary („… · Jen s volným místem“); nothing when it is off. */
export const occupancyLabel = (occupancy: Occupancy | undefined): string | undefined =>
  occupancy ? LABELS[occupancy] : undefined

type OccupancyFilterProps = {
  search: EventsSearch
  onChange: (obsazenost: Occupancy | undefined) => void
}

/**
 * „Jen s volným místem“ as an on/off chip (#305, Figma A-02f): off by default, so full events
 * show with their „Plno“ badge; on, they leave the list and the map. Whoever searches cares
 * whether they still get in, not whether the minimum is reached (PO 10. 11.).
 *
 * A toggle keeps its name whatever its state (review #331), so „chybi“ gets a chip of its own:
 * „Chybí lidé“, on, beside „Jen s volným místem“, off. Switching „Chybí lidé“ off clears it and
 * the chip goes; switching „Jen s volným místem“ on replaces it — the URL holds one value.
 * The chip that goes would take the focus with it, to the page's start: it moves to „Jen s volným
 * místem“, where the keyboard was.
 */
export function OccupancyFilter({ search, onChange }: OccupancyFilterProps) {
  const freeChip = useRef<HTMLButtonElement>(null)
  return (
    <>
      {search.obsazenost === "chybi" ? (
        <FilterToggleChip
          pressed
          onPressedChange={(isPressed) => {
            if (isPressed) return
            freeChip.current?.focus()
            onChange(undefined)
          }}
        >
          {LABELS.chybi}
        </FilterToggleChip>
      ) : null}
      <FilterToggleChip
        ref={freeChip}
        pressed={search.obsazenost === "volna"}
        onPressedChange={(isPressed) => onChange(isPressed ? "volna" : undefined)}
      >
        {LABELS.volna}
      </FilterToggleChip>
    </>
  )
}
