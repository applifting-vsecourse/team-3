import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import {
  activeFriendsOfWhere,
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

  it('an invite makes the friendship at once (#406)', async () => {
    const { prisma, repository } = setup();
    const now = new Date('2026-11-23T10:00:00.000Z');

    await expect(repository.createAccepted(A, B, now)).resolves.toBe(true);
    expect(prisma.friendship.create).toHaveBeenCalledWith({
      data: {
        requesterId: A,
        addresseeId: B,
        pairKey: PAIR,
        status: 'accepted',
        acceptedAt: now,
      },
    });
  });

  it('an invite turns the row the rules saw into the friendship (#406)', async () => {
    const { prisma, repository } = setup();
    const now = new Date('2026-11-23T10:00:00.000Z');
    prisma.friendship.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.promote(
        { requesterId: B, addresseeId: A, status: 'rejected' },
        now,
      ),
    ).resolves.toBe(false);
    expect(prisma.friendship.updateMany).toHaveBeenCalledWith({
      where: {
        pairKey: PAIR,
        requesterId: B,
        addresseeId: A,
        status: 'rejected',
      },
      data: { status: 'accepted', acceptedAt: now },
    });
  });
});

describe('FriendshipRepository.mutualFriendships (#473)', () => {
  it('my friends count only accepted either way and active: a blocked, deleted or unverified friend doesn’t', () => {
    expect(activeFriendsOfWhere(A)).toEqual({
      emailVerified: true,
      blockedAt: null,
      deletedAt: null,
      OR: [
        {
          sentFriendRequests: { some: { addresseeId: A, status: 'accepted' } },
        },
        {
          receivedFriendRequests: {
            some: { requesterId: A, status: 'accepted' },
          },
        },
      ],
    });
  });

  it('loads only ids: my active friends, then their accepted friendships with the others', async () => {
    const { prisma, repository } = setup();
    prisma.user.findMany.mockResolvedValue([
      { id: 'f1' },
      { id: 'f2' },
    ] as never);
    prisma.friendship.findMany.mockResolvedValue([
      { requesterId: 'f1', addresseeId: 'p' },
    ] as never);

    await expect(repository.mutualFriendships(A, ['p', 'q'])).resolves.toEqual({
      myFriendIds: ['f1', 'f2'],
      pairs: [{ requesterId: 'f1', addresseeId: 'p' }],
    });
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: activeFriendsOfWhere(A),
      select: { id: true },
    });
    expect(prisma.friendship.findMany).toHaveBeenCalledWith({
      where: {
        status: 'accepted',
        OR: [
          {
            requesterId: { in: ['f1', 'f2'] },
            addresseeId: { in: ['p', 'q'] },
          },
          {
            requesterId: { in: ['p', 'q'] },
            addresseeId: { in: ['f1', 'f2'] },
          },
        ],
      },
      select: { requesterId: true, addresseeId: true },
    });
  });

  it('without friends or people to compare, no friendships are read', async () => {
    const { prisma, repository } = setup();
    prisma.user.findMany.mockResolvedValue([]);

    await repository.mutualFriendships(A, ['p']);
    await repository.mutualFriendships(A, []);

    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.friendship.findMany).not.toHaveBeenCalled();
  });
});
