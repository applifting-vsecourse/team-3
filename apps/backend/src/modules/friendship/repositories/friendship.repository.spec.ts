import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import {
  FriendshipRepository,
  userFriendshipsWhere,
} from './friendship.repository';

const A = 'user-a';
const B = 'user-b';
const PAIR = 'user-a:user-b';

const setup = (): {
  prisma: DeepMockProxy<PrismaService>;
  repository: FriendshipRepository;
} => {
  const prisma = mockDeep<PrismaService>();
  // the transaction runs on the same mock, so the calls inside it are seen as usual
  prisma.$transaction.mockImplementation(((
    run: (tx: Prisma.TransactionClient) => Promise<unknown>,
  ) => run(prisma)) as never);
  return { prisma, repository: new FriendshipRepository(prisma) };
};

describe('FriendshipRepository (#307)', () => {
  it('finds the pair by its key, whoever asks', async () => {
    const { prisma, repository } = setup();
    prisma.friendship.findUnique.mockResolvedValue(null);

    await repository.findPair(B, A);

    expect(prisma.friendship.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pairKey: PAIR } }),
    );
  });

  it('only an account that is neither blocked nor deleted can be asked', async () => {
    const { prisma, repository } = setup();
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(repository.isAvailable(B)).resolves.toBe(false);
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: B, deletedAt: null, blockedAt: null },
      }),
    );
  });

  it('creates a request with the pair key', async () => {
    const { prisma, repository } = setup();

    await expect(repository.create(A, B)).resolves.toBe(true);
    expect(prisma.friendship.create).toHaveBeenCalledWith({
      data: { requesterId: A, addresseeId: B, pairKey: PAIR },
    });
  });

  it('both asking at once: the unique pair key refuses the second row, reported as false', async () => {
    const { prisma, repository } = setup();
    prisma.friendship.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(repository.create(B, A)).resolves.toBe(false);
  });

  it('any other database error is not swallowed', async () => {
    const { prisma, repository } = setup();
    prisma.friendship.create.mockRejectedValue(new Error('connection lost'));

    await expect(repository.create(A, B)).rejects.toThrow('connection lost');
  });

  it('accepts only the other’s request still waiting for me', async () => {
    const { prisma, repository } = setup();
    const now = new Date('2026-11-19T10:00:00.000Z');
    prisma.friendship.updateMany.mockResolvedValue({ count: 1 });

    await expect(repository.accept(B, A, now)).resolves.toBe(true);
    expect(prisma.friendship.updateMany).toHaveBeenCalledWith({
      where: {
        pairKey: PAIR,
        requesterId: A,
        addresseeId: B,
        status: 'pending',
      },
      data: { status: 'accepted', acceptedAt: now },
    });
    // PO 26. 11.: the request's upozornění goes with it
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: B, type: 'friend_request', targetId: A },
    });
  });

  it('reports a request decided meanwhile as nothing changed', async () => {
    const { prisma, repository } = setup();
    prisma.friendship.updateMany.mockResolvedValue({ count: 0 });

    await expect(repository.reject(B, A)).resolves.toBe(false);
    expect(prisma.friendship.updateMany).toHaveBeenCalledWith({
      where: {
        pairKey: PAIR,
        requesterId: A,
        addresseeId: B,
        status: 'pending',
      },
      data: { status: 'rejected' },
    });
    expect(prisma.notification.deleteMany).not.toHaveBeenCalled();
  });

  it('a rejected request takes its upozornění with it', async () => {
    const { prisma, repository } = setup();
    prisma.friendship.updateMany.mockResolvedValue({ count: 1 });

    await expect(repository.reject(B, A)).resolves.toBe(true);
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: B, type: 'friend_request', targetId: A },
    });
  });

  it('a cancelled request takes its upozornění with it; unfriending leaves the others', async () => {
    const { prisma, repository } = setup();
    prisma.friendship.deleteMany.mockResolvedValue({ count: 1 });

    await repository.remove(A, B, 'cancel');
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: B, type: 'friend_request', targetId: A },
    });
    prisma.notification.deleteMany.mockClear();
    await repository.remove(A, B, 'unfriend');
    expect(prisma.notification.deleteMany).not.toHaveBeenCalled();
  });

  it('a request sent again turns the rejected row round and starts anew', async () => {
    const { prisma, repository } = setup();
    const now = new Date('2026-11-19T10:00:00.000Z');
    prisma.friendship.updateMany.mockResolvedValue({ count: 1 });

    await repository.resend(B, A, now);

    expect(prisma.friendship.updateMany).toHaveBeenCalledWith({
      where: {
        pairKey: PAIR,
        requesterId: A,
        addresseeId: B,
        status: 'rejected',
      },
      data: {
        requesterId: B,
        addresseeId: A,
        status: 'pending',
        acceptedAt: null,
        createdAt: now,
      },
    });
  });

  it.each([
    [
      'cancel',
      {
        pairKey: PAIR,
        requesterId: A,
        status: { in: ['pending', 'rejected'] },
      },
    ],
    ['unfriend', { pairKey: PAIR, status: 'accepted' }],
  ] as const)('%s deletes only that state', async (action, where) => {
    const { prisma, repository } = setup();
    prisma.friendship.deleteMany.mockResolvedValue({ count: 1 });

    await expect(repository.remove(A, B, action)).resolves.toBe(true);
    expect(prisma.friendship.deleteMany).toHaveBeenCalledWith({ where });
  });

  it('lists the rows on either side', () => {
    expect(userFriendshipsWhere(A)).toEqual({
      OR: [{ requesterId: A }, { addresseeId: A }],
    });
  });
});
