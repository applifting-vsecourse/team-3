import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { AccountRepository } from './account.repository';

const now = new Date('2026-11-23T12:00:00Z');

describe('AccountRepository.deleteAccount (B-080, #64)', () => {
  const prisma = mockDeep<PrismaService>();
  const repository = new AccountRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((async (
      run: (tx: PrismaService) => Promise<unknown>,
    ) => run(prisma)) as never);
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    prisma.participation.findMany.mockResolvedValue([
      { eventId: 'e1' },
    ] as never);
  });

  it('anonymizes the row once, only while it is not deleted yet', async () => {
    await repository.deleteAccount('u1', 'jana@example.com', now);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', deletedAt: null },
      data: expect.objectContaining({
        name: 'Smazaný uživatel',
        email: 'deleted-u1@deleted.invalid',
        bio: null,
        image: null,
        username: null,
        homeLocalityId: null,
        deletedAt: now,
      }),
    });
  });

  it('gives up places and requests on events not started yet, past ones stay', async () => {
    await expect(
      repository.deleteAccount('u1', 'jana@example.com', now),
    ).resolves.toEqual(['e1']);
    expect(prisma.participation.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'u1',
        status: { in: ['approved', 'pending'] },
        event: { startsAt: { gt: now } },
      },
      data: { status: 'withdrawn', updatedAt: now },
    });
    // ratings and past participations are not touched: they show the new name
    expect(prisma.rating.deleteMany).not.toHaveBeenCalled();
    expect(prisma.rating.updateMany).not.toHaveBeenCalled();
    expect(prisma.participation.deleteMany).not.toHaveBeenCalled();
  });

  it('makes signing in impossible and removes friendships, memberships and personal lists', async () => {
    await repository.deleteAccount('u1', 'jana@example.com', now);
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prisma.account.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prisma.friendship.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ requesterId: 'u1' }, { addresseeId: 'u1' }] },
    });
    expect(prisma.groupMember.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prisma.userInterest.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prisma.verification.deleteMany).toHaveBeenCalled();
  });

  it('writes nothing more when the account was deleted meanwhile', async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      repository.deleteAccount('u1', 'jana@example.com', now),
    ).resolves.toBeNull();
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    expect(prisma.participation.updateMany).not.toHaveBeenCalled();
  });
});

describe('AccountRepository.exportRows (#64)', () => {
  const prisma = mockDeep<PrismaService>();
  const repository = new AccountRepository(prisma);

  it('reads nothing for a deleted account', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(repository.exportRows('u1')).resolves.toBeNull();
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1', deletedAt: null } }),
    );
    expect(prisma.participation.findMany).not.toHaveBeenCalled();
  });

  it("scopes every list to the person's own id", async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u1' } as never);
    await repository.exportRows('u1');
    const whereOf = (fn: { mock: { calls: unknown[][] } }) =>
      (fn.mock.calls[0][0] as { where: unknown }).where;
    expect(whereOf(prisma.participation.findMany)).toEqual({ userId: 'u1' });
    expect(whereOf(prisma.event.findMany)).toEqual({ organizerUserId: 'u1' });
    expect(whereOf(prisma.groupMember.findMany)).toEqual({ userId: 'u1' });
    expect(whereOf(prisma.notification.findMany)).toEqual({ userId: 'u1' });
    expect(whereOf(prisma.payment.findMany)).toEqual({ userId: 'u1' });
    expect(whereOf(prisma.report.findMany)).toEqual({ reporterId: 'u1' });
    expect(whereOf(prisma.friendship.findMany)).toEqual({
      OR: [{ requesterId: 'u1' }, { addresseeId: 'u1' }],
    });
  });
});
