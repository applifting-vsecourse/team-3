import { PrismaService } from '@/core/prisma/prisma.service';
import {
  demoActivities,
  demoEvents,
  demoGroups,
  demoLocalities,
} from '@/scripts/seed/data/demo-data';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ensureUser } from './ensure-user';
import { seedDemo } from './seed-demo';

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
    demoLocalities.map((l) => ({ id: `l-${l.slug}`, slug: l.slug })) as never,
  );
  // the count before the transaction, then the one inside it
  prisma.event.count
    .mockResolvedValueOnce(counts.before)
    .mockResolvedValue(counts.inTransaction);
  prisma.group.count.mockResolvedValue(0);
  // the transaction client is the same mock
  prisma.$transaction.mockImplementation(((
    run: (tx: PrismaService) => Promise<unknown>,
  ) => run(prisma)) as never);
  return prisma;
};

describe('seedDemo', () => {
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

  it('inserts the demo groups and events into an empty database, under the lock', async () => {
    const prisma = setup({ before: 0, inTransaction: 0 });

    await seedDemo(prisma, mockDeep<BetterAuth>());

    expect(prisma.$executeRaw).toHaveBeenCalled();
    expect(prisma.group.create).toHaveBeenCalledTimes(demoGroups.length);
    expect(prisma.event.create).toHaveBeenCalledTimes(demoEvents.length);
  });

  it('inserts nothing into a database that already has events', async () => {
    const prisma = setup({ before: 1, inTransaction: 1 });

    await seedDemo(prisma, mockDeep<BetterAuth>());

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it('inserts nothing when a seed running at the same time got there first', async () => {
    // empty when checked, but the other seed committed before the lock was ours
    const prisma = setup({ before: 0, inTransaction: 59 });

    await seedDemo(prisma, mockDeep<BetterAuth>());

    expect(prisma.$executeRaw).toHaveBeenCalled();
    expect(prisma.group.create).not.toHaveBeenCalled();
    expect(prisma.event.create).not.toHaveBeenCalled();
  });
});
