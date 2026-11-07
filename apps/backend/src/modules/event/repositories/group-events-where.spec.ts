import { buildGroupEventsWhere } from './group-events-where';

const now = new Date('2026-10-23T08:00:00.000Z');

describe('buildGroupEventsWhere (B-055)', () => {
  it("upcoming: the group's published events still ahead", () => {
    expect(
      buildGroupEventsWhere(
        'g1',
        'upcoming',
        { includeMembersOnly: true },
        now,
      ),
    ).toEqual({
      AND: [
        { groupId: 'g1', status: 'published' },
        { startsAt: { gt: now } },
        {},
      ],
    });
  });

  it('past: the published events that have started', () => {
    expect(
      buildGroupEventsWhere('g1', 'past', { includeMembersOnly: true }, now),
    ).toEqual({
      AND: [
        { groupId: 'g1', status: 'published' },
        { startsAt: { lte: now } },
        {},
      ],
    });
  });

  it.each(['upcoming', 'past'] as const)(
    '%s: members-only events stay out for anyone outside the group',
    (when) => {
      const [, , visibility] = buildGroupEventsWhere(
        'g1',
        when,
        { includeMembersOnly: false },
        now,
      ).AND as object[];
      expect(visibility).toEqual({ visibility: { not: 'members' } });
    },
  );
});
