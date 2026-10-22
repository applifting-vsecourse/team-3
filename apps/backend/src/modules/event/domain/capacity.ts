/** Occupancy of an event, counted from approved participations only (B-020). */
export type Capacity = {
  approvedCount: number;
  /** How many people are still needed to reach the minimum; 0 once it is reached. */
  missingToMin: number;
  /** Places left up to the maximum; never negative. */
  freeSpots: number;
  isFull: boolean;
};

export const computeCapacity = (
  limits: { minParticipants: number; maxParticipants: number },
  approvedCount: number,
): Capacity => {
  // max(0, …) also covers data where approvals overshoot the maximum
  // (e.g. the maximum was lowered after people joined).
  const freeSpots = Math.max(0, limits.maxParticipants - approvedCount);
  return {
    approvedCount,
    missingToMin: Math.max(0, limits.minParticipants - approvedCount),
    freeSpots,
    isFull: freeSpots === 0,
  };
};
