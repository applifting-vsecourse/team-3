import { PrismaService } from '@/core/prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { RatingRepository } from './rating.repository';

// RatingRepository: the organizer rates the participants (#66)

const startsAt = new Date('2026-10-31T17:00:00.000Z');
const updatedAt = new Date('2026-11-01T08:00:00.000Z');
// the event as Prisma returns it, with the approved participations counted
const eventRow = {
  status: 'published',
  startsAt,
  endsAt: null,
  organizerUserId: 'u-petra',
  minParticipants: 2,
  _count: { participations: 4 },
};
const event = {
  status: 'published',
  startsAt,
  endsAt: null,
  organizerUserId: 'u-petra',
  minParticipants: 2,
  approvedCount: 4,
};
const inputs = [
  { participantId: 'u-jakub', stars: 5, comment: 'Díky' },
  { participantId: 'u-lucie', stars: 3, comment: null },
];
const listed = [
  {
    user: { id: 'u-jakub', name: 'Jakub' },
    rating: { stars: 5, comment: 'Díky', updatedAt, deletedAt: null },
  },
  { user: { id: 'u-lucie', name: 'Lucie' }, rating: null },
];

// the transaction runs on the same mock, so the reads and the writes show up there
const prismaWith = ({
  statuses = [
    { userId: 'u-jakub', status: 'approved' },
    { userId: 'u-lucie', status: 'approved' },
  ] as object[],
  ratings = [] as object[],
  found = eventRow as object | null,
} = {}): DeepMockProxy<PrismaService> => {
  const prisma = mockDeep<PrismaService>();
  prisma.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
    fn(prisma)) as never);
  prisma.event.findUnique.mockResolvedValue(found as never);
  // the statuses of the listed people, or the approved participants with their ratings
  prisma.participation.findMany.mockImplementation(((args: {
    select: object;
  }) => Promise.resolve('user' in args.select ? listed : statuses)) as never);
  prisma.participantRating.findMany.mockResolvedValue(ratings as never);
  return prisma;
};

describe('RatingRepository – participant ratings (#66)', () => {
  describe('findRatableEvent', () => {
    it('reads the event with how many were approved, not its participants (#314)', async () => {
      const prisma = prismaWith();

      await expect(
        new RatingRepository(prisma).findRatableEvent('e1'),
      ).resolves.toEqual(event);
      expect(prisma.participation.findMany).not.toHaveBeenCalled();
      expect(prisma.event.findUnique.mock.calls[0][0].select?._count).toEqual({
        select: { participations: { where: { status: 'approved' } } },
      });
    });

    it('null without the event', async () => {
      await expect(
        new RatingRepository(prismaWith({ found: null })).findRatableEvent(
          'e1',
        ),
      ).resolves.toBeNull();
    });
  });

  describe('findParticipantsWithRatings', () => {
    it('reads the approved participants in order, each with their rating', async () => {
      const prisma = prismaWith();

      await expect(
        new RatingRepository(prisma).findParticipantsWithRatings('e1'),
      ).resolves.toEqual([
        {
          id: 'u-jakub',
          name: 'Jakub',
          rating: { stars: 5, comment: 'Díky', updatedAt, deletedAt: null },
        },
        { id: 'u-lucie', name: 'Lucie', rating: null },
      ]);
      expect(prisma.participation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 'e1', status: 'approved' },
          orderBy: [
            { approvedAt: { sort: 'asc', nulls: 'last' } },
            { id: 'asc' },
          ],
        }),
      );
    });
  });

  describe('saveParticipantRatings', () => {
    it('locks the event, decides once for the whole list, writes with one statement', async () => {
      const prisma = prismaWith({
        ratings: [{ participantId: 'u-lucie', deletedAt: null }],
      });
      const decide = jest.fn().mockReturnValue({ ok: true });

      await expect(
        new RatingRepository(prisma).saveParticipantRatings(
          'e1',
          inputs,
          decide,
        ),
      ).resolves.toEqual({
        ok: true,
        // the view read after the write, in the same transaction (#313)
        snapshot: {
          event,
          participants: [
            expect.objectContaining({ id: 'u-jakub' }),
            expect.objectContaining({ id: 'u-lucie' }),
          ],
        },
      });
      expect(decide).toHaveBeenCalledTimes(1);
      expect(decide).toHaveBeenCalledWith(event, [
        {
          participantId: 'u-jakub',
          participationStatus: 'approved',
          ratingDeleted: false,
        },
        {
          participantId: 'u-lucie',
          participationStatus: 'approved',
          ratingDeleted: false,
        },
      ]);
      // the lock, then one INSERT … ON CONFLICT for every rating – not one upsert each (#314)
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
      const insert = prisma.$executeRaw.mock.calls[1];
      const sql = (insert[0] as unknown as string[]).join('?');
      expect(sql).toContain('INSERT INTO "participant_rating"');
      expect(sql).toContain(
        'ON CONFLICT ("eventId", "participantId") DO UPDATE',
      );
      expect(insert.slice(1)).toEqual([
        'e1',
        ['u-jakub', 'u-lucie'],
        [5, 3],
        ['Díky', null],
      ]);
      expect(prisma.participantRating.upsert).not.toHaveBeenCalled();
    });

    it('tells decide who never joined and whose rating a superadmin deleted', async () => {
      const prisma = prismaWith({
        statuses: [{ userId: 'u-jakub', status: 'approved' }],
        ratings: [{ participantId: 'u-jakub', deletedAt: updatedAt }],
      });
      const decide = jest.fn().mockReturnValue({ ok: true });

      await new RatingRepository(prisma).saveParticipantRatings(
        'e1',
        inputs,
        decide,
      );
      expect(decide).toHaveBeenCalledWith(event, [
        {
          participantId: 'u-jakub',
          participationStatus: 'approved',
          ratingDeleted: true,
        },
        {
          participantId: 'u-lucie',
          participationStatus: null,
          ratingDeleted: false,
        },
      ]);
    });

    it('all or nothing: a refusal writes none and is passed on as decided', async () => {
      const prisma = prismaWith();
      const refusal = {
        ok: false,
        refusal: 'NOT_APPROVED',
        participantId: 'u-lucie',
      };

      await expect(
        new RatingRepository(prisma).saveParticipantRatings(
          'e1',
          inputs,
          () => refusal as never,
        ),
      ).resolves.toEqual(refusal);
      // only the lock
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it.each(['hidden', 'deleted'])(
      'null for an event a superadmin %s, as read under the lock, and writes nothing',
      async (status) => {
        const prisma = prismaWith({ found: { ...eventRow, status } });
        const decide = jest.fn().mockReturnValue({ ok: true });

        await expect(
          new RatingRepository(prisma).saveParticipantRatings(
            'e1',
            inputs,
            decide,
          ),
        ).resolves.toBeNull();
        expect(decide).not.toHaveBeenCalled();
        expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      },
    );

    it('null when the event is gone', async () => {
      const prisma = prismaWith({ found: null });

      await expect(
        new RatingRepository(prisma).saveParticipantRatings(
          'e1',
          inputs,
          () => ({
            ok: true,
          }),
        ),
      ).resolves.toBeNull();
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});
