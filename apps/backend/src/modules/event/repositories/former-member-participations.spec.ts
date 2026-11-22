import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import {
  formerMemberEventsWhere,
  withdrawFromMembersOnlyEvents,
} from './former-member-participations';

const now = new Date('2026-11-19T10:00:00.000Z');
const tomorrow = new Date('2026-11-20T17:00:00.000Z');
const yesterday = new Date('2026-11-18T17:00:00.000Z');

type EventRow = {
  groupId: string;
  visibility: 'public' | 'private' | 'members';
  startsAt: Date;
  organizerUserId: string;
  participations: { userId: string; status: string }[];
};

/** The where above, read for one event – the fields it uses, nothing more. */
const matches = (event: EventRow): boolean => {
  const where = formerMemberEventsWhere('g1', 'u-jakub', now) as {
    groupId: string;
    visibility: string;
    startsAt: { gt: Date };
    organizerUserId: { not: string };
    participations: { some: { userId: string; status: { in: string[] } } };
  };
  const held = where.participations.some;
  return (
    event.groupId === where.groupId &&
    event.visibility === where.visibility &&
    event.startsAt > where.startsAt.gt &&
    event.organizerUserId !== where.organizerUserId.not &&
    event.participations.some(
      (p) => p.userId === held.userId && held.status.in.includes(p.status),
    )
  );
};

const aMembersOnlyEvent = (overrides: Partial<EventRow> = {}): EventRow => ({
  groupId: 'g1',
  visibility: 'members',
  startsAt: tomorrow,
  organizerUserId: 'u-petra',
  participations: [{ userId: 'u-jakub', status: 'approved' }],
  ...overrides,
});

describe('formerMemberEventsWhere (#266)', () => {
  it("is the group's upcoming members-only events where the user has a place or a request, not their own", () => {
    expect(formerMemberEventsWhere('g1', 'u-jakub', now)).toEqual({
      groupId: 'g1',
      visibility: 'members',
      startsAt: { gt: now },
      organizerUserId: { not: 'u-jakub' },
      participations: {
        some: { userId: 'u-jakub', status: { in: ['approved', 'pending'] } },
      },
    });
  });

  it.each([
    ['an approved place on an upcoming members-only event', {}, true],
    [
      'a waiting request on it',
      { participations: [{ userId: 'u-jakub', status: 'pending' }] },
      true,
    ],
    ['a public event of the group stays', { visibility: 'public' }, false],
    [
      'a private event of the group (link only) stays',
      { visibility: 'private' as const },
      false,
    ],
    ['a past event stays – history and rating', { startsAt: yesterday }, false],
    ['one starting right now stays', { startsAt: now }, false],
    [
      'their own event stays: the organizer still runs it',
      { organizerUserId: 'u-jakub' },
      false,
    ],
    ['an event of another group stays', { groupId: 'g2' }, false],
    [
      'a request the organizer rejected stays rejected',
      { participations: [{ userId: 'u-jakub', status: 'rejected' }] },
      false,
    ],
    [
      "someone else's place stays",
      { participations: [{ userId: 'u-eva', status: 'approved' }] },
      false,
    ],
  ] as const)('%s', (_case, overrides, withdrawn) => {
    expect(matches(aMembersOnlyEvent(overrides as Partial<EventRow>))).toBe(
      withdrawn,
    );
  });
});

describe('withdrawFromMembersOnlyEvents (#266)', () => {
  it('locks the events as joining does, then withdraws the places and requests', async () => {
    const tx = mockDeep<PrismaService>();
    tx.event.findMany.mockResolvedValue([
      { id: 'e1', status: 'published' },
      { id: 'e2', status: 'published' },
    ] as never);
    tx.participation.findMany.mockResolvedValue([]);

    await withdrawFromMembersOnlyEvents(tx, 'g1', 'u-jakub', now);

    expect(tx.event.findMany).toHaveBeenCalledWith({
      where: formerMemberEventsWhere('g1', 'u-jakub', now),
      select: { id: true, status: true },
      orderBy: { id: 'asc' },
    });
    expect(tx.participation.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'u-jakub',
        eventId: { in: ['e1', 'e2'] },
        status: { in: ['approved', 'pending'] },
      },
      // the place is free again, as on leaving the event
      data: { status: 'withdrawn', approvedAt: null },
    });
    expect(tx.$executeRaw.mock.invocationCallOrder[0]!).toBeLessThan(
      tx.participation.updateMany.mock.invocationCallOrder[0]!,
    );
  });

  it('returns the events where an approved place was freed, read under the lock (#398)', async () => {
    const tx = mockDeep<PrismaService>();
    tx.event.findMany.mockResolvedValue([
      { id: 'e1', status: 'published' },
      { id: 'e2', status: 'published' },
      { id: 'e3', status: 'cancelled' },
      { id: 'e4', status: 'hidden' },
    ] as never);
    // e2 is only a waiting request: withdrawing it tells nobody
    tx.participation.findMany.mockResolvedValue([
      { eventId: 'e1' },
      { eventId: 'e3' },
      { eventId: 'e4' },
    ] as never);

    await expect(
      withdrawFromMembersOnlyEvents(tx, 'g1', 'u-jakub', now),
    ).resolves.toEqual(
      // a cancelled one can be left too; a hidden one has no page to leave from
      ['e1', 'e3'],
    );
    expect(tx.participation.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'u-jakub',
        eventId: { in: ['e1', 'e2', 'e3', 'e4'] },
        status: 'approved',
      },
      select: { eventId: true },
    });
    expect(tx.$executeRaw.mock.invocationCallOrder[0]!).toBeLessThan(
      tx.participation.findMany.mock.invocationCallOrder[0]!,
    );
    expect(tx.participation.findMany.mock.invocationCallOrder[0]!).toBeLessThan(
      tx.participation.updateMany.mock.invocationCallOrder[0]!,
    );
  });

  it('only waiting requests: nobody to tell', async () => {
    const tx = mockDeep<PrismaService>();
    tx.event.findMany.mockResolvedValue([
      { id: 'e1', status: 'published' },
    ] as never);
    tx.participation.findMany.mockResolvedValue([]);

    await expect(
      withdrawFromMembersOnlyEvents(tx, 'g1', 'u-jakub', now),
    ).resolves.toEqual([]);
    expect(tx.participation.updateMany).toHaveBeenCalled();
  });

  it('with nothing held it locks and writes nothing', async () => {
    const tx = mockDeep<PrismaService>();
    tx.event.findMany.mockResolvedValue([]);

    await expect(
      withdrawFromMembersOnlyEvents(tx, 'g1', 'u-jakub', now),
    ).resolves.toEqual([]);

    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(tx.participation.updateMany).not.toHaveBeenCalled();
  });
});
