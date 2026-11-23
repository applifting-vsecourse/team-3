import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { FriendRequestLimitRepository } from './request-limit.repository';

const since = new Date('2026-11-22T23:00:00.000Z');
const now = new Date('2026-11-23T10:00:00.000Z');

const setup = (): {
  prisma: DeepMockProxy<PrismaService>;
  repository: FriendRequestLimitRepository;
} => {
  const prisma = mockDeep<PrismaService>();
  // the transaction's client is the same mock: what runs inside is checked on it
  prisma.$transaction.mockImplementation(((run: (db: unknown) => unknown) =>
    Promise.resolve(run(prisma))) as never);
  prisma.friendship.count.mockResolvedValue(0);
  prisma.notification.count.mockResolvedValue(0);
  prisma.friendship.createMany.mockResolvedValue({ count: 1 });
  prisma.friendship.updateMany.mockResolvedValue({ count: 1 });
  return { prisma, repository: new FriendRequestLimitRepository(prisma) };
};

describe('FriendRequestLimitRepository (#84)', () => {
  it('counts rows and request notifications since the moment; the higher wins (a cancel doesn’t reset the day)', async () => {
    const { prisma, repository } = setup();
    prisma.friendship.count.mockResolvedValue(2);
    prisma.notification.count.mockResolvedValue(5);

    await expect(repository.sentSince('a', since)).resolves.toBe(5);
    expect(prisma.friendship.count).toHaveBeenCalledWith({
      where: { requesterId: 'a', createdAt: { gte: since } },
    });
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: {
        type: 'friend_request',
        targetType: 'user',
        targetId: 'a',
        createdAt: { gte: since },
      },
    });
  });

  it('locks the requester first, then counts and writes in the same transaction', async () => {
    const { prisma, repository } = setup();
    const order: string[] = [];
    prisma.$queryRaw.mockImplementation((() => {
      order.push('lock');
      return Promise.resolve([{ locked: 1 }]);
    }) as never);
    prisma.friendship.count.mockImplementation((() => {
      order.push('count');
      return Promise.resolve(0);
    }) as never);
    prisma.friendship.createMany.mockImplementation((() => {
      order.push('write');
      return Promise.resolve({ count: 1 });
    }) as never);

    await expect(
      repository.limited('a', 'b', 'create', since, now),
    ).resolves.toBe('written');
    expect(order).toEqual(['lock', 'count', 'write']);
    expect(prisma.friendship.createMany).toHaveBeenCalledWith({
      data: [{ requesterId: 'a', addresseeId: 'b', pairKey: 'a:b' }],
      skipDuplicates: true,
    });
  });

  it('at 20 today nothing is written', async () => {
    const { prisma, repository } = setup();
    prisma.friendship.count.mockResolvedValue(20);

    await expect(
      repository.limited('a', 'b', 'create', since, now),
    ).resolves.toBe('limit');
    expect(prisma.friendship.createMany).not.toHaveBeenCalled();
  });

  it('a pair that got a row meanwhile is reported as unchanged', async () => {
    const { prisma, repository } = setup();
    prisma.friendship.createMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.limited('a', 'b', 'create', since, now),
    ).resolves.toBe('unchanged');
  });

  it('a request sent again turns the rejected row round and counts too', async () => {
    const { prisma, repository } = setup();

    await expect(
      repository.limited('b', 'a', 'resend', since, now),
    ).resolves.toBe('written');
    expect(prisma.friendship.updateMany).toHaveBeenCalledWith({
      where: {
        pairKey: 'a:b',
        requesterId: 'a',
        addresseeId: 'b',
        status: 'rejected',
      },
      data: {
        requesterId: 'b',
        addresseeId: 'a',
        status: 'pending',
        acceptedAt: null,
        createdAt: now,
      },
    });
  });

  it('two requests at once at 19: the lock lets one through, the other hits the limit', async () => {
    const { prisma, repository } = setup();
    let rows = 19;
    // the advisory lock: one transaction of the requester at a time
    let queue = Promise.resolve();
    prisma.$transaction.mockImplementation(((
      run: (db: unknown) => Promise<unknown>,
    ) => {
      const result = queue.then(() => run(prisma));
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    }) as never);
    prisma.friendship.count.mockImplementation((() =>
      Promise.resolve(rows)) as never);
    prisma.friendship.createMany.mockImplementation((() => {
      rows += 1;
      return Promise.resolve({ count: 1 });
    }) as never);

    const results = await Promise.all([
      repository.limited('a', 'b', 'create', since, now),
      repository.limited('a', 'c', 'create', since, now),
    ]);

    expect(results.sort()).toEqual(['limit', 'written']);
    expect(rows).toBe(20);
  });
});
