import {
  eventNotOverWhere,
  eventOverWhere,
} from '@/modules/event/domain/event-over';
import { buildGroupEventsWhere } from './group-events-where';

const now = new Date('2026-10-23T08:00:00.000Z');

const MEMBER_VISIBILITY = { visibility: { in: ['public', 'members'] } };

describe('buildGroupEventsWhere (B-055)', () => {
  it("upcoming: the group's published events not over yet, also one going on now (#272)", () => {
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
        eventNotOverWhere(now),
        MEMBER_VISIBILITY,
      ],
    });
  });

  it('past: the published events that are over, as on their detail (#272)', () => {
    expect(
      buildGroupEventsWhere('g1', 'past', { includeMembersOnly: true }, now),
    ).toEqual({
      AND: [
        { groupId: 'g1', status: 'published' },
        eventOverWhere(now),
        MEMBER_VISIBILITY,
      ],
    });
  });

  // An allowlist, as the public list (review #264): a private event that got
  // into a group would show nowhere, not on the group's public page.
  it.each(['upcoming', 'past'] as const)(
    '%s: only public events for anyone outside the group',
    (when) => {
      const [, , visibility] = buildGroupEventsWhere(
        'g1',
        when,
        { includeMembersOnly: false },
        now,
      ).AND as object[];
      expect(visibility).toEqual({ visibility: 'public' });
    },
  );
});
