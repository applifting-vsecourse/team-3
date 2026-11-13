import { PrismaService } from '@/core/prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { RatingRepository } from './rating.repository';

const startsAt = new Date('2026-10-31T17:00:00.000Z');
const updatedAt = new Date('2026-11-01T08:00:00.000Z');
const input = { eventStars: 5, organizerStars: 4, comment: null };

// the event as Prisma returns it with publicEventInclude
const eventRow = {
  id: 'e1',
  title: 'Volejbal na Letné',
  description: 'Hrajeme na dva sety.',
  status: 'published',
  startsAt,
  endsAt: null,
  address: 'Sportovní areál Letná, Praha 7',
  organizerUserId: 'u-petra',
  minParticipants: 4,
  activity: {
    id: 'a1',
    slug: 'volejbal',
    name: 'Volejbal',
    keywords: ['volley'],
    category: {
      id: 'c1',
      slug: 'tymove-sporty',
      name: 'Týmové sporty',
      icon: 'ball',
      sortOrder: 1,
    },
  },
  locality: {
    id: 'l1',
    slug: 'praha-7',
    name: 'Praha 7',
    lat: 50.1,
    lng: 14.4,
  },
  organizer: { id: 'u-petra', name: 'Petra Nováková' },
  group: null,
  _count: { participations: 5 },
};

// what the rating page gets of it: nothing more than an event card shows
const ratedEvent = {
  id: 'e1',
  title: 'Volejbal na Letné',
  startsAt,
  endsAt: null,
  address: 'Sportovní areál Letná, Praha 7',
  status: 'published',
  activity: {
    id: 'a1',
    slug: 'volejbal',
    name: 'Volejbal',
    category: {
      id: 'c1',
      slug: 'tymove-sporty',
      name: 'Týmové sporty',
      icon: 'ball',
    },
  },
  locality: { id: 'l1', slug: 'praha-7', name: 'Praha 7' },
  organizer: { id: 'u-petra', name: 'Petra Nováková' },
  group: null,
  approvedCount: 5,
  minParticipants: 4,
};

// the transaction runs on the same mock, so the reads and the write show up there
const prismaWith = ({
  event = eventRow as object | null,
  participation = { status: 'approved' } as object | null,
  rating = null as object | null,
} = {}): DeepMockProxy<PrismaService> => {
  const prisma = mockDeep<PrismaService>();
  prisma.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
    fn(prisma)) as never);
  prisma.event.findUnique.mockResolvedValue(event as never);
  prisma.participation.findUnique.mockResolvedValue(participation as never);
  prisma.rating.findUnique.mockResolvedValue(rating as never);
  prisma.rating.upsert.mockResolvedValue({ ...input, updatedAt } as never);
  return prisma;
};

describe('RatingRepository (#66)', () => {
  describe('findEventRating', () => {
    it('reads the state for one user', async () => {
      const prisma = prismaWith({
        rating: { ...input, updatedAt, deletedAt: updatedAt },
      });

      await expect(
        new RatingRepository(prisma).findEventRating('e1', 'u-jakub'),
      ).resolves.toEqual({
        state: {
          eventStatus: 'published',
          startsAt,
          endsAt: null,
          organizerUserId: 'u-petra',
          minParticipants: 4,
          approvedCount: 5,
          raterId: 'u-jakub',
          participationStatus: 'approved',
          ratingDeleted: true,
        },
        event: ratedEvent,
        rating: { ...input, updatedAt, deletedAt: updatedAt },
      });
      expect(prisma.participation.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId_userId: { eventId: 'e1', userId: 'u-jakub' } },
        }),
      );
    });

    it('without a participation or rating', async () => {
      const prisma = prismaWith({ participation: null });

      await expect(
        new RatingRepository(prisma).findEventRating('e1', 'u-jakub'),
      ).resolves.toMatchObject({
        state: { participationStatus: null, ratingDeleted: false },
        rating: null,
      });
    });

    it('null without the event', async () => {
      await expect(
        new RatingRepository(prismaWith({ event: null })).findEventRating(
          'e1',
          'u-jakub',
        ),
      ).resolves.toBeNull();
    });
  });

  describe('saveEventRating', () => {
    it('locks the event, decides, then gives or replaces the one rating', async () => {
      const prisma = prismaWith();
      const decide = jest.fn().mockReturnValue({ ok: true });

      await expect(
        new RatingRepository(prisma).saveEventRating(
          'e1',
          'u-jakub',
          input,
          decide,
        ),
      ).resolves.toEqual({
        ok: true,
        rating: { ...input, updatedAt },
        // the state it was decided on, for until when (#313)
        state: expect.objectContaining({
          eventStatus: 'published',
          startsAt,
          endsAt: null,
        }),
        // and what the page shows of the event, from the same read
        event: ratedEvent,
      });
      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(decide).toHaveBeenCalledWith(
        expect.objectContaining({
          raterId: 'u-jakub',
          eventStatus: 'published',
        }),
      );
      expect(prisma.rating.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId_userId: { eventId: 'e1', userId: 'u-jakub' } },
          create: { eventId: 'e1', userId: 'u-jakub', ...input },
          update: input,
        }),
      );
    });

    it.each(['hidden', 'deleted'])(
      'null for an event a superadmin %s, as read under the lock, and writes nothing',
      async (status) => {
        const prisma = prismaWith({
          event: { ...eventRow, status },
        });
        const decide = jest.fn().mockReturnValue({ ok: true });

        await expect(
          new RatingRepository(prisma).saveEventRating(
            'e1',
            'u-jakub',
            input,
            decide,
          ),
        ).resolves.toBeNull();
        expect(decide).not.toHaveBeenCalled();
        expect(prisma.rating.upsert).not.toHaveBeenCalled();
      },
    );

    it('writes nothing when refused', async () => {
      const prisma = prismaWith();

      await expect(
        new RatingRepository(prisma).saveEventRating(
          'e1',
          'u-jakub',
          input,
          () => ({
            ok: false,
            refusal: 'EVENT_NOT_ENDED',
          }),
        ),
      ).resolves.toEqual({ ok: false, refusal: 'EVENT_NOT_ENDED' });
      expect(prisma.rating.upsert).not.toHaveBeenCalled();
    });

    it('null when the event is gone', async () => {
      const prisma = prismaWith({ event: null });

      await expect(
        new RatingRepository(prisma).saveEventRating(
          'e1',
          'u-jakub',
          input,
          () => ({
            ok: true,
          }),
        ),
      ).resolves.toBeNull();
      expect(prisma.rating.upsert).not.toHaveBeenCalled();
    });
  });
});
