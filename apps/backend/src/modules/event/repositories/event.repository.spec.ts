import { PrismaService } from '@/core/prisma/prisma.service';
import { MY_EVENTS_TABS } from '@/modules/event/domain/event';
import { mockDeep } from 'jest-mock-extended';
import { EventRepository } from './event.repository';
import { buildPublicEventsWhere } from './public-events-where';

describe('EventRepository', () => {
  describe('findActiveGroupRole', () => {
    it.each([
      ['admin', 'active', 'admin'],
      ['member', 'active', 'member'],
      ['admin', 'pending', null],
      ['member', 'pending', null],
      ['member', 'blocked', null],
    ] as const)('an %s with status %s → %s', async (role, status, expected) => {
      const prisma = mockDeep<PrismaService>();
      prisma.groupMember.findUnique.mockResolvedValue({
        role,
        status,
      } as never);

      await expect(
        new EventRepository(prisma).findActiveGroupRole('g1', 'u1'),
      ).resolves.toBe(expected);
      expect(prisma.groupMember.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId_userId: { groupId: 'g1', userId: 'u1' } },
        }),
      );
    });

    it('not a member at all → null', async () => {
      const prisma = mockDeep<PrismaService>();
      prisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(
        new EventRepository(prisma).findActiveGroupRole('g1', 'u1'),
      ).resolves.toBeNull();
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

describe('EventRepository.createEvent (review #264)', () => {
  const setup = (): { prisma: ReturnType<typeof mockDeep<PrismaService>> } => {
    const prisma = mockDeep<PrismaService>();
    // the transaction client is the same mock
    prisma.$transaction.mockImplementation(((
      run: (tx: PrismaService) => Promise<unknown>,
    ) => run(prisma)) as never);
    prisma.event.create.mockResolvedValue({ id: 'e-new' } as never);
    return { prisma };
  };
  const event = {
    title: 'Florbal',
    description: null,
    activityId: 'a-florbal',
    localityId: 'l-praha-9',
    lat: 50.11,
    lng: 14.5,
    address: 'Hala',
    startsAt: new Date('2026-11-20T18:00:00.000Z'),
    endsAt: null,
    minParticipants: 4,
    maxParticipants: 10,
    approvalMode: 'open' as const,
    visibility: 'public' as const,
  };

  it("a group's event: locks the group, checks it is active, then writes", async () => {
    const { prisma } = setup();
    prisma.group.findUnique.mockResolvedValue({ status: 'active' } as never);

    await expect(
      new EventRepository(prisma).createEvent(
        { ...event, groupId: 'g1' },
        'u1',
      ),
    ).resolves.toBe('e-new');

    const lockAt = prisma.$executeRaw.mock.invocationCallOrder[0]!;
    const readAt = prisma.group.findUnique.mock.invocationCallOrder[0]!;
    expect(lockAt).toBeLessThan(readAt);
    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ groupId: 'g1', organizerUserId: 'u1' }),
      }),
    );
  });

  it('a group deactivated meanwhile: nothing is written, null', async () => {
    const { prisma } = setup();
    prisma.group.findUnique.mockResolvedValue({ status: 'inactive' } as never);

    await expect(
      new EventRepository(prisma).createEvent(
        { ...event, groupId: 'g1' },
        'u1',
      ),
    ).resolves.toBeNull();
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it("a person's own event locks nothing", async () => {
    const { prisma } = setup();

    await expect(
      new EventRepository(prisma).createEvent(
        { ...event, groupId: null },
        'u1',
      ),
    ).resolves.toBe('e-new');
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
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

    await new EventRepository(prisma).join('e1', 'u9', null, decide);

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
      new EventRepository(prisma).join('e1', 'u9', 'Ahoj', decide),
    ).resolves.toEqual({ ok: false, refusal: 'EVENT_FULL' });
    expect(prisma.participation.upsert).not.toHaveBeenCalled();
  });

  it('a request keeps its message, also over a withdrawn one (#175)', async () => {
    const { prisma } = setup(2);
    const decide = jest.fn().mockReturnValue({ ok: true, status: 'pending' });

    await new EventRepository(prisma).join('e1', 'u9', 'Ahoj, hraju', decide);

    expect(prisma.participation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: 'pending',
          message: 'Ahoj, hraju',
        }),
        update: expect.objectContaining({
          status: 'pending',
          message: 'Ahoj, hraju',
        }),
      }),
    );
  });

  it('joining at once drops the message: nobody would read it (#175)', async () => {
    const { prisma } = setup(2);
    const decide = jest.fn().mockReturnValue({ ok: true, status: 'approved' });

    await new EventRepository(prisma).join('e1', 'u9', 'Ahoj', decide);

    expect(prisma.participation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ message: null }),
        update: expect.objectContaining({ message: null }),
      }),
    );
  });
});

describe('EventRepository.findPendingRequests', () => {
  it('returns each request with its message (#175)', async () => {
    const prisma = mockDeep<PrismaService>();
    const updatedAt = new Date('2026-10-24T10:00:00.000Z');
    prisma.participation.findMany.mockResolvedValue([
      { updatedAt, message: 'Ahoj', user: { id: 'u4', name: 'Jakub' } },
      { updatedAt, message: null, user: { id: 'u5', name: 'Jana' } },
    ] as never);

    await expect(
      new EventRepository(prisma).findPendingRequests('e1'),
    ).resolves.toEqual([
      { id: 'u4', name: 'Jakub', requestedAt: updatedAt, message: 'Ahoj' },
      { id: 'u5', name: 'Jana', requestedAt: updatedAt, message: null },
    ]);
    expect(prisma.participation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: 'e1', status: 'pending' } }),
    );
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

describe('EventRepository: the request message stays with the organizer (#175)', () => {
  const now = new Date('2026-10-24T10:00:00.000Z');
  const queries = (
    prisma: ReturnType<typeof mockDeep<PrismaService>>,
  ): string =>
    JSON.stringify([
      prisma.event.findMany.mock.calls,
      prisma.event.findUnique.mock.calls,
      prisma.participation.findMany.mock.calls,
      prisma.participation.findUnique.mock.calls,
      (prisma.participation.groupBy as unknown as jest.Mock).mock.calls,
    ]);

  it('the list, the detail, Moje akce and the participants never load it', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.findUnique.mockResolvedValue(null);
    prisma.participation.findMany.mockResolvedValue([]);
    prisma.participation.findUnique.mockResolvedValue(null);
    (prisma.participation.groupBy as unknown as jest.Mock).mockResolvedValue(
      [],
    );
    const repository = new EventRepository(prisma);

    await repository.findPublicEvents({ filters: {}, now, limit: 10 });
    await repository.countInterest({}, now);
    await repository.findEventDetail('e1', now);
    await repository.findApprovedParticipants('e1');
    await repository.findParticipationStatus('e1', 'u1');
    for (const tab of MY_EVENTS_TABS) {
      await repository.findMyEvents({ tab, userId: 'u1', now, limit: 10 });
    }

    expect(queries(prisma)).not.toContain('message');
  });
  describe('createMessage (#176)', () => {
    const since = new Date('2026-11-07T23:00:00.000Z');
    const input = { subject: 'Sraz u vchodu', body: 'Vezmi si sálovky.' };
    const created = {
      id: 'm1',
      ...input,
      createdAt: since,
      sender: { id: 'u1', name: 'Petra' },
    };

    const setup = (
      event: { status: 'published' | 'cancelled' } | null,
      sentToday: number,
    ): ReturnType<typeof mockDeep<PrismaService>> => {
      const prisma = mockDeep<PrismaService>();
      // the callback form: the mock itself stands in for the transaction client
      prisma.$transaction.mockImplementation(((
        run: (tx: typeof prisma) => unknown,
      ) => run(prisma)) as never);
      prisma.event.findUnique.mockResolvedValue(event as never);
      prisma.eventMessage.count.mockResolvedValue(sentToday);
      prisma.eventMessage.create.mockResolvedValue(created as never);
      return prisma;
    };

    it("locks the event, counts today's and writes when the decision allows", async () => {
      const prisma = setup({ status: 'published' }, 9);
      const decide = jest.fn().mockReturnValue({ ok: true });

      await expect(
        new EventRepository(prisma).createMessage(
          'e1',
          'u1',
          input,
          since,
          decide,
        ),
      ).resolves.toEqual({ ok: true, message: created });
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(prisma.eventMessage.count).toHaveBeenCalledWith({
        where: { eventId: 'e1', createdAt: { gte: since } },
      });
      expect(decide).toHaveBeenCalledWith({
        eventStatus: 'published',
        sentToday: 9,
      });
      expect(prisma.eventMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { eventId: 'e1', senderId: 'u1', ...input },
        }),
      );
    });

    it('writes nothing when the decision refuses', async () => {
      const prisma = setup({ status: 'published' }, 10);

      await expect(
        new EventRepository(prisma).createMessage(
          'e1',
          'u1',
          input,
          since,
          () => ({
            ok: false,
            refusal: 'MESSAGE_LIMIT',
          }),
        ),
      ).resolves.toEqual({ ok: false, refusal: 'MESSAGE_LIMIT' });
      expect(prisma.eventMessage.create).not.toHaveBeenCalled();
    });

    it('an event gone in the meantime is null', async () => {
      const prisma = setup(null, 0);

      await expect(
        new EventRepository(prisma).createMessage(
          'e1',
          'u1',
          input,
          since,
          () => ({
            ok: true,
          }),
        ),
      ).resolves.toBeNull();
      expect(prisma.eventMessage.create).not.toHaveBeenCalled();
    });
  });
});
