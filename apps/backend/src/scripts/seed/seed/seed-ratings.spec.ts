import { PrismaService } from '@/core/prisma/prisma.service';
import {
  demoActivities,
  demoLocalities,
  demoUsers,
} from '@/scripts/seed/data/demo-data';
import { pastEvents } from '@/scripts/seed/data/rating-data';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { seedRatings } from './seed-ratings';

const setup = (counts: {
  before: number;
  inTransaction: number;
  missingUsers?: number;
}): DeepMockProxy<PrismaService> => {
  const prisma = mockDeep<PrismaService>();
  // participant ratings before the transaction, then inside it
  prisma.participantRating.count
    .mockResolvedValueOnce(counts.before)
    .mockResolvedValue(counts.inTransaction);
  // answers the query: the requested e-mails, minus the first `missingUsers`
  prisma.user.findMany.mockImplementation(((args: {
    where: { email: { in: string[] } };
  }) =>
    Promise.resolve(
      demoUsers
        .filter((u) => args.where.email.in.includes(u.email))
        .slice(counts.missingUsers ?? 0)
        .map((u) => ({ id: `u-${u.key}`, email: u.email })),
    )) as never);
  prisma.activity.findMany.mockResolvedValue(
    demoActivities.map((a) => ({ id: `a-${a.slug}`, slug: a.slug })) as never,
  );
  prisma.locality.findMany.mockResolvedValue(
    demoLocalities.map((l) => ({ id: `l-${l.slug}`, slug: l.slug })) as never,
  );
  prisma.event.create.mockImplementation(((args: { data: { title: string } }) =>
    Promise.resolve({ id: `e-${args.data.title}` })) as never);
  // the transaction client is the same mock
  prisma.$transaction.mockImplementation(((
    run: (tx: PrismaService) => Promise<unknown>,
  ) => run(prisma)) as never);
  return prisma;
};

describe('seedRatings (#180)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('inserts the past events with both kinds of rating, under the lock', async () => {
    const prisma = setup({ before: 0, inTransaction: 0 });

    await seedRatings(prisma);

    const lockAt = prisma.$executeRaw.mock.invocationCallOrder[0]!;
    const recheckAt =
      prisma.participantRating.count.mock.invocationCallOrder[1]!;
    expect(lockAt).toBeLessThan(recheckAt);
    expect(prisma.event.create).toHaveBeenCalledTimes(pastEvents.length);

    const volejbal = pastEvents[0];
    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: volejbal.title,
          organizerUserId: `u-${volejbal.organizerKey}`,
          status: 'published',
        }),
      }),
    );
    expect(prisma.rating.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          eventId: `e-${volejbal.title}`,
          userId: 'u-u14',
          deletedAt: expect.any(Date),
        }),
      ]),
    });
    expect(prisma.participantRating.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        {
          eventId: `e-${volejbal.title}`,
          participantId: 'u-uzivatel',
          stars: 5,
          deletedAt: null,
        },
      ]),
    });
  });

  it('inserts nothing when the ratings are already there (another deploy)', async () => {
    const prisma = setup({ before: 3, inTransaction: 3 });

    await seedRatings(prisma);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it('inserts nothing when a seed running at the same time got there first', async () => {
    const prisma = setup({ before: 0, inTransaction: 9 });

    await seedRatings(prisma);

    expect(prisma.event.create).not.toHaveBeenCalled();
    expect(prisma.participantRating.createMany).not.toHaveBeenCalled();
  });

  it('inserts nothing without the demo users it needs', async () => {
    const prisma = setup({ before: 0, inTransaction: 0, missingUsers: 3 });

    await seedRatings(prisma);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
