import { Prisma } from '@/generated/prisma/client';
import { GroupFilters } from '@/modules/group/domain/group';
import { buildActiveGroupsWhere } from './active-groups-where';

const ACTIVE_ONLY: Prisma.GroupWhereInput = { status: 'active' };

const conditionsOf = (filters: GroupFilters): Prisma.GroupWhereInput[] =>
  buildActiveGroupsWhere(filters).AND as Prisma.GroupWhereInput[];

describe('buildActiveGroupsWhere', () => {
  it('without filters returns active groups of both types', () => {
    expect(buildActiveGroupsWhere({})).toEqual({ AND: [ACTIVE_ONLY] });
    expect(JSON.stringify(buildActiveGroupsWhere({}))).not.toMatch(/"type"/);
  });

  it.each<[string, GroupFilters]>([
    ['locality', { localityId: 'l-praha' }],
    ['activity', { activityIds: ['a-florbal'] }],
    ['category', { categoryIds: ['c-hry'] }],
    [
      'all filters',
      {
        localityId: 'l-praha-9',
        activityIds: ['a-florbal'],
        categoryIds: ['c-hry'],
      },
    ],
  ])('keeps deactivated groups out with a %s filter', (_, filters) => {
    const conditions = conditionsOf(filters);
    expect(conditions[0]).toEqual(ACTIVE_ONLY);
    // no other condition touches status, even nested in an OR, so none can loosen it
    expect(JSON.stringify(conditions.slice(1))).not.toMatch(/"status"/);
  });

  it('a city includes its districts', () => {
    expect(conditionsOf({ localityId: 'l-praha' })).toEqual([
      ACTIVE_ONLY,
      {
        OR: [{ localityId: 'l-praha' }, { locality: { parentId: 'l-praha' } }],
      },
    ]);
  });

  it('activities and whole categories add up', () => {
    expect(
      conditionsOf({ activityIds: ['a-florbal'], categoryIds: ['c-hry'] }),
    ).toEqual([
      ACTIVE_ONLY,
      {
        OR: [
          { activityId: { in: ['a-florbal'] } },
          { activity: { categoryId: { in: ['c-hry'] } } },
        ],
      },
    ]);
  });

  it('empty id lists add no condition', () => {
    expect(conditionsOf({ activityIds: [], categoryIds: [] })).toEqual([
      ACTIVE_ONLY,
    ]);
  });
});
