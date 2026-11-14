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

const OFFERED_LABEL = LABELS.volna

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
 * whether they still get in, not whether the minimum is reached (PO 10. 11.). With „chybi“ in
 * the URL the chip is on and reads „Chybí lidé“; switching it off clears it, the next tap is
 * „Jen s volným místem“.
 */
export function OccupancyFilter({ search, onChange }: OccupancyFilterProps) {
  const isOn = search.obsazenost !== undefined
  return (
    <FilterToggleChip
      pressed={isOn}
      onPressedChange={(isPressed) => onChange(isPressed ? "volna" : undefined)}
    >
      {occupancyLabel(search.obsazenost) ?? OFFERED_LABEL}
    </FilterToggleChip>
  )
}
