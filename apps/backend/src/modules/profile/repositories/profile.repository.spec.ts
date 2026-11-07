import { PrismaService } from '@/core/prisma/prisma.service';
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
        deletedAt: null,
        user: {
          id: 'rater',
          name: 'Petr',
          email: 'private@example.com',
          accessToken: 'test-private-token',
        },
        event: { id: 'event', title: 'Volejbal', groupId: null },
      },
    ] as never);
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
});
