import { capacityChangeProblem } from './capacity';
import { EventChanges } from './event';
import { LAST_STORABLE_TIME } from './event-dates';

/** Why the organizer's change was refused (B-028, #41). */
export type UpdateRefusal =
  | { code: 'EVENT_CANCELLED' }
  | { code: 'EVENT_STARTED' }
  | { code: 'INVALID_CAPACITY'; problem: string }
  | { code: 'INVALID_END'; problem: string };

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
  { ok: true; data: EventChanges } | { ok: false; refusal: UpdateRefusal };

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
 * minimum nor below the approved. An end the organizer sends (null clears it)
 * must come after the start. Moving only the start moves the end with it,
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
  if (changes.endsAt !== undefined) {
    const startsAt = changes.startsAt ?? state.startsAt;
    if (changes.endsAt && changes.endsAt <= startsAt) {
      return {
        ok: false,
        refusal: { code: 'INVALID_END', problem: 'Konec musí být po začátku.' },
      };
    }
    return { ok: true, data: changes };
  }
  if (!changes.startsAt || !state.endsAt) return { ok: true, data: changes };
  const duration = state.endsAt.getTime() - state.startsAt.getTime();
  const endsAt = new Date(changes.startsAt.getTime() + duration);
  // the DTO checks only the dates that were sent, not the end moved here
  if (endsAt.getTime() > LAST_STORABLE_TIME) {
    return {
      ok: false,
      refusal: {
        code: 'INVALID_END',
        problem: 'Konec akce by vyšel příliš daleko v budoucnosti.',
      },
    };
  }
  return { ok: true, data: { ...changes, endsAt } };
}
