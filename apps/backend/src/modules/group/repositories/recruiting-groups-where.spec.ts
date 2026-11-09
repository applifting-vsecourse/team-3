import { buildActiveGroupsWhere } from './active-groups-where';
import { buildRecruitingGroupsWhere } from './recruiting-groups-where';

const now = new Date('2026-11-07T10:00:00.000Z');

describe('buildRecruitingGroupsWhere', () => {
  it('a visitor: active groups of both types with an upcoming published event', () => {
    const where = buildRecruitingGroupsWhere({ viewerId: null }, now);

    expect(where).toEqual({
      AND: [
        buildActiveGroupsWhere({}),
        {
          events: {
            some: { status: 'published', startsAt: { gt: now } },
          },
        },
      ],
    });
    // closed groups are asked to join, so they belong here too
    expect(JSON.stringify(where)).not.toMatch(/"type"/);
    // a members-only event still means the group meets
    expect(JSON.stringify(where)).not.toMatch(/"visibility"/);
  });

  it('the locality works like on /skupiny: a city with its districts', () => {
    const where = buildRecruitingGroupsWhere(
      { localityId: 'l-praha', viewerId: null },
      now,
    );

    expect((where.AND as unknown[])[0]).toEqual(
      buildActiveGroupsWhere({ localityId: 'l-praha' }),
    );
  });

  it('a signed-in viewer gets no group they are in, waiting for or blocked in', () => {
    const where = buildRecruitingGroupsWhere({ viewerId: 'u1' }, now);

    expect(where.AND).toContainEqual({
      members: { none: { userId: 'u1' } },
    });
  });
});
