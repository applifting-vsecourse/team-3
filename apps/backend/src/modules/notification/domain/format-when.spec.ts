import { formatRange, formatWhen } from './format-when';

describe('formatWhen', () => {
  it('is Prague time in summer (CEST)', () => {
    expect(formatWhen(new Date('2026-10-24T16:00:00.000Z'))).toBe(
      'so 24. 10. 2026 v 18:00',
    );
  });

  it('is Prague time in winter (CET)', () => {
    expect(formatWhen(new Date('2026-12-05T17:30:00.000Z'))).toBe(
      'so 5. 12. 2026 v 18:30',
    );
  });

  it('writes the hour after midnight as 00, not 24', () => {
    // 22:30 UTC is 00:30 the next day in Prague, still on summer time
    expect(formatWhen(new Date('2026-10-24T22:30:00.000Z'))).toBe(
      'ne 25. 10. 2026 v 00:30',
    );
  });
});

describe('formatRange', () => {
  const start = new Date('2026-10-24T16:00:00.000Z');

  it('is only the start without an end', () => {
    expect(formatRange(start, null)).toBe('so 24. 10. 2026 v 18:00');
  });

  it('adds just the end time on the same day', () => {
    expect(formatRange(start, new Date('2026-10-24T18:00:00.000Z'))).toBe(
      'so 24. 10. 2026 v 18:00 až 20:00',
    );
  });

  it('adds the whole end when it falls on another day in Prague', () => {
    // 23:30 UTC is already the next day in Prague
    expect(formatRange(start, new Date('2026-10-24T23:30:00.000Z'))).toBe(
      'so 24. 10. 2026 v 18:00 až ne 25. 10. 2026 v 01:30',
    );
  });
});
