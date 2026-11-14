import { PrismaService } from '@/core/prisma/prisma.service';
import { eventOverWhere } from '@/modules/event/domain/event-over';
import { mockDeep } from 'jest-mock-extended';
import { UserRepository } from './user.repository';

describe('public profile database predicates (#179)', () => {
  const prisma = mockDeep<PrismaService>();
  const repository = new UserRepository(prisma);
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.participantRating.findMany.mockResolvedValue([]);
    prisma.rating.findMany.mockResolvedValue([]);
    prisma.event.findMany.mockResolvedValue([]);
  });
  it('does not fetch private user account fields or expose deleted/blocked profiles', async () => {
    await repository.getPublicUser('user');
    const query = prisma.user.findFirst.mock.calls[0]![0]!;
    expect(query.where).toEqual({
      id: 'user',
      deletedAt: null,
      blockedAt: null,
    });
    for (const field of [
      'email',
      'accounts',
      'sessions',
      'homeLocality',
      'groupMemberships',
      'participations',
    ])
      expect(query.select).not.toHaveProperty(field);
  });
  it('queries only the subject personal public event history and visible past ratings', async () => {
    const now = new Date('2026-11-06T12:00:00Z');
    await repository.details('user', now);
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizerUserId: 'user',
          groupId: null,
          visibility: 'public',
          status: 'published',
          ...eventOverWhere(now),
        },
      }),
    );
    expect(prisma.rating.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          event: {
            organizerUserId: 'user',
            groupId: null,
            status: 'published',
            OR: expect.any(Array),
          },
        },
      }),
    );
    expect(prisma.participantRating.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          participantId: 'user',
          deletedAt: null,
          event: { status: 'published', OR: expect.any(Array) },
        },
      }),
    );
  });
  it('counts approved participants without fetching their identities or pending requests', async () => {
    await repository.details('user', new Date('2026-11-06T12:00:00Z'));
    const query = prisma.event.findMany.mock.calls[0]![0]!;
    expect(query.select).not.toHaveProperty('participations');
    expect(query.select).toMatchObject({
      _count: { select: { participations: { where: { status: 'approved' } } } },
    });
  });
});
