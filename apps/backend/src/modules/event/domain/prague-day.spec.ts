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
});
