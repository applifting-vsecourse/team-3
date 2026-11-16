import {
  eventNotOverWhere,
  eventOverAt,
  eventOverWhere,
  isEventOver,
} from './event-over';

// 18:00 in Prague on Friday 23. 10. 2026 (summer time, UTC+2), no end
const evening = {
  startsAt: new Date('2026-10-23T16:00:00.000Z'),
  endsAt: null,
};

/** Evaluates the two-branch `where` of event-over.ts against one event. */
const matches = (
  where: ReturnType<typeof eventOverWhere>,
  event: { startsAt: Date; endsAt: Date | null },
): boolean =>
  (where.OR as Record<string, unknown>[]).some((branch) =>
    Object.entries(branch).every(([field, condition]) => {
      const value = event[field as 'startsAt' | 'endsAt'];
      if (condition === null) return value === null;
      if (value === null) return false;
      const [op, bound] = Object.entries(condition as object)[0] as [
        string,
        Date,
      ];
      const v = value.getTime();
      const b = bound.getTime();
      return op === 'lt'
        ? v < b
        : op === 'lte'
          ? v <= b
          : op === 'gt'
            ? v > b
            : v >= b;
    }),
  );

describe('isEventOver (#272)', () => {
  it('without an end: still going during its day, over after Prague midnight', () => {
    expect(isEventOver(evening, new Date('2026-10-23T16:05:00.000Z'))).toBe(
      false,
    );
    expect(isEventOver(evening, new Date('2026-10-23T21:59:59.999Z'))).toBe(
      false,
    );
    // 00:00 on Saturday in Prague
    expect(isEventOver(evening, new Date('2026-10-23T22:00:00.000Z'))).toBe(
      true,
    );
  });

  it('without an end: Prague midnight also after the change of time (25. 10.)', () => {
    // 20:00 on Sunday 25. 10., the first evening of winter time (UTC+1)
    const sunday = {
      startsAt: new Date('2026-10-25T19:00:00.000Z'),
      endsAt: null,
    };
    expect(eventOverAt(sunday)).toEqual(new Date('2026-10-25T23:00:00.000Z'));
  });

  it('with an end: over at the end, not before', () => {
    const event = {
      startsAt: evening.startsAt,
      endsAt: new Date('2026-10-23T18:00:00.000Z'),
    };
    expect(isEventOver(event, new Date('2026-10-23T17:59:59.999Z'))).toBe(
      false,
    );
    expect(isEventOver(event, event.endsAt)).toBe(true);
  });
});

describe('eventOverWhere / eventNotOverWhere (#272)', () => {
  const events = [
    evening,
    // starts at Prague midnight, no end
    { startsAt: new Date('2026-10-22T22:00:00.000Z'), endsAt: null },
    // yesterday, no end
    { startsAt: new Date('2026-10-22T16:00:00.000Z'), endsAt: null },
    // tomorrow, no end
    { startsAt: new Date('2026-10-24T08:00:00.000Z'), endsAt: null },
    // with an end today, already ended / still going
    {
      startsAt: new Date('2026-10-23T06:00:00.000Z'),
      endsAt: new Date('2026-10-23T08:00:00.000Z'),
    },
    {
      startsAt: new Date('2026-10-22T06:00:00.000Z'),
      endsAt: new Date('2026-10-23T20:00:00.000Z'),
    },
  ];
  const moments = [
    new Date('2026-10-23T16:05:00.000Z'), // 18:05 in Prague
    new Date('2026-10-23T21:59:00.000Z'), // 23:59
    new Date('2026-10-23T22:00:00.000Z'), // midnight
    new Date('2026-10-23T22:30:00.000Z'), // half past midnight
    new Date('2026-10-23T08:00:00.000Z'), // the end of one of them
  ];

  it.each(moments)(
    'match isEventOver at %s, each event in one of them',
    (now) => {
      for (const event of events) {
        expect(matches(eventOverWhere(now), event)).toBe(
          isEventOver(event, now),
        );
        expect(matches(eventNotOverWhere(now), event)).toBe(
          !isEventOver(event, now),
        );
      }
    },
  );
});
