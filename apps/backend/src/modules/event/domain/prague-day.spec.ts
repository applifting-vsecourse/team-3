import { startOfNextPragueDay, startOfPragueDay } from './prague-day';

describe('startOfPragueDay', () => {
  it('summer time: midnight is 22:00 UTC the day before', () => {
    expect(startOfPragueDay('2026-10-24').toISOString()).toBe(
      '2026-10-23T22:00:00.000Z',
    );
  });

  it('winter time: midnight is 23:00 UTC the day before', () => {
    expect(startOfPragueDay('2026-10-26').toISOString()).toBe(
      '2026-10-25T23:00:00.000Z',
    );
  });

  it('day when summer time ends still starts in summer time', () => {
    expect(startOfPragueDay('2026-10-25').toISOString()).toBe(
      '2026-10-24T22:00:00.000Z',
    );
  });

  it('day when summer time starts still starts in winter time', () => {
    expect(startOfPragueDay('2026-03-29').toISOString()).toBe(
      '2026-03-28T23:00:00.000Z',
    );
  });
});

describe('startOfNextPragueDay', () => {
  it('the 25-hour day when summer time ends', () => {
    expect(startOfNextPragueDay('2026-10-25').toISOString()).toBe(
      '2026-10-25T23:00:00.000Z',
    );
  });

  it('crosses month and year boundaries', () => {
    expect(startOfNextPragueDay('2026-10-31').toISOString()).toBe(
      '2026-10-31T23:00:00.000Z',
    );
    expect(startOfNextPragueDay('2026-12-31').toISOString()).toBe(
      '2026-12-31T23:00:00.000Z',
    );
  });

  it('the last day the filter accepts: the next one is in year 10000', () => {
    // was a 500 on GET /api/events?dateTo=9999-12-31
    // midnight of 10000-01-01 in Prague, winter time
    expect(startOfNextPragueDay('9999-12-31').toISOString()).toBe(
      '9999-12-31T23:00:00.000Z',
    );
  });
});

describe('years 0–99', () => {
  it('stay in the first century, not in 1900–1999', () => {
    expect(startOfPragueDay('0099-06-01').getUTCFullYear()).toBe(99);
    expect(startOfNextPragueDay('0001-01-01').getUTCFullYear()).toBe(1);
    expect(startOfPragueDay('0000-06-01').toISOString()).toBe(
      '0000-05-31T23:03:00.000Z',
    );
  });
});
