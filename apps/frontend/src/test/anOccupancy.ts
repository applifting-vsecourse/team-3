import type { Occupancy } from "@/lib/occupancy"

/**
 * An occupancy for tests, with `missingToMin`, `freeSpots` and `isFull`
 * counted as the backend's `computeCapacity` sends them; `overrides` set
 * them directly, e.g. to check that the words follow the API.
 */
export const anOccupancy = (
  approvedCount: number,
  minParticipants: number,
  /** Null: no maximum (PO 26. 11.). */
  maxParticipants: number | null,
  overrides: Partial<Occupancy> = {},
): Occupancy => {
  const freeSpots = maxParticipants === null ? null : Math.max(0, maxParticipants - approvedCount)
  return {
    approvedCount,
    minParticipants,
    maxParticipants,
    missingToMin: Math.max(0, minParticipants - approvedCount),
    freeSpots,
    isFull: freeSpots === 0,
    ...overrides,
  }
}
