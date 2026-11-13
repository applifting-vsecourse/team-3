import {
  pragueDayOf,
  pragueWeekendOf,
  startOfNextPragueDay,
  startOfPragueDay,
  startOfPragueDayOf,
} from './prague-day';

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

describe('pragueDayOf', () => {
  it('late evening UTC is already the next day in Prague', () => {
    expect(pragueDayOf(new Date('2026-11-06T23:30:00.000Z'))).toBe(
      '2026-11-07',
    );
    expect(pragueDayOf(new Date('2026-11-06T22:30:00.000Z'))).toBe(
      '2026-11-06',
    );
  });

  it('follows summer time', () => {
    expect(pragueDayOf(new Date('2026-07-01T22:30:00.000Z'))).toBe(
      '2026-07-02',
    );
  });
});

describe('pragueWeekendOf', () => {
  it.each([
    ['Monday', '2026-11-02T10:00:00.000Z', '2026-11-07', '2026-11-08'],
    ['Friday evening', '2026-11-06T20:00:00.000Z', '2026-11-07', '2026-11-08'],
    // 23:30 UTC on Friday is Saturday 0:30 in Prague
    [
      'Saturday just after midnight',
      '2026-11-06T23:30:00.000Z',
      '2026-11-07',
      '2026-11-08',
    ],
    ['Sunday', '2026-11-08T12:00:00.000Z', '2026-11-08', '2026-11-08'],
    [
      'a weekend across months',
      '2026-10-29T12:00:00.000Z',
      '2026-10-31',
      '2026-11-01',
    ],
  ])('%s → %s to %s', (_, now, dateFrom, dateTo) => {
    expect(pragueWeekendOf(new Date(now))).toEqual({ dateFrom, dateTo });
  });
});

describe('pragueDayOf / startOfPragueDayOf', () => {
  it('after midnight in Prague it is already the next day, though UTC still says the old one', () => {
    // 23:30 UTC on 7 Nov = 00:30 on 8 Nov in Prague (winter time)
    const instant = new Date('2026-11-07T23:30:00.000Z');
    expect(pragueDayOf(instant)).toBe('2026-11-08');
    expect(startOfPragueDayOf(instant).toISOString()).toBe(
      '2026-11-07T23:00:00.000Z',
    );
  });

  it('in summer time the day starts two hours before UTC midnight', () => {
    expect(
      startOfPragueDayOf(new Date('2026-07-15T12:00:00.000Z')).toISOString(),
    ).toBe('2026-07-14T22:00:00.000Z');
  });
});

describe('startOfPragueDay with days later (#66)', () => {
  it('counts calendar days across the change of time', () => {
    // 20. 10. is summer time (UTC+2), 4. 11. winter time (UTC+1)
    expect(startOfPragueDay('2026-10-20', 15)).toEqual(
      new Date('2026-11-03T23:00:00.000Z'),
    );
    expect(startOfPragueDay('2026-10-20', 1)).toEqual(
      startOfNextPragueDay('2026-10-20'),
    );
    expect(startOfPragueDay('2026-10-20', 0)).toEqual(
      startOfPragueDay('2026-10-20'),
    );
  });
});
