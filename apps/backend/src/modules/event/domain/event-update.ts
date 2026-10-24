import { capacityChangeProblem } from './capacity';
import { EventChanges } from './event';

/** Why the organizer's change was refused (B-028, #41). */
export type UpdateRefusal =
  | { code: 'EVENT_CANCELLED' }
  | { code: 'EVENT_STARTED' }
  | { code: 'INVALID_CAPACITY'; problem: string };

/** The stored event as a change sees it, read under the event's lock. */
export type UpdateState = {
  status: 'published' | 'cancelled' | 'hidden' | 'deleted';
  startsAt: Date;
  endsAt: Date | null;
  minParticipants: number;
  maxParticipants: number;
  approvedCount: number;
};

export type UpdateDecision =
  | { ok: true; data: EventChanges & { endsAt?: Date } }
  | { ok: false; refusal: UpdateRefusal };

/** A cancelled or started event can't change any more; null while it can. */
export const lifecycleRefusal = (
  event: Pick<UpdateState, 'status' | 'startsAt'>,
  now: Date,
): UpdateRefusal | null => {
  if (event.status === 'cancelled') return { code: 'EVENT_CANCELLED' };
  if (event.startsAt <= now) return { code: 'EVENT_STARTED' };
  return null;
};

/**
 * Whether the organizer's changes may be written, and what to write (B-028):
 * not to a cancelled or started event, and the maximum neither below the
 * minimum nor below the approved. Moving the start moves the end with it,
 * keeping the duration, or a moved event could end before it starts.
 * The caller runs it under the event's lock, so the state is current.
 */
export function decideUpdate(
  state: UpdateState,
  changes: EventChanges,
  now: Date,
): UpdateDecision {
  const refusal = lifecycleRefusal(state, now);
  if (refusal) return { ok: false, refusal };
  const problem = capacityChangeProblem(state, changes);
  if (problem) {
    return { ok: false, refusal: { code: 'INVALID_CAPACITY', problem } };
  }
  if (!changes.startsAt || !state.endsAt) return { ok: true, data: changes };
  const duration = state.endsAt.getTime() - state.startsAt.getTime();
  return {
    ok: true,
    data: {
      ...changes,
      endsAt: new Date(changes.startsAt.getTime() + duration),
    },
  };
}
