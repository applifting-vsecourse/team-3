import { Prisma } from '@/generated/prisma/client';
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

  it('organizing: events the user created, whether they joined them or not', () => {
    expect(buildMyEventsWhere('organizing', 'u1', now)).toEqual({
      AND: [UPCOMING_NOT_HIDDEN, { organizerUserId: 'u1' }],
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
