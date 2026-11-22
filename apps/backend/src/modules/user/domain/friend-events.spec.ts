import { Prisma } from '@/generated/prisma/client';
import { eventNotOverWhere } from '@/modules/event/domain/event-over';
import { friendUpcomingEventsWhere } from './friend-events';

const now = new Date('2026-11-19T10:00:00.000Z');
const [when, theirs, visible] = friendUpcomingEventsWhere(
  'friend',
  'viewer',
  now,
).AND as Prisma.EventWhereInput[];

describe('friendUpcomingEventsWhere („Kam jde“, #307)', () => {
  it('published events that are not over yet: never cancelled, hidden or deleted', () => {
    expect(when).toEqual({ status: 'published', ...eventNotOverWhere(now) });
  });

  it('where the friend has an approved place or which they organize', () => {
    expect(theirs).toEqual({
      OR: [
        { organizerUserId: 'friend' },
        { participations: { some: { userId: 'friend', status: 'approved' } } },
      ],
    });
  });

  // decided 18. 11.: only what the viewer could see themselves
  it('public, or members-only of an active group the viewer is an active member of', () => {
    expect(visible).toEqual({
      OR: [
        { visibility: 'public' },
        {
          visibility: 'members',
          group: {
            status: 'active',
            members: { some: { userId: 'viewer', status: 'active' } },
          },
        },
      ],
    });
  });

  it('never a link-only (private) event', () => {
    expect(JSON.stringify(visible)).not.toContain('private');
  });
});
