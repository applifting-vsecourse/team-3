import { ParticipationStatus } from './participation';

/**
 * What counts as interest in an event (#156): people who have a place and
 * requests waiting for the organizer. A withdrawn, rejected or removed
 * participation doesn't.
 */
export const INTEREST_STATUSES: ParticipationStatus[] = ['approved', 'pending'];

/**
 * The most interest first; equal interest soonest first, then by id, so the
 * cut-off at a limit is stable. `interest` is per event id; an event that
 * isn't in it has none.
 */
export const rankByInterest = <T extends { id: string; startsAt: Date }>(
  events: readonly T[],
  interest: ReadonlyMap<string, number>,
): T[] => {
  const interestIn = (event: T): number => interest.get(event.id) ?? 0;
  return [...events].sort(
    (a, b) =>
      interestIn(b) - interestIn(a) ||
      a.startsAt.getTime() - b.startsAt.getTime() ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
};
