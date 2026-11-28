import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { PROFILE_OVERVIEW_TAKE } from '@/modules/profile/domain/profile';
import { mockDeep } from 'jest-mock-extended';
import { ProfileRepository } from './profile.repository';

describe('private profile queries (#178)', () => {
  const prisma = mockDeep<PrismaService>();
  const repository = new ProfileRepository(prisma);
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.participantRating.findMany.mockResolvedValue([]);
    prisma.rating.findMany.mockResolvedValue([]);
    prisma.participantRating.aggregate.mockResolvedValue({
      _sum: { stars: null },
      _count: { _all: 0 },
    } as never);
    prisma.rating.aggregate.mockResolvedValue({
      _sum: { organizerStars: null },
      _count: { _all: 0 },
    } as never);
  });
  it('loads no events: they are in Moje, GET /api/me/events (#367)', async () => {
    const result = await repository.overview('owner');
    expect(prisma.event.findMany).not.toHaveBeenCalled();
    expect(prisma.event.count).not.toHaveBeenCalled();
    expect(prisma.participation.findMany).not.toHaveBeenCalled();
    expect(prisma.participation.count).not.toHaveBeenCalled();
    expect(Object.keys(result).sort()).toEqual([
      'organizerRatings',
      'organizerSummary',
      'participantRatings',
      'participantSummary',
    ]);
  });
  it('scopes received ratings to the owner and excludes moderated ratings/events', async () => {
    const result = await repository.overview('owner');
    expect(prisma.participantRating.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          participantId: 'owner',
          deletedAt: null,
          event: { status: 'published' },
        },
      }),
    );
    expect(prisma.rating.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          event: {
            organizerUserId: 'owner',
            groupId: null,
            status: 'published',
          },
        },
      }),
    );
    expect(result.participantSummary).toEqual({ average: null, count: 0 });
    expect(result.organizerSummary).toEqual({ average: null, count: 0 });
  });
  it('projects rating authors without extra account/contact fields', async () => {
    prisma.rating.findMany.mockResolvedValue([
      {
        id: 'rating',
        organizerStars: 4,
        comment: 'Díky za akci.',
        createdAt: new Date(),
        user: {
          id: 'rater',
          name: 'Petr',
          email: 'private@example.com',
          accessToken: 'test-private-token',
        },
        event: { id: 'event', title: 'Volejbal' },
      },
    ] as never);
    prisma.rating.aggregate.mockResolvedValue({
      _sum: { organizerStars: 4 },
      _count: { _all: 1 },
    } as never);
    const result = await repository.overview('owner');
    expect(result.organizerSummary).toEqual({ average: 4, count: 1 });
    expect(result.organizerRatings[0].author).toEqual({
      id: 'rater',
      name: 'Petr',
    });
    expect(JSON.stringify(result)).not.toMatch(
      /private@example|test-private-token/,
    );
  });
  it('loads only a slice of the ratings, with the averages of everything (Figma B-05)', async () => {
    prisma.participantRating.aggregate.mockResolvedValue({
      _sum: { stars: 27 },
      _count: { _all: 6 },
    } as never);
    const result = await repository.overview('owner');
    for (const finder of [
      prisma.participantRating.findMany,
      prisma.rating.findMany,
    ])
      for (const [query] of finder.mock.calls)
        expect(query?.take).toBe(PROFILE_OVERVIEW_TAKE);
    expect(PROFILE_OVERVIEW_TAKE).toBe(50);
    // the averages use the same owner-scoped filters as the lists
    expect(prisma.participantRating.aggregate.mock.calls[0][0].where).toEqual(
      prisma.participantRating.findMany.mock.calls[0][0]?.where,
    );
    expect(prisma.rating.aggregate.mock.calls[0][0].where).toEqual(
      prisma.rating.findMany.mock.calls[0][0]?.where,
    );
    expect(result).toMatchObject({
      participantSummary: { average: 4.5, count: 6 },
    });
  });
});

describe('saving a new home (#84)', () => {
  const prisma = mockDeep<PrismaService>();
  const repository = new ProfileRepository(prisma);
  const expected = {
    homeLocalityChangeDay: '2026-11-23',
    homeLocalityChangeCount: 2,
  };
  beforeEach(() => jest.clearAllMocks());

  it('writes only while the change counter is still the one read', async () => {
    prisma.user.update.mockResolvedValue({} as never);
    await repository.save('owner', { homeLocalityChangeCount: 3 }, expected);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'owner',
          deletedAt: null,
          blockedAt: null,
          ...expected,
        },
      }),
    );
  });

  it('another change got there first: null, nothing written past the limit', async () => {
    prisma.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );
    await expect(
      repository.save('owner', { homeLocalityChangeCount: 3 }, expected),
    ).resolves.toBeNull();
  });
});
