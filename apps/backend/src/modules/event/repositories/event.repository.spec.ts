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
