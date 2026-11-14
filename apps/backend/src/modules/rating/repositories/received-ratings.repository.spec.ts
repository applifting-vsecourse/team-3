import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { RatingRepository } from './rating.repository';

// RatingRepository: what the event got from its participants (B-060, #66)

const updatedAt = new Date('2026-11-01T08:00:00.000Z');

describe('RatingRepository – received ratings (#66)', () => {
  describe('findEventViewer', () => {
    it('the organizer of a personal event, with no group to look up', async () => {
      const prisma = mockDeep<PrismaService>();
      prisma.event.findUnique.mockResolvedValue({
        status: 'published',
        organizerUserId: 'u-petra',
        groupId: null,
      } as never);
      prisma.participation.findUnique.mockResolvedValue(null);

      await expect(
        new RatingRepository(prisma).findEventViewer('e1', 'u-petra'),
      ).resolves.toEqual({
        isOrganizer: true,
        participation: null,
        isGroupMember: false,
        isGroupAdmin: false,
      });
      expect(prisma.groupMember.findUnique).not.toHaveBeenCalled();
    });

    it.each([
      ['admin', 'active', true, true],
      ['member', 'active', true, false],
      ['admin', 'blocked', false, false],
    ] as const)(
      'for an event of a group: a %s %s → member %s, admin %s',
      async (role, status, isGroupMember, isGroupAdmin) => {
        const prisma = mockDeep<PrismaService>();
        prisma.event.findUnique.mockResolvedValue({
          status: 'published',
          organizerUserId: 'u-petra',
          groupId: 'g1',
        } as never);
        prisma.participation.findUnique.mockResolvedValue({
          status: 'approved',
        } as never);
        prisma.groupMember.findUnique.mockResolvedValue({
          role,
          status,
        } as never);

        await expect(
          new RatingRepository(prisma).findEventViewer('e1', 'u-tomas'),
        ).resolves.toEqual({
          isOrganizer: false,
          participation: 'approved',
          isGroupMember,
          isGroupAdmin,
        });
        expect(prisma.groupMember.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { groupId_userId: { groupId: 'g1', userId: 'u-tomas' } },
          }),
        );
      },
    );

    it.each(['hidden', 'deleted'])('null for a %s event', async (status) => {
      const prisma = mockDeep<PrismaService>();
      prisma.event.findUnique.mockResolvedValue({
        status,
        organizerUserId: 'u-petra',
        groupId: null,
      } as never);

      await expect(
        new RatingRepository(prisma).findEventViewer('e1', 'u-petra'),
      ).resolves.toBeNull();
    });
  });

  describe('findReceivedRatings', () => {
    it('reads the ratings not deleted, newest first, each with its author', async () => {
      const prisma = mockDeep<PrismaService>();
      prisma.rating.findMany.mockResolvedValue([
        {
          eventStars: 5,
          organizerStars: 4,
          comment: 'Díky',
          updatedAt,
          user: { id: 'u-jakub', name: 'Jakub' },
        },
      ] as never);

      await expect(
        new RatingRepository(prisma).findReceivedRatings('e1'),
      ).resolves.toEqual([
        {
          author: { id: 'u-jakub', name: 'Jakub' },
          eventStars: 5,
          organizerStars: 4,
          comment: 'Díky',
          updatedAt,
        },
      ]);
      expect(prisma.rating.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 'e1', deletedAt: null },
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        }),
      );
    });
  });
});
