import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import {
  ratingInvitationEventsWhere,
  RatingInvitationRepository,
} from './rating-invitation.repository';

const now = new Date('2026-11-17T20:00:00Z');
const target = {
  role: 'participant',
  userId: 'alice',
  email: 'alice@example.test',
} as const;

describe('rating invitation persistence', () => {
  const prisma = mockDeep<PrismaService>();
  const repository = new RatingInvitationRepository(prisma);
  beforeEach(() => jest.clearAllMocks());

  it('bounds catch-up by Prague days and the last evening, with a stable cursor', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    await repository.findEventIds(now, 'last-id');
    expect(prisma.event.findMany).toHaveBeenCalledWith({
      where: {
        status: 'published',
        id: { gt: 'last-id' },
        AND: [
          {
            OR: [
              { endsAt: { lte: now } },
              {
                endsAt: null,
                startsAt: { lt: new Date('2026-11-16T23:00:00Z') },
              },
            ],
          },
          {
            OR: [
              { endsAt: { gte: new Date('2026-11-02T23:00:00Z') } },
              {
                endsAt: null,
                startsAt: { gte: new Date('2026-11-02T23:00:00Z') },
              },
            ],
          },
        ],
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 100,
    });
  });

  it('a daytime restart uses yesterday evening, not newly ended events', () => {
    const where = ratingInvitationEventsWhere(new Date('2026-11-18T09:00:00Z'));
    expect(where.AND).toEqual(
      expect.arrayContaining([
        {
          OR: [
            { endsAt: { lte: now } },
            {
              endsAt: null,
              startsAt: { lt: new Date('2026-11-16T23:00:00Z') },
            },
          ],
        },
      ]),
    );
  });

  it('reads approved participation only, without attendance or membership conditions', async () => {
    prisma.event.findUnique.mockResolvedValue(null);
    await repository.findEvent('event-1');
    expect(prisma.event.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          participations: expect.objectContaining({
            where: { status: 'approved' },
          }),
          organizerUserId: true,
          ratings: {
            where: { deletedAt: { not: null } },
            select: { userId: true },
          },
        }),
      }),
    );
  });

  it('claims one deterministic recipient key without replacing existing delivery records', async () => {
    prisma.notificationLog.createMany.mockResolvedValue({ count: 1 });
    prisma.notificationLog.updateMany.mockResolvedValue({ count: 1 });
    const token = await repository.claim('event-1', target, now);
    expect(token).toEqual(expect.any(String));
    expect(prisma.notificationLog.createMany).toHaveBeenCalledWith({
      data: {
        key: 'rating-invitation:participant:event-1:alice',
        type: 'rating-invitation-participant',
        eventId: 'event-1',
        userId: 'alice',
      },
      skipDuplicates: true,
    });
    expect(prisma.notificationLog.updateMany).toHaveBeenCalledWith({
      where: {
        key: 'rating-invitation:participant:event-1:alice',
        sentAt: null,
        OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
      },
      data: {
        claimToken: token,
        lockedUntil: new Date('2026-11-17T21:00:00Z'),
      },
    });
  });

  it('a sent or actively claimed key is not claimed by another worker', async () => {
    prisma.notificationLog.createMany.mockResolvedValue({ count: 0 });
    prisma.notificationLog.updateMany.mockResolvedValue({ count: 0 });
    expect(await repository.claim('event-1', target, now)).toBeNull();
  });

  it('only the current owner can complete or release an unsent claim', async () => {
    prisma.notificationLog.updateMany.mockResolvedValue({ count: 1 });
    await repository.markSent('key', 'owner', now);
    expect(prisma.notificationLog.updateMany).toHaveBeenLastCalledWith({
      where: { key: 'key', claimToken: 'owner', sentAt: null },
      data: { sentAt: now, claimToken: null, lockedUntil: null },
    });
    await repository.release('key', 'owner');
    expect(prisma.notificationLog.updateMany).toHaveBeenLastCalledWith({
      where: { key: 'key', claimToken: 'owner', sentAt: null },
      data: { claimToken: null, lockedUntil: null },
    });
  });

  it('does not silently report success if the delivery claim was lost', async () => {
    prisma.notificationLog.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.markSent('key', 'old-owner', now)).rejects.toThrow(
      'claim lost',
    );
  });
});
