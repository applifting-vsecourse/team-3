import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { ExpiredRequestRepository } from './expired-request.repository';

// #465: requests left waiting when the event started, each applicant told once
describe('ExpiredRequestRepository.findDue', () => {
  const now = new Date('2026-11-28T18:00:00.000Z');

  it('takes waiting requests of published events started in the last day', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.participation.findMany.mockResolvedValue([]);

    await expect(
      new ExpiredRequestRepository(prisma).findDue(now),
    ).resolves.toEqual([]);

    expect(prisma.participation.findMany).toHaveBeenCalledWith({
      where: {
        status: 'pending',
        event: {
          status: 'published',
          startsAt: {
            lte: now,
            gt: new Date('2026-11-27T18:00:00.000Z'),
          },
        },
      },
      select: { eventId: true, userId: true },
      orderBy: [{ eventId: 'asc' }, { userId: 'asc' }],
    });
    // nothing waiting: no second query
    expect(prisma.notification.findMany).not.toHaveBeenCalled();
  });

  it('groups them by event and leaves out whoever was already told', async () => {
    const prisma = mockDeep<PrismaService>();
    prisma.participation.findMany.mockResolvedValue([
      { eventId: 'e1', userId: 'u1' },
      { eventId: 'e1', userId: 'u2' },
      { eventId: 'e2', userId: 'u1' },
    ] as never);
    prisma.notification.findMany.mockResolvedValue([
      { userId: 'u2', targetId: 'e1' },
    ] as never);

    await expect(
      new ExpiredRequestRepository(prisma).findDue(now),
    ).resolves.toEqual([
      { eventId: 'e1', userIds: ['u1'] },
      { eventId: 'e2', userIds: ['u1'] },
    ]);
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: {
        type: 'request_expired',
        targetType: 'event',
        targetId: { in: ['e1', 'e2'] },
      },
      select: { userId: true, targetId: true },
    });
  });
});
