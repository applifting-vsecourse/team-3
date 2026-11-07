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

/** „1 volné místo“, „3 volná místa“, „8 volných míst“ — the status badge's form (Figma Capacity bar › Free). */
export function freeSpotsLabel(count: number): string {
  if (count === 1) return "1 volné místo"
  if (count >= 2 && count <= 4) return `${count} volná místa`
  return `${count} volných míst`
}

export type OccupancyState = "missing" | "free" | "full"

/**
 * Below the minimum (not confirmed yet), minimum reached with places left, or
 * full — in the order the status badge checks them, so full wins.
 */
export function occupancyState({ isFull, missingToMin }: Occupancy): OccupancyState {
  if (isFull) return "full"
  return missingToMin > 0 ? "missing" : "free"
}

/** The detail's status line (Capacity bar): „Chybí ještě 2“, „3 volná místa“, „1 volné místo“, „Plno“. */
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
 * The occupancy next to a badge, always with the minimum (Figma C-01d, C-02d):
 * „5 z 12 · min. 6“, „8 z 8 · min. 6“. A capacity badge beside it already says
 * „Chybí 1“, so the line doesn't repeat it.
 */
export const occupancyBesideBadge = (occupancy: Occupancy): string =>
  `${occupancyCount(occupancy)} · min. ${occupancy.minParticipants}`

/**
 * The occupancy in one line where no capacity badge says it (a card in
 * Přihlášen shows „Jdu“): „5 z 12 · min. 3“; below the minimum it starts with
 * how many are missing, „chybí 1 · 5 z 12 · min. 6“.
 */
export function occupancySummary(occupancy: Occupancy): string {
  const line = occupancyBesideBadge(occupancy)
  return occupancyState(occupancy) === "missing"
    ? `chybí ${occupancy.missingToMin} · ${line}`
    : line
}

/**
 * The detail as the API answers a sign-up: this very place reached the minimum when the
 * approved count is now exactly the minimum (DESIGN.md › Máš místo, Figma A-05c).
 */
export const isMinimumReachedByLast = ({
  approvedCount,
  minParticipants,
}: Pick<Occupancy, "approvedCount" | "minParticipants">): boolean =>
  approvedCount === minParticipants

/** „Díky tobě se akce koná – sešlo se 6 lidí, minimum je 6.“, for the place that reached it. */
export function happeningThanks({
  approvedCount,
  minParticipants,
}: Pick<Occupancy, "approvedCount" | "minParticipants">): string {
  if (approvedCount === 1) return "Díky tobě se akce koná."
  const gathered =
    approvedCount >= 2 && approvedCount <= 4
      ? `sešli se ${approvedCount} lidé`
      : `sešlo se ${approvedCount} lidí`
  return `Díky tobě se akce koná – ${gathered}, minimum je ${minParticipants}.`
}
