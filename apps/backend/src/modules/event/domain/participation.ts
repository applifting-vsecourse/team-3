/** Mirrors the Prisma enum, so the domain doesn't depend on the client. */
export type ParticipationStatus =
  'pending' | 'approved' | 'rejected' | 'withdrawn' | 'removed';

/** Why joining or leaving was refused; the API answers 409 with the code. */
export type ParticipationRefusal =
  | 'EVENT_FULL'
  | 'ALREADY_JOINED'
  | 'EVENT_STARTED'
  | 'EVENT_CANCELLED'
  | 'EVENT_UNAVAILABLE'
  | 'PARTICIPATION_REFUSED'
  | 'NOT_JOINED'
  | 'NOT_PENDING'
  | 'MEMBERS_ONLY';

export type JoinState = {
  eventStatus: 'published' | 'cancelled' | 'hidden' | 'deleted';
  startsAt: Date;
  approvalMode: 'open' | 'approval';
  maxParticipants: number;
  isOrganizer: boolean;
  /**
   * A members-only event and the user, not its organizer, has no active
   * membership in its group – read under the lock, so someone who has just
   * left can't take a place (#266).
   */
  isOutsideGroup: boolean;
  /** The user's participation in this event, if any. */
  existingStatus: ParticipationStatus | null;
  approvedCount: number;
};

/**
 * A participation in any of these keeps the user from asking to join again
 * (`decideJoin`): they already have a place or a request, or the organizer
 * rejected or removed them. Only a withdrawn one doesn't. Lists that offer
 * events to join (#182) leave such events out.
 */
export const NO_NEW_REQUEST_STATUSES: ParticipationStatus[] = [
  'approved',
  'pending',
  'rejected',
  'removed',
];

export type JoinDecision =
  | { ok: true; status: 'approved' | 'pending' }
  | { ok: false; refusal: ParticipationRefusal };

/**
 * Whether a user may join an event, and with what status (B-031):
 * - an event without approval, and the organizer always (Q12), join approved;
 *   with approval the participation waits for the organizer (pending, #53);
 * - not twice, not on a full event, not on a cancelled, deactivated (#308)
 *   or started one;
 * - someone the organizer rejected or removed can't come back on their own;
 *   someone who withdrew can;
 * - a request to a full event is refused too, though it takes no place;
 * - a members-only event only for the group's active members (#266).
 * The caller runs it under a lock on the event, so the count is current.
 */
export function decideJoin(state: JoinState, now: Date): JoinDecision {
  if (state.isOutsideGroup) return { ok: false, refusal: 'MEMBERS_ONLY' };
  if (state.eventStatus === 'cancelled') {
    return { ok: false, refusal: 'EVENT_CANCELLED' };
  }
  // deactivated by the superadmin (#308) while the join waited for the lock
  if (state.eventStatus === 'hidden' || state.eventStatus === 'deleted') {
    return { ok: false, refusal: 'EVENT_UNAVAILABLE' };
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
  // a request takes no place, but a full event takes none either (B-031):
  // the organizer couldn't approve it, and waiting lists are not in the MVP
  if (state.approvedCount >= state.maxParticipants) {
    return { ok: false, refusal: 'EVENT_FULL' };
  }
  const status =
    state.isOrganizer || state.approvalMode === 'open' ? 'approved' : 'pending';
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

export type RequestsState = {
  eventStatus: JoinState['eventStatus'];
  startsAt: Date;
  maxParticipants: number;
  approvedCount: number;
  /** The participation of each user whose request is decided; null for none. */
  requestStatuses: (ParticipationStatus | null)[];
};

/**
 * Whether the organizer may approve or reject these requests (B-033, #53):
 * all of them or none. Only waiting requests of an event that is still on;
 * approving can't take more places than are free, so of two requests for the
 * last place only one gets it. The caller runs it under a lock on the event.
 */
export function decideRequests(
  state: RequestsState,
  decision: 'approve' | 'reject',
  now: Date,
): { ok: true } | { ok: false; refusal: ParticipationRefusal } {
  if (state.eventStatus === 'cancelled') {
    return { ok: false, refusal: 'EVENT_CANCELLED' };
  }
  if (state.startsAt <= now) return { ok: false, refusal: 'EVENT_STARTED' };
  // withdrawn, or already decided (e.g. in another tab) meanwhile
  if (state.requestStatuses.some((status) => status !== 'pending')) {
    return { ok: false, refusal: 'NOT_PENDING' };
  }
  if (
    decision === 'approve' &&
    state.approvedCount + state.requestStatuses.length > state.maxParticipants
  ) {
    return { ok: false, refusal: 'EVENT_FULL' };
  }
  return { ok: true };
}
