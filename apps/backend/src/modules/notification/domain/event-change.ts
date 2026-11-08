import { EventChange } from './notification';

/** What of an event matters for „has the time or the place changed“. */
export type EventSnapshot = {
  startsAt: Date;
  endsAt: Date | null;
  address: string;
  lat: number;
  lng: number;
  locality: { id: string };
};

const sameMoment = (a: Date | null, b: Date | null): boolean =>
  a === null || b === null ? a === b : a.getTime() === b.getTime();

/**
 * What changed of the time and the place between two states of an event, or
 * null when neither did: a new title or a higher maximum is nobody's news.
 * Pure, so it is tested without a database.
 */
export const summarizeChange = (
  before: EventSnapshot,
  after: EventSnapshot,
): EventChange | null => {
  const whenChanged =
    !sameMoment(before.startsAt, after.startsAt) ||
    !sameMoment(before.endsAt, after.endsAt);
  const placeChanged =
    before.address !== after.address ||
    before.locality.id !== after.locality.id ||
    before.lat !== after.lat ||
    before.lng !== after.lng;
  if (!whenChanged && !placeChanged) return null;
  return {
    when: whenChanged
      ? {
          from: { startsAt: before.startsAt, endsAt: before.endsAt },
          to: { startsAt: after.startsAt, endsAt: after.endsAt },
        }
      : null,
    place: placeChanged ? { from: before.address, to: after.address } : null,
  };
};
