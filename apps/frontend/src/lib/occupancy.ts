/**
 * How full an event is, in words (#189, Figma 4. 11.). The card, the detail
 * and Moje akce all say it with these, so one number never means two things:
 * „5 z 12“ is always approved participants of the maximum.
 */
export type Occupancy = {
  approvedCount: number
  minParticipants: number
  maxParticipants: number
  /**
   * The capacity as the API counts it (the backend's `computeCapacity`).
   * The status badge reads the same fields, so the words never disagree
   * with the badge next to them.
   */
  missingToMin: number
  freeSpots: number
  isFull: boolean
}

/** „5 z 12“ — approved participants of the maximum. */
export const occupancyCount = ({
  approvedCount,
  maxParticipants,
}: Pick<Occupancy, "approvedCount" | "maxParticipants">): string =>
  `${approvedCount} z ${maxParticipants}`

/** „1 volné místo“, „Volná místa: 3“, „Volná místa: 8“. */
export const freeSpotsLabel = (count: number): string =>
  count === 1 ? "1 volné místo" : `Volná místa: ${count}`

export type OccupancyState = "missing" | "free" | "full"

/**
 * Below the minimum (not confirmed yet), minimum reached with places left, or
 * full — in the order the status badge checks them, so full wins.
 */
export function occupancyState({ isFull, missingToMin }: Occupancy): OccupancyState {
  if (isFull) return "full"
  return missingToMin > 0 ? "missing" : "free"
}

/** The detail's status line (Capacity bar): „Chybí ještě 2“, „Volná místa: 3“, „1 volné místo“, „Plno“. */
export function occupancyStatus(occupancy: Occupancy): string {
  switch (occupancyState(occupancy)) {
    case "full":
      return "Plno"
    case "missing":
      return `Chybí ještě ${occupancy.missingToMin}`
    case "free":
      return freeSpotsLabel(occupancy.freeSpots)
  }
}

/**
 * The occupancy next to a capacity badge (Figma 4. 11.): „5 z 12“, below the
 * minimum with it, „5 z 12 · min. 6“. The badge already says „Chybí 1“, so
 * the line doesn't repeat it.
 */
export function occupancyBesideBadge(occupancy: Occupancy): string {
  const count = occupancyCount(occupancy)
  return occupancyState(occupancy) === "missing"
    ? `${count} · min. ${occupancy.minParticipants}`
    : count
}

/**
 * The occupancy in one line where no capacity badge says it (a card in
 * Přihlášen shows „Jdu“): „5 z 12“; below the minimum it starts with how many
 * are missing, „chybí 1 · 5 z 12 · min. 6“.
 */
export function occupancySummary(occupancy: Occupancy): string {
  const line = occupancyBesideBadge(occupancy)
  return occupancyState(occupancy) === "missing"
    ? `chybí ${occupancy.missingToMin} · ${line}`
    : line
}
