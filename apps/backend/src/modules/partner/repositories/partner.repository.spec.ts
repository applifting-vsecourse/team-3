import { PrismaService } from '@/core/prisma/prisma.service';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { PartnerRepository } from './partner.repository';

const setup = (): {
  prisma: DeepMockProxy<PrismaService>;
  repository: PartnerRepository;
} => {
  const prisma = mockDeep<PrismaService>();
  return { prisma, repository: new PartnerRepository(prisma) };
};

const now = new Date('2026-11-23T10:00:00.000Z');

describe('PartnerRepository (#84)', () => {
  it('reads the viewer only while the account is neither deleted nor blocked', async () => {
    const { prisma, repository } = setup();
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(repository.viewer('me')).resolves.toBeNull();
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'me', deletedAt: null, blockedAt: null },
      }),
    );
  });

  it('gives the viewer’s home, interest ids, onboarding and visibility', async () => {
    const { prisma, repository } = setup();
    prisma.user.findFirst.mockResolvedValue({
      onboardingCompletedAt: new Date('2026-11-20T10:00:00.000Z'),
      partnerDiscoverable: false,
      homeLocality: { lat: 50, lng: 14 },
      interests: [{ activityId: 'a1' }, { activityId: 'a2' }],
    } as never);

    await expect(repository.viewer('me')).resolves.toEqual({
      home: { lat: 50, lng: 14 },
      interestIds: ['a1', 'a2'],
      hasOnboarded: true,
      isDiscoverable: false,
    });
  });

  it('loads candidates without e-mail or exact data beyond the locality centre, with only their request waiting for me', async () => {
    const { prisma, repository } = setup();
    prisma.user.findMany.mockResolvedValue([]);
    const where = { id: { not: 'me' } };

    await repository.candidates('me', where);

    const args = prisma.user.findMany.mock.calls[0][0];
    expect(args?.where).toBe(where);
    expect(args?.select).not.toHaveProperty('email');
    expect(args?.select).not.toHaveProperty('image');
    expect(args?.select?.sentFriendRequests).toEqual({
      where: { addresseeId: 'me', status: 'pending' },
      select: { id: true },
    });
    // ranked whole: a cap before ranking would drop people the order puts first
    expect(args?.take).toBeUndefined();
  });

  it('a skip is one row per direction; skipping again starts the 90 days anew', async () => {
    const { prisma, repository } = setup();

    await repository.skip('me', 'other', now);

    expect(prisma.partnerSkip.upsert).toHaveBeenCalledWith({
      where: { skipperId_skippedId: { skipperId: 'me', skippedId: 'other' } },
      create: { skipperId: 'me', skippedId: 'other', createdAt: now },
      update: { createdAt: now },
    });
  });

  it('Vrátit deletes only my skip of that person', async () => {
    const { prisma, repository } = setup();

    await repository.unskip('me', 'other');

    expect(prisma.partnerSkip.deleteMany).toHaveBeenCalledWith({
      where: { skipperId: 'me', skippedId: 'other' },
    });
  });

  it('only an account that is neither blocked nor deleted can be skipped', async () => {
    const { prisma, repository } = setup();
    prisma.user.findFirst.mockResolvedValue({ id: 'other' } as never);

    await expect(repository.isAvailable('other')).resolves.toBe(true);
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'other', deletedAt: null, blockedAt: null },
      }),
    );
  });

  it('the home cap reads the visit, Skrýt and the friends that still have an account (#474)', async () => {
    const { prisma, repository } = setup();
    const visitedAt = new Date('2026-11-20T10:00:00.000Z');
    prisma.user.findFirst.mockResolvedValue({
      partnersVisitedAt: visitedAt,
      partnersHomeHiddenUntil: null,
    } as never);
    prisma.friendship.count.mockResolvedValue(4);

    await expect(repository.homeState('me')).resolves.toEqual({
      visitedAt,
      hiddenUntil: null,
      friendsCount: 4,
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'me', deletedAt: null, blockedAt: null },
      }),
    );
    const available = { deletedAt: null, blockedAt: null };
    expect(prisma.friendship.count).toHaveBeenCalledWith({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: 'me', addressee: available },
          { addresseeId: 'me', requester: available },
        ],
      },
    });
  });

  it('a gone account has no home cap', async () => {
    const { prisma, repository } = setup();
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(repository.homeState('me')).resolves.toBeNull();
    expect(prisma.friendship.count).not.toHaveBeenCalled();
  });

  it('a visit to /partaci and Skrýt are stored on the user, not in the browser (#474)', async () => {
    const { prisma, repository } = setup();
    const until = new Date('2026-12-28T10:00:00.000Z');

    await repository.recordVisit('me', now);
    await repository.hideHome('me', until);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'me' },
      data: { partnersVisitedAt: now },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'me' },
      data: { partnersHomeHiddenUntil: until },
    });
  });
});
