import { PrismaService } from '@/core/prisma/prisma.service';
import {
  decideBlock,
  decideUnblock,
} from '@/modules/admin/domain/user-moderation';
import { mockDeep } from 'jest-mock-extended';
import { UserModerationRepository } from './user-moderation.repository';

const now = new Date('2026-11-27T10:00:00.000Z');

type Row = {
  role: string;
  blockedAt: Date | null;
  deletedAt: Date | null;
} | null;

const setup = (
  user: Row,
): {
  prisma: ReturnType<typeof mockDeep<PrismaService>>;
  repository: UserModerationRepository;
} => {
  const prisma = mockDeep<PrismaService>();
  // the transaction client is the same mock
  prisma.$transaction.mockImplementation(((
    run: (tx: PrismaService) => Promise<unknown>,
  ) => run(prisma)) as never);
  prisma.user.findUnique.mockResolvedValue(user as never);
  return { prisma, repository: new UserModerationRepository(prisma) };
};

const active: Row = { role: 'user', blockedAt: null, deletedAt: null };
const blocked: Row = { role: 'user', blockedAt: now, deletedAt: null };

describe('UserModerationRepository.blockUser (PO 26. 11., B-063)', () => {
  it('locks the user, blocks them, ends their sessions and writes block_user with who and why', async () => {
    const { prisma, repository } = setup(active);

    await expect(
      repository.blockUser('u1', 'admin1', 'Spam', now, decideBlock),
    ).resolves.toEqual({ ok: true });

    expect(prisma.$executeRaw).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { blockedAt: now },
    });
    // signed out everywhere at once
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
    });
    expect(prisma.moderationAction.create).toHaveBeenCalledWith({
      data: {
        type: 'block_user',
        targetType: 'user',
        targetId: 'u1',
        reason: 'Spam',
        adminId: 'admin1',
      },
    });
  });

  it('a refused block changes and writes nothing', async () => {
    const { prisma, repository } = setup(blocked);

    await expect(
      repository.blockUser('u1', 'admin1', 'Spam', now, decideBlock),
    ).resolves.toEqual({ ok: false, refusal: 'USER_ALREADY_BLOCKED' });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    expect(prisma.moderationAction.create).not.toHaveBeenCalled();
  });

  it('no such user, or a deleted account: null', async () => {
    for (const user of [
      null,
      { role: 'user', blockedAt: null, deletedAt: now },
    ]) {
      const { prisma, repository } = setup(user);

      await expect(
        repository.blockUser('u1', 'admin1', 'Spam', now, decideBlock),
      ).resolves.toBeNull();
      expect(prisma.user.update).not.toHaveBeenCalled();
    }
  });
});

describe('UserModerationRepository.unblockUser (PO 26. 11., B-063)', () => {
  it('unblocks and marks the block reverted, by whom and when: the state is back', async () => {
    const { prisma, repository } = setup(blocked);

    await expect(
      repository.unblockUser('u1', 'admin1', now, decideUnblock),
    ).resolves.toEqual({ ok: true });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { blockedAt: null },
    });
    expect(prisma.moderationAction.updateMany).toHaveBeenCalledWith({
      where: {
        type: 'block_user',
        targetType: 'user',
        targetId: 'u1',
        revertedAt: null,
      },
      data: { revertedAt: now, revertedById: 'admin1' },
    });
  });

  it('a user who isn’t blocked: refused, nothing written', async () => {
    const { prisma, repository } = setup(active);

    await expect(
      repository.unblockUser('u1', 'admin1', now, decideUnblock),
    ).resolves.toEqual({ ok: false, refusal: 'USER_NOT_BLOCKED' });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.moderationAction.updateMany).not.toHaveBeenCalled();
  });
});

describe('UserModerationRepository.overview (/sprava)', () => {
  it('each with its latest unreverted reason, deactivations newest first', async () => {
    const { prisma, repository } = setup(null);
    const startsAt = new Date('2026-12-01T18:00:00.000Z');
    prisma.event.findMany.mockResolvedValue([
      { id: 'e-old', title: 'Starší', startsAt },
      { id: 'e-new', title: 'Novější', startsAt },
    ] as never);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'Jakub Král', blockedAt: now },
    ] as never);
    prisma.moderationAction.findMany.mockResolvedValue([
      // newest first, as the query orders them
      {
        targetId: 'e-new',
        reason: 'Podvod',
        createdAt: new Date('2026-11-26T10:00:00.000Z'),
      },
      {
        targetId: 'u1',
        reason: 'Spam',
        createdAt: new Date('2026-11-25T10:00:00.000Z'),
      },
      {
        targetId: 'e-old',
        reason: 'Nevhodné',
        createdAt: new Date('2026-11-20T10:00:00.000Z'),
      },
      {
        targetId: 'u1',
        reason: 'Starší důvod',
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
      },
    ] as never);

    const overview = await repository.overview();

    expect(
      overview.hiddenEvents.map((event) => [event.id, event.reason]),
    ).toEqual([
      ['e-new', 'Podvod'],
      ['e-old', 'Nevhodné'],
    ]);
    expect(overview.blockedUsers).toEqual([
      { id: 'u1', name: 'Jakub Král', blockedAt: now, reason: 'Spam' },
    ]);
    expect(prisma.moderationAction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ revertedAt: null }),
      }),
    );
  });
});
