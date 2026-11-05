/**
 * How full an event is, in words (#189, Figma 4. 11.). The card, the detail
 * and Moje akce all say it with these, so one number never means two things:
 * „5 z 12“ is always approved participants of the maximum.
 */
export type Occupancy = {
  approvedCount: number
  minParticipants: number
  maxParticipants: number
}

/** Counted as the backend's `computeCapacity`: never negative, full once no place is left. */
function capacity({ approvedCount, minParticipants, maxParticipants }: Occupancy) {
  const freeSpots = Math.max(0, maxParticipants - approvedCount)
  const isFull = freeSpots === 0
  // min ≤ max, so a full event has its minimum; the guard covers odd data
  const missing = isFull ? 0 : Math.max(0, minParticipants - approvedCount)
  return { freeSpots, isFull, missing }
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

/** Below the minimum (not confirmed yet), minimum reached with places left, or full. */
export function occupancyState(occupancy: Occupancy): OccupancyState {
  const { isFull, missing } = capacity(occupancy)
  if (isFull) return "full"
  return missing > 0 ? "missing" : "free"
}

/** The detail's status line (Capacity bar): „Chybí ještě 2“, „Volná místa: 3“, „1 volné místo“, „Plno“. */
export function occupancyStatus(occupancy: Occupancy): string {
  const { freeSpots, isFull, missing } = capacity(occupancy)
  if (isFull) return "Plno"
  if (missing > 0) return `Chybí ještě ${missing}`
  return freeSpotsLabel(freeSpots)
}

/**
 * The occupancy next to a capacity badge (Figma 4. 11.): „5 z 12“, below the
 * minimum with it, „5 z 12 · min. 6“. The badge already says „Chybí 1“, so
 * the line doesn't repeat it.
 */
export function occupancyBesideBadge(occupancy: Occupancy): string {
  const { missing } = capacity(occupancy)
  const count = occupancyCount(occupancy)
  return missing > 0 ? `${count} · min. ${occupancy.minParticipants}` : count
}

/**
 * The occupancy in one line where no capacity badge says it (a card in
 * Přihlášen shows „Jdu“): „5 z 12“; below the minimum it starts with how many
 * are missing, „chybí 1 · 5 z 12 · min. 6“.
 */
export function occupancySummary(occupancy: Occupancy): string {
  const { missing } = capacity(occupancy)
  const line = occupancyBesideBadge(occupancy)
  return missing > 0 ? `chybí ${missing} · ${line}` : line
}
