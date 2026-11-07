import { PrismaService } from '@/core/prisma/prisma.service';
import { PROFILE_OVERVIEW_TAKE } from '@/modules/profile/domain/profile';
import { mockDeep } from 'jest-mock-extended';
import { ProfileRepository } from './profile.repository';

describe('private profile queries (#178)', () => {
  const prisma = mockDeep<PrismaService>();
  const repository = new ProfileRepository(prisma);
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.event.findMany.mockResolvedValue([]);
    prisma.participation.findMany.mockResolvedValue([]);
    prisma.participantRating.findMany.mockResolvedValue([]);
    prisma.rating.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(0);
    prisma.participation.count.mockResolvedValue(0);
    prisma.participantRating.aggregate.mockResolvedValue({
      _sum: { stars: null },
      _count: { _all: 0 },
    } as never);
    prisma.rating.aggregate.mockResolvedValue({
      _sum: { organizerStars: null },
      _count: { _all: 0 },
    } as never);
  });
  it('scopes organizing, participation and received ratings to the owner and excludes moderated ratings/events', async () => {
    const result = await repository.overview(
      'owner',
      new Date('2026-11-05T12:00:00Z'),
    );
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizerUserId: 'owner',
          status: { in: ['published', 'cancelled'] },
        },
      }),
    );
    for (const [query] of prisma.participation.findMany.mock.calls)
      expect(query?.where?.userId).toBe('owner');
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
    const result = await repository.overview('owner', new Date());
    expect(result.organizerSummary).toEqual({ average: 4, count: 1 });
    expect(result.organizerRatings[0].author).toEqual({
      id: 'rater',
      name: 'Petr',
    });
    expect(JSON.stringify(result)).not.toMatch(
      /private@example|test-private-token/,
    );
  });
  it('loads only a slice of each section, with the totals and averages of everything (Figma B-05)', async () => {
    prisma.event.count.mockResolvedValue(7);
    prisma.participation.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(12);
    prisma.participantRating.aggregate.mockResolvedValue({
      _sum: { stars: 27 },
      _count: { _all: 6 },
    } as never);
    const result = await repository.overview('owner', new Date());
    for (const finder of [
      prisma.event.findMany,
      prisma.participation.findMany,
      prisma.participantRating.findMany,
      prisma.rating.findMany,
    ])
      for (const [query] of finder.mock.calls)
        expect(query?.take).toBe(PROFILE_OVERVIEW_TAKE);
    expect(PROFILE_OVERVIEW_TAKE).toBe(3);
    // the counts use the same owner-scoped filters as the lists
    expect(prisma.event.count.mock.calls[0][0]?.where).toEqual(
      prisma.event.findMany.mock.calls[0][0]?.where,
    );
    expect(prisma.participantRating.aggregate.mock.calls[0][0].where).toEqual(
      prisma.participantRating.findMany.mock.calls[0][0]?.where,
    );
    expect(prisma.rating.aggregate.mock.calls[0][0].where).toEqual(
      prisma.rating.findMany.mock.calls[0][0]?.where,
    );
    expect(result).toMatchObject({
      organizingTotal: 7,
      upcomingTotal: 5,
      pastTotal: 12,
      participantSummary: { average: 4.5, count: 6 },
    });
  });
});
