import { Prisma } from '@/generated/prisma/client';
import { NO_NEW_REQUEST_STATUSES } from '@/modules/event/domain/participation';
import { buildMyEventsWhere } from './my-events-where';

const now = new Date('2026-10-23T08:00:00.000Z');

const UPCOMING_NOT_HIDDEN: Prisma.EventWhereInput = {
  status: { in: ['published', 'cancelled'] },
  startsAt: { gt: now },
};

describe('buildMyEventsWhere', () => {
  it('attending: events where the user has a place or a waiting request', () => {
    expect(buildMyEventsWhere('attending', 'u1', now)).toEqual({
      AND: [
        UPCOMING_NOT_HIDDEN,
        {
          participations: {
            some: { userId: 'u1', status: { in: ['approved', 'pending'] } },
          },
        },
      ],
    });
  });

  it('organizing: events the user created, whether they joined them or not, and the events of groups they are an active admin of', () => {
    expect(buildMyEventsWhere('organizing', 'u1', now)).toEqual({
      AND: [
        UPCOMING_NOT_HIDDEN,
        {
          OR: [
            { organizerUserId: 'u1' },
            {
              group: {
                members: {
                  some: { userId: 'u1', role: 'admin', status: 'active' },
                },
              },
            },
          ],
        },
      ],
    });
  });

  // Past events are Proběhlé (#61); hidden and deleted never leave the API;
  // a withdrawn, rejected or removed participation doesn't put the event in Přihlášen.
  it.each(['attending', 'organizing'] as const)(
    '%s keeps only upcoming published or cancelled events',
    (tab) => {
      const [visibility] = buildMyEventsWhere(tab, 'u1', now)
        .AND as Prisma.EventWhereInput[];
      expect(visibility).toEqual(UPCOMING_NOT_HIDDEN);
    },
  );
});

describe('buildMyEventsWhere › groups (Z mých skupin, #304)', () => {
  const [when, open, mine, notGoing] = buildMyEventsWhere('groups', 'u1', now)
    .AND as Prisma.EventWhereInput[];

  it('upcoming published events only: nothing to go to in a cancelled one', () => {
    expect(when).toEqual({ status: 'published', startsAt: { gt: now } });
  });

  it('public and members-only, never link-only', () => {
    expect(open).toEqual({ visibility: { in: ['public', 'members'] } });
  });

  it("of the active groups I am an active member of; a group I run is Pořádám's", () => {
    expect(mine).toEqual({
      group: {
        status: 'active',
        members: { some: { userId: 'u1', role: 'member', status: 'active' } },
      },
    });
  });

  it('only events I can still ask to join: no place, no request, not rejected or removed', () => {
    expect(notGoing).toEqual({
      participations: {
        none: { userId: 'u1', status: { in: NO_NEW_REQUEST_STATUSES } },
      },
    });
    expect(NO_NEW_REQUEST_STATUSES).toEqual(
      expect.arrayContaining(['approved', 'pending', 'rejected', 'removed']),
    );
  });
});
