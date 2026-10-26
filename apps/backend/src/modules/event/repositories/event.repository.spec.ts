import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { EventRepository } from './event.repository';
import { buildPublicEventsWhere } from './public-events-where';

describe('EventRepository', () => {
  describe('isActiveGroupMember', () => {
    it.each([
      ['active', true],
      ['pending', false],
      ['blocked', false],
    ] as const)('a %s member → %s', async (status, expected) => {
      const prisma = mockDeep<PrismaService>();
      prisma.groupMember.findUnique.mockResolvedValue({ status } as never);

      await expect(
        new EventRepository(prisma).isActiveGroupMember('g1', 'u1'),
      ).resolves.toBe(expected);
      expect(prisma.groupMember.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId_userId: { groupId: 'g1', userId: 'u1' } },
        }),
      );
    });

    it('not a member at all → false', async () => {
      const prisma = mockDeep<PrismaService>();
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(
        new EventRepository(prisma).isActiveGroupMember('g1', 'u1'),
      ).resolves.toBe(false);
    });
  });

  describe('findApprovedParticipants', () => {
    it('asks only for approved participations and returns just id and name', async () => {
      const prisma = mockDeep<PrismaService>();
      prisma.participation.findMany.mockResolvedValue([
        { user: { id: 'u2', name: 'Jana' } },
      ] as never);

      await expect(
        new EventRepository(prisma).findApprovedParticipants('e1'),
      ).resolves.toEqual([{ id: 'u2', name: 'Jana' }]);
      expect(prisma.participation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 'e1', status: 'approved' },
          select: { user: { select: { id: true, name: true } } },
        }),
      );
    });
  });
});

describe('EventRepository.countInterest', () => {
  const now = new Date('2026-10-26T08:00:00.000Z');

  it('counts places and waiting requests of the visible events in the database, per event', async () => {
    const prisma = mockDeep<PrismaService>();
    // groupBy's generic overloads are too deep for jest-mock-extended's types
    const groupBy = prisma.participation.groupBy as unknown as jest.Mock;
    groupBy.mockResolvedValue([
      { eventId: 'e1', _count: { _all: 7 } },
      { eventId: 'e2', _count: { _all: 2 } },
    ]);
    const filters = { localityId: 'l-praha' };

    const interest = await new EventRepository(prisma).countInterest(
      filters,
      now,
    );

    expect(interest).toEqual(
      new Map([
        ['e1', 7],
        ['e2', 2],
      ]),
    );
    // one grouped query, not one per event; withdrawn, rejected and removed
    // don't count, and only events the public list may show
    expect(groupBy).toHaveBeenCalledTimes(1);
    expect(groupBy).toHaveBeenCalledWith({
      by: ['eventId'],
      where: {
        status: { in: ['approved', 'pending'] },
        event: buildPublicEventsWhere(filters, now),
      },
      _count: { _all: true },
    });
  });
});

describe('EventRepository.cancelEvent', () => {
  it('writes only an event that is still published and ahead, so two cancels write once', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.event.updateMany.mockResolvedValue({ count: 0 });
    const now = new Date('2026-10-24T08:00:00.000Z');

    await expect(
      new EventRepository(prisma).cancelEvent('e1', 'Důvod', now),
    ).resolves.toBe(false);
    expect(prisma.event.updateMany).toHaveBeenCalledWith({
      where: { id: 'e1', status: 'published', startsAt: { gt: now } },
      data: { status: 'cancelled', cancelReason: 'Důvod', cancelledAt: now },
    });
  });
});

describe('EventRepository.join', () => {
  const setup = (
    approvedCount: number,
  ): { prisma: ReturnType<typeof mockDeep<PrismaService>> } => {
    const prisma = mockDeep<PrismaService>();
    // the transaction client is the same mock
    prisma.$transaction.mockImplementation(((
      run: (tx: PrismaService) => Promise<unknown>,
    ) => run(prisma)) as never);
    prisma.event.findUnique.mockResolvedValue({
      status: 'published',
      startsAt: new Date('2026-10-25T16:00:00.000Z'),
      approvalMode: 'open',
      maxParticipants: 6,
      organizerUserId: 'u1',
    } as never);
    prisma.participation.findUnique.mockResolvedValue(null);
    prisma.participation.count.mockResolvedValue(approvedCount);
    return { prisma };
  };

  it('locks the event row before it counts the places, then writes the decision', async () => {
    const { prisma } = setup(2);
    const decide = jest.fn().mockReturnValue({ ok: true, status: 'approved' });

    await new EventRepository(prisma).join('e1', 'u9', decide);

    const lockAt = prisma.$executeRaw.mock.invocationCallOrder[0]!;
    const countAt = prisma.participation.count.mock.invocationCallOrder[0]!;
    expect(lockAt).toBeLessThan(countAt);
    expect(decide).toHaveBeenCalledWith(
      expect.objectContaining({ approvedCount: 2, isOrganizer: false }),
    );
    expect(prisma.participation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId_userId: { eventId: 'e1', userId: 'u9' } },
        create: expect.objectContaining({ status: 'approved' }),
      }),
    );
  });

  it('writes nothing when the rules refuse', async () => {
    const { prisma } = setup(6);
    const decide = jest
      .fn()
      .mockReturnValue({ ok: false, refusal: 'EVENT_FULL' });

    await expect(
      new EventRepository(prisma).join('e1', 'u9', decide),
    ).resolves.toEqual({ ok: false, refusal: 'EVENT_FULL' });
    expect(prisma.participation.upsert).not.toHaveBeenCalled();
  });
});

describe('EventRepository.updateEvent', () => {
  const stored = {
    status: 'published',
    startsAt: new Date('2026-10-24T16:00:00.000Z'),
    endsAt: null,
    minParticipants: 3,
    maxParticipants: 6,
  };
  const setup = (): ReturnType<typeof mockDeep<PrismaService>> => {
    const prisma = mockDeep<PrismaService>();
    prisma.$transaction.mockImplementation(((
      run: (tx: PrismaService) => Promise<unknown>,
    ) => run(prisma)) as never);
    prisma.event.findUnique.mockResolvedValue(stored as never);
    prisma.participation.count.mockResolvedValue(5);
    return prisma;
  };

  it('locks the event row before it reads it, then writes what was decided', async () => {
    const prisma = setup();
    const endsAt = new Date('2026-10-25T19:00:00.000Z');
    const decide = jest.fn().mockReturnValue({
      ok: true,
      data: { maxParticipants: 8, endsAt },
    });

    await expect(
      new EventRepository(prisma).updateEvent('e1', decide),
    ).resolves.toEqual({ ok: true, data: { maxParticipants: 8, endsAt } });
    expect(prisma.$executeRaw.mock.invocationCallOrder[0]!).toBeLessThan(
      prisma.event.findUnique.mock.invocationCallOrder[0]!,
    );
    expect(decide).toHaveBeenCalledWith({ ...stored, approvedCount: 5 });
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { maxParticipants: 8, endsAt },
    });
  });

  it('writes nothing when the change is refused', async () => {
    const prisma = setup();
    const refused = {
      ok: false,
      refusal: { code: 'INVALID_CAPACITY', problem: 'Maximum…' },
    } as const;

    await expect(
      new EventRepository(prisma).updateEvent('e1', () => refused),
    ).resolves.toEqual(refused);
    expect(prisma.event.update).not.toHaveBeenCalled();
  });
});

describe('EventRepository.findMyEvents', () => {
  const now = new Date('2026-10-23T08:00:00.000Z');

  // what Prisma returns for the include; only the parts the mapping reads matter
  const aRow = (
    participations: { userId: string; status: string }[],
    status = 'published',
  ): Record<string, unknown> => ({
    id: 'e1',
    title: 'Deskovky',
    startsAt: new Date('2026-10-24T16:00:00.000Z'),
    endsAt: null,
    address: 'Herna Karlín, Křižíkova 52, Praha 8',
    lat: 50.09,
    lng: 14.45,
    status,
    minParticipants: 3,
    maxParticipants: 6,
    promotedUntil: null,
    activity: {
      id: 'a1',
      slug: 'deskove-hry',
      name: 'Deskové hry',
      category: { id: 'c1', slug: 'hry', name: 'Hry', icon: 'dice' },
    },
    locality: { id: 'l1', slug: 'praha-8', name: 'Praha 8' },
    organizer: { id: 'u-org', name: 'Petra' },
    group: null,
    _count: { participations: 2 },
    participations,
  });

  it('attending: loads only the user’s own participation and its status', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.event.findMany.mockResolvedValue([
      aRow([{ userId: 'u1', status: 'pending' }]),
    ] as never);

    const [event] = await new EventRepository(prisma).findMyEvents({
      tab: 'attending',
      userId: 'u1',
      now,
      limit: 200,
    });

    expect(event).toMatchObject({
      id: 'e1',
      status: 'published',
      myParticipation: 'pending',
      pendingRequests: null,
      capacity: { approvedCount: 2, missingToMin: 1 },
    });
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          participations: {
            where: { userId: 'u1' },
            select: { userId: true, status: true },
          },
        }),
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take: 200,
      }),
    );
  });

  it('organizing: counts the waiting requests, the organizer’s own place apart', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.event.findMany.mockResolvedValue([
      aRow(
        [
          { userId: 'u-org', status: 'approved' },
          { userId: 'u2', status: 'pending' },
          { userId: 'u3', status: 'pending' },
        ],
        'cancelled',
      ),
    ] as never);

    const [event] = await new EventRepository(prisma).findMyEvents({
      tab: 'organizing',
      userId: 'u-org',
      now,
      limit: 200,
    });

    expect(event).toMatchObject({
      status: 'cancelled',
      myParticipation: 'approved',
      pendingRequests: 2,
    });
  });

  it('organizing without joining: no participation of my own', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.event.findMany.mockResolvedValue([aRow([])] as never);

    const [event] = await new EventRepository(prisma).findMyEvents({
      tab: 'organizing',
      userId: 'u-org',
      now,
      limit: 200,
    });

    expect(event).toMatchObject({ myParticipation: null, pendingRequests: 0 });
  });
});

describe('EventRepository.decideRequests (#53)', () => {
  const now = new Date('2026-10-24T08:00:00.000Z');
  const setup = (): ReturnType<typeof mockDeep<PrismaService>> => {
    const prisma = mockDeep<PrismaService>();
    prisma.$transaction.mockImplementation(((
      run: (tx: PrismaService) => Promise<unknown>,
    ) => run(prisma)) as never);
    prisma.event.findUnique.mockResolvedValue({
      status: 'published',
      startsAt: new Date('2026-10-25T16:00:00.000Z'),
      maxParticipants: 6,
    } as never);
    prisma.participation.findMany.mockResolvedValue([
      { userId: 'u5', status: 'pending' },
    ] as never);
    prisma.participation.count.mockResolvedValue(5);
    return prisma;
  };

  it('locks the event row before it counts the places; a missing request reads as none', async () => {
    const prisma = setup();
    const decide = jest.fn().mockReturnValue({ ok: true });

    await new EventRepository(prisma).decideRequests(
      'e1',
      ['u5', 'u6'],
      'approved',
      decide,
      now,
    );

    expect(prisma.$executeRaw.mock.invocationCallOrder[0]!).toBeLessThan(
      prisma.participation.count.mock.invocationCallOrder[0]!,
    );
    expect(decide).toHaveBeenCalledWith(
      expect.objectContaining({
        approvedCount: 5,
        maxParticipants: 6,
        requestStatuses: ['pending', null],
      }),
    );
  });

  it('approves only waiting requests, with the time of approval', async () => {
    const prisma = setup();

    await new EventRepository(prisma).decideRequests(
      'e1',
      ['u5'],
      'approved',
      () => ({ ok: true }),
      now,
    );

    expect(prisma.participation.updateMany).toHaveBeenCalledWith({
      where: { eventId: 'e1', userId: { in: ['u5'] }, status: 'pending' },
      data: { status: 'approved', approvedAt: now },
    });
  });

  it('writes nothing when the rules refuse, e.g. the last place is gone', async () => {
    const prisma = setup();

    await expect(
      new EventRepository(prisma).decideRequests(
        'e1',
        ['u5'],
        'approved',
        () => ({ ok: false, refusal: 'EVENT_FULL' }),
        now,
      ),
    ).resolves.toEqual({ ok: false, refusal: 'EVENT_FULL' });
    expect(prisma.participation.updateMany).not.toHaveBeenCalled();
  });
});

describe('EventRepository.leave', () => {
  it('takes the event lock before it reads the participation (#53)', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.$transaction.mockImplementation(((
      run: (tx: PrismaService) => Promise<unknown>,
    ) => run(prisma)) as never);
    prisma.event.findUnique.mockResolvedValue({
      startsAt: new Date('2026-10-25T16:00:00.000Z'),
    } as never);
    prisma.participation.findUnique.mockResolvedValue({
      status: 'pending',
    } as never);

    await new EventRepository(prisma).leave('e1', 'u5', () => ({ ok: true }));

    expect(prisma.$executeRaw.mock.invocationCallOrder[0]!).toBeLessThan(
      prisma.participation.findUnique.mock.invocationCallOrder[0]!,
    );
    expect(prisma.participation.update).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId: 'e1', userId: 'u5' } },
      data: { status: 'withdrawn', approvedAt: null },
    });
  });
});
