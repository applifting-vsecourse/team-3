import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { NotificationCenterRepository } from './notification-center.repository';

const now = new Date('2026-11-21T10:00:00.000Z');

const setup = (): {
  prisma: DeepMockProxy<PrismaService>;
  repository: NotificationCenterRepository;
} => {
  const prisma = mockDeep<PrismaService>();
  return { prisma, repository: new NotificationCenterRepository(prisma) };
};

describe('NotificationCenterRepository (#86)', () => {
  it('lists only the user’s own, newest first, as many as asked', async () => {
    const { prisma, repository } = setup();
    prisma.notification.findMany.mockResolvedValue([]);

    await repository.list('u1', 50);

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 50,
      }),
    );
  });

  it('counts the user’s unread ones', async () => {
    const { prisma, repository } = setup();
    prisma.notification.count.mockResolvedValue(3);

    await expect(repository.countUnread('u1')).resolves.toBe(3);
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'u1', readAt: null },
    });
  });

  it('marks one of the user’s own as read', async () => {
    const { prisma, repository } = setup();
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });

    await expect(repository.markRead('u1', 'n1', now)).resolves.toBe(true);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n1', userId: 'u1', readAt: null },
      data: { readAt: now },
    });
  });

  it('one already read keeps its time and still counts as done', async () => {
    const { prisma, repository } = setup();
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });
    prisma.notification.count.mockResolvedValue(1);

    await expect(repository.markRead('u1', 'n1', now)).resolves.toBe(true);
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { id: 'n1', userId: 'u1' },
    });
  });

  it('somebody else’s (or none) is never touched and reported as missing', async () => {
    const { prisma, repository } = setup();
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });
    prisma.notification.count.mockResolvedValue(0);

    await expect(repository.markRead('u2', 'n1', now)).resolves.toBe(false);
  });

  it('marks all of the user’s unread ones and says how many', async () => {
    const { prisma, repository } = setup();
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });

    await expect(repository.markAllRead('u1', now)).resolves.toBe(4);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', readAt: null },
      data: { readAt: now },
    });
  });
});
