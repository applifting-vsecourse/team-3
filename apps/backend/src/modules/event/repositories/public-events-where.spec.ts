import { Prisma } from '@/generated/prisma/client';
import { PublicEventFilters } from '@/modules/event/domain/event';
import { buildPublicEventsWhere } from './public-events-where';

const now = new Date('2026-10-23T08:00:00.000Z');

const VISIBLE_ONLY: Prisma.EventWhereInput = {
  status: 'published',
  visibility: 'public',
  startsAt: { gt: now },
};

const conditionsOf = (filters: PublicEventFilters): Prisma.EventWhereInput[] =>
  buildPublicEventsWhere(filters, now).AND as Prisma.EventWhereInput[];

describe('buildPublicEventsWhere', () => {
  it('without filters returns only published, public, upcoming events', () => {
    expect(buildPublicEventsWhere({}, now)).toEqual({ AND: [VISIBLE_ONLY] });
  });

  // Past (startsAt <= now), cancelled / hidden / deleted (status), private and
  // members-only (visibility) events are excluded under every combination.
  it.each<[string, PublicEventFilters]>([
    ['locality', { localityId: 'l-praha' }],
    ['date range', { dateFrom: '2026-10-01', dateTo: '2026-10-30' }],
    ['activity', { activityIds: ['a-volejbal'] }],
    ['category', { categoryIds: ['c-hry'] }],
    [
      'all filters',
      {
        localityId: 'l-praha-8',
        dateFrom: '2026-10-24',
        dateTo: '2026-10-25',
        activityIds: ['a-volejbal'],
        categoryIds: ['c-hry'],
        capacity: 'missing',
      },
    ],
  ])('keeps the visibility rule with a %s filter', (_, filters) => {
    const conditions = conditionsOf(filters);
    expect(conditions[0]).toEqual(VISIBLE_ONLY);
    // no other condition touches status or visibility, even nested in an OR,
    // so none can loosen them
    const rest = JSON.stringify(conditions.slice(1));
    expect(rest).not.toMatch(/"(status|visibility)"/);
  });

  it('a date from the past does not bring back events that already started', () => {
    expect(conditionsOf({ dateFrom: '2026-10-01' })).toEqual([
      VISIBLE_ONLY,
      { startsAt: { gte: new Date('2026-09-30T22:00:00.000Z') } },
    ]);
  });

  it('dateFrom and dateTo are whole Prague days, both inclusive', () => {
    // Sat 24. 10. (summer time) to Sun 25. 10. (summer time ends that night)
    expect(
      conditionsOf({ dateFrom: '2026-10-24', dateTo: '2026-10-25' }),
    ).toEqual([
      VISIBLE_ONLY,
      { startsAt: { gte: new Date('2026-10-23T22:00:00.000Z') } },
      { startsAt: { lt: new Date('2026-10-25T23:00:00.000Z') } },
    ]);
  });

  it('a locality matches itself and its districts', () => {
    expect(conditionsOf({ localityId: 'l-praha' })).toContainEqual({
      OR: [{ localityId: 'l-praha' }, { locality: { parentId: 'l-praha' } }],
    });
  });

  it('activities and categories add up (OR)', () => {
    expect(
      conditionsOf({ activityIds: ['a1', 'a2'], categoryIds: ['c1'] }),
    ).toEqual([
      VISIBLE_ONLY,
      {
        OR: [
          { activityId: { in: ['a1', 'a2'] } },
          { activity: { categoryId: { in: ['c1'] } } },
        ],
      },
    ]);
  });

  it('a category filters by categoryId, so activities added later match too', () => {
    expect(conditionsOf({ categoryIds: ['c1'] })).toEqual([
      VISIBLE_ONLY,
      { OR: [{ activity: { categoryId: { in: ['c1'] } } }] },
    ]);
  });

  it('empty activity and category lists do not filter', () => {
    expect(conditionsOf({ activityIds: [], categoryIds: [] })).toEqual([
      VISIBLE_ONLY,
    ]);
  });

  it('capacity is not part of the query (the service applies it)', () => {
    expect(conditionsOf({ capacity: 'free' })).toEqual([VISIBLE_ONLY]);
    expect(conditionsOf({ capacity: 'missing' })).toEqual([VISIBLE_ONLY]);
  });
});
