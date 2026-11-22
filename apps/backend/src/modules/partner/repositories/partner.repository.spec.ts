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

  it('gives the viewer’s home and interest ids', async () => {
    const { prisma, repository } = setup();
    prisma.user.findFirst.mockResolvedValue({
      homeLocality: { lat: 50, lng: 14 },
      interests: [{ activityId: 'a1' }, { activityId: 'a2' }],
    } as never);

    await expect(repository.viewer('me')).resolves.toEqual({
      home: { lat: 50, lng: 14 },
      interestIds: ['a1', 'a2'],
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
    expect(args?.take).toBe(1000);
  });

  it('counts the requests I sent since the moment (the daily limit)', async () => {
    const { prisma, repository } = setup();
    prisma.friendship.count.mockResolvedValue(3);

    await expect(repository.requestsSentSince('me', now)).resolves.toBe(3);
    expect(prisma.friendship.count).toHaveBeenCalledWith({
      where: { requesterId: 'me', createdAt: { gte: now } },
    });
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
});
