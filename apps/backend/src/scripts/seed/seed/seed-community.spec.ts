import { PrismaService } from '@/core/prisma/prisma.service';
import {
  communityEvents,
  communityGroups,
  communityUsers,
} from '@/scripts/seed/data/community-data';
import { czechTowns } from '@/scripts/seed/data/czech-towns';
import { demoActivities, demoLocalities } from '@/scripts/seed/data/demo-data';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ensureUser } from './ensure-user';
import { seedCommunity } from './seed-community';

// a factory, so better-auth doesn't load under Jest
jest.mock('./ensure-user', () => ({ ensureUser: jest.fn() }));

const setup = (counts: {
  before: number;
  inTransaction: number;
}): DeepMockProxy<PrismaService> => {
  const prisma = mockDeep<PrismaService>();
  prisma.activity.findMany.mockResolvedValue(
    demoActivities.map((a) => ({ id: `a-${a.slug}`, slug: a.slug })) as never,
  );
  prisma.locality.findMany.mockResolvedValue(
    [...demoLocalities, ...czechTowns].map((l) => ({
      id: `l-${l.slug}`,
      slug: l.slug,
    })) as never,
  );
  // community events before the transaction, then inside it
  prisma.event.count
    .mockResolvedValueOnce(counts.before)
    .mockResolvedValue(counts.inTransaction);
  // the transaction client is the same mock
  prisma.$transaction.mockImplementation(((
    run: (tx: PrismaService) => Promise<unknown>,
  ) => run(prisma)) as never);
  return prisma;
};

describe('seedCommunity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest
      .mocked(ensureUser)
      .mockImplementation(async (_prisma, _auth, { email }) => ({
        user: { id: `u-${email}` } as never,
        created: true,
      }));
  });

  it('inserts the community into a database that already has other events, under the lock', async () => {
    // other (demo, staging) events don't count: only those organized by the community
    const prisma = setup({ before: 0, inTransaction: 0 });

    await seedCommunity(prisma, mockDeep<BetterAuth>());

    expect(ensureUser).toHaveBeenCalledTimes(communityUsers.length);
    expect(prisma.event.count).toHaveBeenCalledWith({
      where: {
        organizerUserId: {
          in: communityUsers.map((u) => `u-${u.email}`),
        },
      },
    });
    const lockAt = prisma.$executeRaw.mock.invocationCallOrder[0]!;
    const recheckAt = prisma.event.count.mock.invocationCallOrder[1]!;
    expect(lockAt).toBeLessThan(recheckAt);
    expect(prisma.group.create).toHaveBeenCalledTimes(communityGroups.length);
    expect(prisma.event.create).toHaveBeenCalledTimes(communityEvents.length);
  });

  it('only creates the missing accounts when the community is already there', async () => {
    const prisma = setup({ before: 80, inTransaction: 80 });

    await seedCommunity(prisma, mockDeep<BetterAuth>());

    expect(ensureUser).toHaveBeenCalledTimes(communityUsers.length);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.event.create).not.toHaveBeenCalled();
    expect(prisma.group.create).not.toHaveBeenCalled();
  });

  it('inserts nothing when a seed running at the same time got there first', async () => {
    const prisma = setup({ before: 0, inTransaction: 80 });

    await seedCommunity(prisma, mockDeep<BetterAuth>());

    expect(prisma.$executeRaw).toHaveBeenCalled();
    expect(prisma.group.create).not.toHaveBeenCalled();
    expect(prisma.event.create).not.toHaveBeenCalled();
  });
});
