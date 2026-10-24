import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { EventRepository } from './event.repository';

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
