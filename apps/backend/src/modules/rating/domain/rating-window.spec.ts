import {
  isWithinRatingWindow,
  pragueEndDay,
  RATING_WINDOW_DAYS,
  ratingDeadline,
} from './rating-window';

const HOUR_MS = 60 * 60 * 1000;

describe('rating window (B-060, review #313)', () => {
  it('lasts 14 calendar days', () => {
    expect(RATING_WINDOW_DAYS).toBe(14);
  });

  it('ends with the 14th Prague day after the day the event ended', () => {
    // Sun 1. 11. 19:00 – 21:00 in Prague (winter time, UTC+1)
    const startsAt = new Date('2026-11-01T18:00:00.000Z');
    const endsAt = new Date('2026-11-01T20:00:00.000Z');
    // until Sun 15. 11., 23:59:59.999 in Prague
    expect(ratingDeadline({ startsAt, endsAt })).toEqual(
      new Date('2026-11-15T22:59:59.999Z'),
    );
    // without an end, from the day it started
    expect(ratingDeadline({ startsAt, endsAt: null })).toEqual(
      new Date('2026-11-15T22:59:59.999Z'),
    );
  });

  it('counts the day in Prague, not in UTC: an end just after midnight in Prague', () => {
    // Mon 2. 11. 00:30 in Prague is still Sun 1. 11. in UTC
    const endsAt = new Date('2026-11-01T23:30:00.000Z');
    expect(ratingDeadline({ startsAt: endsAt, endsAt })).toEqual(
      new Date('2026-11-16T22:59:59.999Z'),
    );
  });

  it('across the change of time (end of October): calendar days, not 14 × 24 h', () => {
    // Tue 20. 10. 20:00 in Prague, summer time (UTC+2); the clocks go back on 25. 10.
    const endsAt = new Date('2026-10-20T18:00:00.000Z');
    const deadline = ratingDeadline({ startsAt: endsAt, endsAt });
    // until Tue 3. 11., 23:59:59.999 in Prague, now winter time (UTC+1)
    expect(deadline).toEqual(new Date('2026-11-03T22:59:59.999Z'));
    // 14 × 24 h would have closed at 19:00 that day – the evening still counts
    const fourteenTimes24h = new Date(endsAt.getTime() + 14 * 24 * HOUR_MS);
    expect(
      isWithinRatingWindow({ startsAt: endsAt, endsAt }, fourteenTimes24h),
    ).toBe(true);
    expect(
      isWithinRatingWindow(
        { startsAt: endsAt, endsAt },
        new Date('2026-11-03T22:30:00.000Z'),
      ),
    ).toBe(true);
  });

  it('on the night the clocks go back too', () => {
    // Sun 25. 10. 02:30 in Prague, after the clocks went back (UTC+1)
    const endsAt = new Date('2026-10-25T01:30:00.000Z');
    expect(ratingDeadline({ startsAt: endsAt, endsAt })).toEqual(
      new Date('2026-11-08T22:59:59.999Z'),
    );
  });

  it('day 14 still passes until its last moment, the next day is too late', () => {
    const endsAt = new Date('2026-11-01T20:00:00.000Z');
    const event = { startsAt: endsAt, endsAt };
    expect(
      isWithinRatingWindow(event, new Date('2026-11-15T08:00:00.000Z')),
    ).toBe(true);
    expect(
      isWithinRatingWindow(event, new Date('2026-11-15T22:59:59.999Z')),
    ).toBe(true);
    expect(
      isWithinRatingWindow(event, new Date('2026-11-15T23:00:00.000Z')),
    ).toBe(false);
  });

  it('an end exactly at Prague midnight belongs to the day before (review #314)', () => {
    // Mon 19. 10. 19:00 – Tue 20. 10. 00:00 in Prague (summer time, UTC+2)
    const startsAt = new Date('2026-10-19T17:00:00.000Z');
    const endsAt = new Date('2026-10-19T22:00:00.000Z');
    expect(pragueEndDay({ startsAt, endsAt })).toBe('2026-10-19');
    // until Mon 2. 11., 23:59:59.999 in Prague (winter time), not Tue 3. 11.
    expect(ratingDeadline({ startsAt, endsAt })).toEqual(
      new Date('2026-11-02T22:59:59.999Z'),
    );
    // a minute later it ended on the 20th
    expect(
      pragueEndDay({ startsAt, endsAt: new Date(endsAt.getTime() + 60_000) }),
    ).toBe('2026-10-20');
  });

  it('an event without an end that starts at midnight counts from that day', () => {
    const startsAt = new Date('2026-10-19T22:00:00.000Z');
    expect(pragueEndDay({ startsAt, endsAt: null })).toBe('2026-10-20');
  });
});
