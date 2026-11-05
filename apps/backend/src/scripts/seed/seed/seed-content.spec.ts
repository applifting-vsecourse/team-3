import { PrismaService } from '@/core/prisma/prisma.service';
import { czechTowns } from '@/scripts/seed/data/czech-towns';
import {
  DEMO_PASSWORD,
  demoActivities,
  demoLocalities,
} from '@/scripts/seed/data/demo-data';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { seedAccounts } from './content-rows';
import {
  ensureUser,
  replaceSeedPassword,
  restoreSeedPassword,
} from './ensure-user';
import {
  deleteSeedContent,
  REPO_PASSWORD_REPLACED_KEY,
  SEED_DATA_VERSION,
  SEED_STATE_KEY,
  seedContent,
} from './seed-content';

// a factory, so better-auth doesn't load under Jest
jest.mock('./ensure-user', () => ({
  ensureUser: jest.fn(),
  replaceSeedPassword: jest.fn(),
  restoreSeedPassword: jest.fn(),
}));

const accountIds = seedAccounts.map((a) => `u-${a.email}`);

const setup = (versions: {
  before: number | null;
  inTransaction: number | null;
  /** whether an earlier seed already moved the accounts off the repo's password */
  passwordReplaced?: boolean;
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
  // a stored version remembers what that seed inserted
  const state = (version: number | null): object | null =>
    version === null
      ? null
      : {
          key: SEED_STATE_KEY,
          version,
          eventIds: ['seeded-e1', 'seeded-e2'],
          groupIds: ['seeded-g1'],
        };
  // the version before the transaction, then the one inside it
  let dataReads = 0;
  prisma.seedState.findUnique.mockImplementation((({
    where,
  }: {
    where: { key: string };
  }) => {
    if (where.key === REPO_PASSWORD_REPLACED_KEY) {
      return Promise.resolve(
        versions.passwordReplaced
          ? { key: REPO_PASSWORD_REPLACED_KEY, version: 1 }
          : null,
      );
    }
    dataReads++;
    return Promise.resolve(
      state(dataReads === 1 ? versions.before : versions.inTransaction),
    );
  }) as never);
  prisma.event.deleteMany.mockResolvedValue({ count: 3 });
  prisma.group.deleteMany.mockResolvedValue({ count: 1 });
  prisma.event.updateMany.mockResolvedValue({ count: 0 });
  // data from before #181, found by their content
  prisma.event.findMany.mockResolvedValue([{ id: 'legacy-e1' }] as never);
  prisma.group.findMany.mockResolvedValue([{ id: 'legacy-g1' }] as never);
  // the transaction client is the same mock
  prisma.$transaction.mockImplementation(((
    run: (tx: PrismaService) => Promise<unknown>,
  ) => run(prisma)) as never);
  return prisma;
};

describe('seedContent: demo password (N-3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest
      .mocked(ensureUser)
      .mockImplementation(async (_prisma, _auth, { email }) => ({
        user: { id: `u-${email}` } as never,
        created: false,
      }));
    jest.mocked(replaceSeedPassword).mockResolvedValue(true);
  });

  it('signs accounts up with the given password and moves existing ones off the one from the repo', async () => {
    const prisma = setup({ before: SEED_DATA_VERSION, inTransaction: null });
    const auth = mockDeep<BetterAuth>();

    await seedContent(prisma, auth, 'staging-heslo-2026');

    expect(ensureUser).toHaveBeenCalledWith(
      prisma,
      auth,
      expect.objectContaining({ password: 'staging-heslo-2026' }),
    );
    expect(replaceSeedPassword).toHaveBeenCalledTimes(seedAccounts.length);
    expect(replaceSeedPassword).toHaveBeenCalledWith(
      prisma,
      auth,
      accountIds[0],
      DEMO_PASSWORD,
      'staging-heslo-2026',
    );
    expect(prisma.seedState.upsert).toHaveBeenCalledWith({
      where: { key: REPO_PASSWORD_REPLACED_KEY },
      create: { key: REPO_PASSWORD_REPLACED_KEY, version: 1 },
      update: {},
    });
  });

  it('checks the passwords only once: skips them when an earlier seed replaced them', async () => {
    const prisma = setup({
      before: SEED_DATA_VERSION,
      inTransaction: null,
      passwordReplaced: true,
    });

    await seedContent(prisma, mockDeep<BetterAuth>(), 'staging-heslo-2026');

    expect(replaceSeedPassword).not.toHaveBeenCalled();
    expect(prisma.seedState.upsert).not.toHaveBeenCalled();
  });

  it('with the password from the repo neither checks the passwords nor marks them', async () => {
    const prisma = setup({ before: SEED_DATA_VERSION, inTransaction: null });

    await seedContent(prisma, mockDeep<BetterAuth>(), DEMO_PASSWORD);

    expect(replaceSeedPassword).not.toHaveBeenCalled();
    expect(prisma.seedState.upsert).not.toHaveBeenCalled();
  });

  it('does not touch the password of an account it just created', async () => {
    jest
      .mocked(ensureUser)
      .mockImplementation(async (_prisma, _auth, { email }) => ({
        user: { id: `u-${email}` } as never,
        created: true,
      }));
    const prisma = setup({ before: SEED_DATA_VERSION, inTransaction: null });

    await seedContent(prisma, mockDeep<BetterAuth>(), 'staging-heslo-2026');

    expect(replaceSeedPassword).not.toHaveBeenCalled();
  });
});

describe('seedContent (#181)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest
      .mocked(ensureUser)
      .mockImplementation(async (_prisma, _auth, { email }) => ({
        user: { id: `u-${email}` } as never,
        created: false,
      }));
  });

  it('replaces the data of an older version under the lock and writes the new version', async () => {
    const prisma = setup({ before: 1, inTransaction: 1 });

    await seedContent(prisma, mockDeep<BetterAuth>());

    expect(ensureUser).toHaveBeenCalledTimes(seedAccounts.length);
    const lockAt = prisma.$executeRaw.mock.invocationCallOrder[0]!;
    const recheckAt = prisma.seedState.findUnique.mock.invocationCallOrder[1]!;
    const deleteAt = prisma.event.deleteMany.mock.invocationCallOrder[0]!;
    const insertAt = prisma.event.createMany.mock.invocationCallOrder[0]!;
    expect(lockAt).toBeLessThan(recheckAt);
    expect(recheckAt).toBeLessThan(deleteAt);
    expect(deleteAt).toBeLessThan(insertAt);
    for (const table of [
      prisma.group,
      prisma.groupMember,
      prisma.event,
      prisma.participation,
      prisma.rating,
      prisma.participantRating,
    ]) {
      expect(table.createMany).toHaveBeenCalledTimes(1);
    }
    // only what the previous seed inserted goes, as its stored ids say
    expect(prisma.event.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['seeded-e1', 'seeded-e2'] } },
    });
    expect(prisma.group.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['seeded-g1'] } },
    });
    expect(prisma.event.findMany).not.toHaveBeenCalled();
    // and the new version remembers what this seed inserted
    const [{ data: events }] = prisma.event.createMany.mock
      .calls[0] as unknown as [{ data: { id: string }[] }];
    const [{ data: groups }] = prisma.group.createMany.mock
      .calls[0] as unknown as [{ data: { id: string }[] }];
    expect(prisma.seedState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: SEED_STATE_KEY },
        update: expect.objectContaining({
          version: SEED_DATA_VERSION,
          eventIds: events.map((e) => e.id),
          groupIds: groups.map((g) => g.id),
        }),
      }),
    );
  });

  it('puts the profiles of the seed accounts back as the data describe them', async () => {
    const prisma = setup({ before: 1, inTransaction: 1 });

    await seedContent(prisma, mockDeep<BetterAuth>());

    const [first] = seedAccounts;
    expect(prisma.user.update).toHaveBeenCalledTimes(seedAccounts.length);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: `u-${first.email}` },
      data: {
        name: first.name,
        bio: first.bio,
        emailVerified: first.emailVerified,
        homeLocalityId: `l-${first.homeLocalitySlug}`,
      },
    });
    expect(prisma.userInterest.deleteMany).toHaveBeenCalledWith({
      where: { userId: { in: accountIds } },
    });
    expect(prisma.userInterest.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        {
          userId: `u-${first.email}`,
          activityId: `a-${first.interestSlugs[0]}`,
        },
      ]),
    });
  });

  it('recognises the data from before #181 by their content, not by who organizes them', async () => {
    const prisma = setup({ before: null, inTransaction: null });

    await seedContent(prisma, mockDeep<BetterAuth>());

    expect(prisma.event.findMany).toHaveBeenCalledWith({
      where: {
        OR: expect.arrayContaining([
          expect.objectContaining({ title: expect.any(String) }),
        ]),
      },
      select: { id: true },
    });
    expect(prisma.event.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['legacy-e1'] } },
    });
    expect(prisma.group.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['legacy-g1'] } },
    });
    expect(prisma.event.createMany).toHaveBeenCalled();
    expect(prisma.seedState.upsert).toHaveBeenCalled();
  });

  it('with a new version gives every seed account the seed password back, after the transaction (#229)', async () => {
    const prisma = setup({ before: 1, inTransaction: 1 });
    const auth = mockDeep<BetterAuth>();
    jest.mocked(restoreSeedPassword).mockResolvedValue(false);
    jest.mocked(restoreSeedPassword).mockResolvedValueOnce(true);

    await seedContent(prisma, auth, 'staging-heslo-2026');

    expect(restoreSeedPassword).toHaveBeenCalledTimes(seedAccounts.length);
    expect(restoreSeedPassword).toHaveBeenCalledWith(
      prisma,
      auth,
      accountIds[0],
      'staging-heslo-2026',
    );
    // scrypt for every account would otherwise hold the content lock
    const transactionAt = prisma.$transaction.mock.invocationCallOrder[0]!;
    const restoreAt =
      jest.mocked(restoreSeedPassword).mock.invocationCallOrder[0]!;
    expect(transactionAt).toBeLessThan(restoreAt);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('1 got the seed password back'),
    );
  });

  it('only creates the missing accounts when the data are of the current version', async () => {
    const prisma = setup({
      before: SEED_DATA_VERSION,
      inTransaction: SEED_DATA_VERSION,
    });

    await seedContent(prisma, mockDeep<BetterAuth>());

    expect(ensureUser).toHaveBeenCalledTimes(seedAccounts.length);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.event.deleteMany).not.toHaveBeenCalled();
    // a tester's own password stays until the next version
    expect(restoreSeedPassword).not.toHaveBeenCalled();
  });

  it('changes nothing when a seed running at the same time got there first', async () => {
    const prisma = setup({ before: 1, inTransaction: SEED_DATA_VERSION });

    await seedContent(prisma, mockDeep<BetterAuth>());

    expect(prisma.$executeRaw).toHaveBeenCalled();
    expect(prisma.event.deleteMany).not.toHaveBeenCalled();
    expect(prisma.event.createMany).not.toHaveBeenCalled();
    expect(prisma.seedState.upsert).not.toHaveBeenCalled();
    // the seed that replaced the data restored the passwords
    expect(restoreSeedPassword).not.toHaveBeenCalled();
  });
});

describe('deleteSeedContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  const seeded = { eventIds: ['e1', 'e2'], groupIds: ['g1'] };

  it('removes only the events and groups the seed inserted', async () => {
    const prisma = setup({ before: null, inTransaction: null });

    await deleteSeedContent(prisma, seeded, ['u1']);

    expect(prisma.event.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['e1', 'e2'] } },
    });
    expect(prisma.group.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['g1'] } },
    });
  });

  // QA on staging creates events under demo accounts (migration 20261025190000)
  it("detaches testers' events from the removed groups instead of deleting them, before the groups go", async () => {
    const prisma = setup({ before: null, inTransaction: null });

    await deleteSeedContent(prisma, seeded, ['u1']);

    expect(prisma.event.updateMany).toHaveBeenCalledWith({
      where: { groupId: { in: ['g1'] }, id: { notIn: ['e1', 'e2'] } },
      data: { groupId: null },
    });
    // a group with events cannot be deleted (onDelete: Restrict)
    expect(prisma.event.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.group.deleteMany.mock.invocationCallOrder[0],
    );
    expect(prisma.event.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.group.deleteMany.mock.invocationCallOrder[0],
    );
  });

  it('logs what goes and how many events of seed accounts stay', async () => {
    const prisma = setup({ before: null, inTransaction: null });
    prisma.event.count.mockResolvedValue(4);

    await deleteSeedContent(prisma, seeded, ['u1']);

    expect(prisma.event.count).toHaveBeenCalledWith({
      where: { organizerUserId: { in: ['u1'] }, id: { notIn: ['e1', 'e2'] } },
    });
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/3 events, 1 groups.*Kept 4 events/),
    );
  });
});
