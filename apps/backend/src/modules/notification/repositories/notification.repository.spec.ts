import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { NotificationRepository } from './notification.repository';

const deliverable = { blockedAt: null, deletedAt: null };

describe('NotificationRepository', () => {
  describe('findEvent', () => {
    it('gives what the e-mails say, with the approved count and the organizer’s id', async () => {
      const prisma = mockDeep<PrismaService>();
      prisma.event.findUnique.mockResolvedValue({
        id: 'e1',
        title: 'Deskovky ve středu',
        startsAt: new Date('2026-11-11T17:00:00.000Z'),
        endsAt: null,
        address: 'Herna Karlín',
        cancelReason: null,
        maxParticipants: 6,
        organizerUserId: 'u1',
        _count: { participations: 3 },
      } as never);

      await expect(
        new NotificationRepository(prisma).findEvent('e1'),
      ).resolves.toEqual({
        id: 'e1',
        title: 'Deskovky ve středu',
        startsAt: new Date('2026-11-11T17:00:00.000Z'),
        endsAt: null,
        address: 'Herna Karlín',
        cancelReason: null,
        maxParticipants: 6,
        approvedCount: 3,
        organizerId: 'u1',
      });
      expect(prisma.event.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'e1' },
          select: expect.objectContaining({
            _count: {
              select: { participations: { where: { status: 'approved' } } },
            },
          }),
        }),
      );
    });

    it('is null for an event that is gone', async () => {
      const prisma = mockDeep<PrismaService>();
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        new NotificationRepository(prisma).findEvent('nope'),
      ).resolves.toBeNull();
    });
  });

  describe('findRecipients', () => {
    it('asks only for the given users, and never for a blocked or deleted one', async () => {
      const prisma = mockDeep<PrismaService>();
      const users = [{ id: 'u2', name: 'Jana', email: 'jana@example.com' }];
      prisma.user.findMany.mockResolvedValue(users as never);

      await expect(
        new NotificationRepository(prisma).findRecipients(['u2', 'u3']),
      ).resolves.toEqual(users);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['u2', 'u3'] }, ...deliverable },
        }),
      );
    });

    it('does not ask the database for nobody', async () => {
      const prisma = mockDeep<PrismaService>();

      await expect(
        new NotificationRepository(prisma).findRecipients([]),
      ).resolves.toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findAudience (B-041)', () => {
    it('is those with a place or a waiting request, not the one excepted, not blocked or deleted', async () => {
      const prisma = mockDeep<PrismaService>();
      const jana = { id: 'u2', name: 'Jana', email: 'jana@example.com' };
      prisma.participation.findMany.mockResolvedValue([
        { user: jana },
      ] as never);

      await expect(
        new NotificationRepository(prisma).findAudience('e1', 'u1'),
      ).resolves.toEqual([jana]);
      expect(prisma.participation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            eventId: 'e1',
            status: { in: ['approved', 'pending'] },
            userId: { not: 'u1' },
            user: deliverable,
          },
        }),
      );
    });
  });

  describe('findPersonName', () => {
    it('gives the name, or null for nobody', async () => {
      const prisma = mockDeep<PrismaService>();
      const repository = new NotificationRepository(prisma);
      prisma.user.findUnique.mockResolvedValueOnce({ name: 'Jana' } as never);
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(repository.findPersonName('u2')).resolves.toBe('Jana');
      await expect(repository.findPersonName('u9')).resolves.toBeNull();
    });
  });

  describe('group announcements (#194)', () => {
    it('findAnnouncement gives what the e-mail says, with the group', async () => {
      const prisma = mockDeep<PrismaService>();
      const row = {
        id: 'an1',
        subject: 'Pauza',
        body: 'Přes svátky se nehraje.',
        senderId: 'u1',
        group: { id: 'g1', name: 'Florbal Podvinný mlýn' },
      };
      prisma.groupAnnouncement.findUnique.mockResolvedValue(row as never);

      await expect(
        new NotificationRepository(prisma).findAnnouncement('an1'),
      ).resolves.toEqual(row);
    });

    it('findActiveMembers is the active members, admins too, not the sender, not blocked or deleted', async () => {
      const prisma = mockDeep<PrismaService>();
      const jana = { id: 'u2', name: 'Jana', email: 'jana@example.com' };
      prisma.groupMember.findMany.mockResolvedValue([{ user: jana }] as never);

      await expect(
        new NotificationRepository(prisma).findActiveMembers('g1', 'u1'),
      ).resolves.toEqual([jana]);
      expect(prisma.groupMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            groupId: 'g1',
            status: 'active',
            userId: { not: 'u1' },
            user: deliverable,
          },
        }),
      );
    });
  });
});
