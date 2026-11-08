import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { HomeRepository } from './home.repository';

const now = new Date('2026-11-04T10:00:00.000Z');

describe('HomeRepository', () => {
  describe('findViewer', () => {
    it('joins the interests in the profile with activities of past events, each once', async () => {
      const prisma = mockDeep<PrismaService>();
      prisma.user.findUnique.mockResolvedValue({
        homeLocalityId: 'l-praha-3',
        interests: [{ activityId: 'a1' }, { activityId: 'a2' }],
      } as never);
      prisma.participation.findMany
        .mockResolvedValueOnce([
          { event: { activityId: 'a2' } },
          { event: { activityId: 'a3' } },
        ] as never)
        .mockResolvedValueOnce([{ eventId: 'e1' }] as never);

      await expect(
        new HomeRepository(prisma).findViewer('u1', now),
      ).resolves.toEqual({
        homeLocalityId: 'l-praha-3',
        interestActivityIds: ['a1', 'a2', 'a3'],
        joinedEventIds: ['e1'],
      });

      const [attended, joined] = prisma.participation.findMany.mock.calls.map(
        ([args]) => args?.where,
      );
      expect(attended).toEqual({
        userId: 'u1',
        status: 'approved',
        event: { status: 'published', startsAt: { lte: now } },
      });
      expect(joined).toEqual({
        userId: 'u1',
        status: { in: ['approved', 'pending', 'rejected', 'removed'] },
        event: { startsAt: { gt: now } },
      });
    });

    it('leaves out events where the organizer rejected or removed the user, not where they withdrew (review #263)', async () => {
      const prisma = mockDeep<PrismaService>();
      prisma.user.findUnique.mockResolvedValue({
        homeLocalityId: null,
        interests: [],
      } as never);
      prisma.participation.findMany
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([
          { eventId: 'e-rejected' },
          { eventId: 'e-removed' },
        ] as never);

      const viewer = await new HomeRepository(prisma).findViewer('u1', now);

      expect(viewer?.joinedEventIds).toEqual(['e-rejected', 'e-removed']);
      const statuses = (
        prisma.participation.findMany.mock.calls[1][0]?.where?.status as {
          in: string[];
        }
      ).in;
      expect(statuses).toEqual(expect.arrayContaining(['rejected', 'removed']));
      expect(statuses).not.toContain('withdrawn');
    });

    it('an unknown user is null', async () => {
      const prisma = mockDeep<PrismaService>();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.participation.findMany.mockResolvedValue([]);

      await expect(
        new HomeRepository(prisma).findViewer('u1', now),
      ).resolves.toBeNull();
    });
  });

  describe('findRatingSummaries', () => {
    it("summarizes a person's own events and a group's events apart", async () => {
      const prisma = mockDeep<PrismaService>();
      const row = (
        stars: number,
        organizerUserId: string,
        groupId: string | null,
      ): object => ({
        organizerStars: stars,
        deletedAt: null,
        event: { organizerUserId, groupId },
      });
      prisma.rating.findMany.mockResolvedValue([
        row(5, 'u1', null),
        row(4, 'u1', null),
        // the group's, though u1 created it
        row(1, 'u1', 'g1'),
        row(5, 'u2', 'g1'),
      ] as never);

      const summaries = await new HomeRepository(prisma).findRatingSummaries({
        userIds: ['u1', 'u9'],
        groupIds: ['g1'],
      });

      expect(summaries.get('user:u1')).toEqual({ average: 4.5, count: 2 });
      expect(summaries.get('user:u9')).toEqual({ average: null, count: 0 });
      expect(summaries.get('group:g1')).toEqual({ average: 3, count: 2 });
      // only stars, never who gave them
      const select = prisma.rating.findMany.mock.calls[0][0]?.select;
      expect(select).not.toHaveProperty('userId');
      expect(select).not.toHaveProperty('user');
      expect(select).not.toHaveProperty('comment');
    });

    it('nobody to ask about: no query', async () => {
      const prisma = mockDeep<PrismaService>();

      await expect(
        new HomeRepository(prisma).findRatingSummaries({
          userIds: [],
          groupIds: [],
        }),
      ).resolves.toEqual(new Map());
      expect(prisma.rating.findMany).not.toHaveBeenCalled();
    });
  });
});
