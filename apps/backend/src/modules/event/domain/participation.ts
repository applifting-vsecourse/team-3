/** Mirrors the Prisma enum, so the domain doesn't depend on the client. */
export type ParticipationStatus =
  'pending' | 'approved' | 'rejected' | 'withdrawn' | 'removed';

/** Why joining or leaving was refused; the API answers 409 with the code. */
export type ParticipationRefusal =
  | 'EVENT_FULL'
  | 'ALREADY_JOINED'
  | 'EVENT_STARTED'
  | 'EVENT_CANCELLED'
  | 'PARTICIPATION_REFUSED'
  | 'NOT_JOINED';

export type JoinState = {
  eventStatus: 'published' | 'cancelled' | 'hidden' | 'deleted';
  startsAt: Date;
  approvalMode: 'open' | 'approval';
  maxParticipants: number;
  isOrganizer: boolean;
  /** The user's participation in this event, if any. */
  existingStatus: ParticipationStatus | null;
  approvedCount: number;
};

export type JoinDecision =
  | { ok: true; status: 'approved' | 'pending' }
  | { ok: false; refusal: ParticipationRefusal };

/**
 * Whether a user may join an event, and with what status (B-031):
 * - an event without approval, and the organizer always (Q12), join approved;
 *   with approval the participation waits for the organizer (pending, #53);
 * - not twice, not on a full event, not on a cancelled or started one;
 * - someone the organizer rejected or removed can't come back on their own;
 *   someone who withdrew can.
 * The caller runs it under a lock on the event, so the count is current.
 */
export function decideJoin(state: JoinState, now: Date): JoinDecision {
  if (state.eventStatus === 'cancelled') {
    return { ok: false, refusal: 'EVENT_CANCELLED' };
  }
  if (state.startsAt <= now) return { ok: false, refusal: 'EVENT_STARTED' };
  if (
    state.existingStatus === 'approved' ||
    state.existingStatus === 'pending'
  ) {
    return { ok: false, refusal: 'ALREADY_JOINED' };
  }
  if (
    state.existingStatus === 'rejected' ||
    state.existingStatus === 'removed'
  ) {
    return { ok: false, refusal: 'PARTICIPATION_REFUSED' };
  }
  const status =
    state.isOrganizer || state.approvalMode === 'open' ? 'approved' : 'pending';
  // only an approved participation takes a place
  if (status === 'approved' && state.approvedCount >= state.maxParticipants) {
    return { ok: false, refusal: 'EVENT_FULL' };
  }
  return { ok: true, status };
}

/** Leaving (or withdrawing a request) is possible any time before the start. */
export function decideLeave(
  state: { startsAt: Date; existingStatus: ParticipationStatus | null },
  now: Date,
): { ok: true } | { ok: false; refusal: ParticipationRefusal } {
  if (
    state.existingStatus !== 'approved' &&
    state.existingStatus !== 'pending'
  ) {
    return { ok: false, refusal: 'NOT_JOINED' };
  }
  if (state.startsAt <= now) return { ok: false, refusal: 'EVENT_STARTED' };
  return { ok: true };
}
