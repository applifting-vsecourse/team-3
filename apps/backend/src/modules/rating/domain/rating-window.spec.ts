import {
  isWithinRatingWindow,
  RATING_WINDOW_DAYS,
  ratingDeadline,
} from './rating-window';

const startsAt = new Date('2026-11-01T17:00:00.000Z');
const endsAt = new Date('2026-11-01T19:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('rating window (B-060)', () => {
  it('lasts 14 days', () => {
    expect(RATING_WINDOW_DAYS).toBe(14);
  });

  it('counts from the end, or from the start without an end', () => {
    expect(ratingDeadline({ startsAt, endsAt })).toEqual(
      new Date('2026-11-15T19:00:00.000Z'),
    );
    expect(ratingDeadline({ startsAt, endsAt: null })).toEqual(
      new Date('2026-11-15T17:00:00.000Z'),
    );
  });

  it('day 14 still passes, a moment later is too late', () => {
    const event = { startsAt, endsAt };
    expect(
      isWithinRatingWindow(event, new Date(endsAt.getTime() + 13 * DAY_MS)),
    ).toBe(true);
    expect(
      isWithinRatingWindow(event, new Date(endsAt.getTime() + 14 * DAY_MS)),
    ).toBe(true);
    expect(
      isWithinRatingWindow(event, new Date(endsAt.getTime() + 14 * DAY_MS + 1)),
    ).toBe(false);
  });
});
