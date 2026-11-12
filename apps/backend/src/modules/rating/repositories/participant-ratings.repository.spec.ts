import { PrismaService } from '@/core/prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { RatingRepository } from './rating.repository';

// RatingRepository: the organizer rates the participants (#66)

const startsAt = new Date('2026-10-31T17:00:00.000Z');
const updatedAt = new Date('2026-11-01T08:00:00.000Z');
const event = {
  status: 'published',
  startsAt,
  endsAt: null,
  organizerUserId: 'u-petra',
};
const inputs = [
  { participantId: 'u-jakub', stars: 5, comment: 'Díky' },
  { participantId: 'u-lucie', stars: 3, comment: null },
];

// the transaction runs on the same mock, so the reads and the writes show up there
const prismaWith = ({
  participations = [
    { userId: 'u-jakub', status: 'approved' },
    { userId: 'u-lucie', status: 'approved' },
  ] as object[],
  ratings = [] as object[],
  // the same read serves the decision and, with the participants, the answer after the writes
  found = { ...event, participations: [] } as object | null,
} = {}): DeepMockProxy<PrismaService> => {
  const prisma = mockDeep<PrismaService>();
  prisma.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
    fn(prisma)) as never);
  prisma.event.findUnique.mockResolvedValue(found as never);
  prisma.participation.findMany.mockResolvedValue(participations as never);
  prisma.participantRating.findMany.mockResolvedValue(ratings as never);
  return prisma;
};

describe('RatingRepository – participant ratings (#66)', () => {
  describe('findParticipantRatings', () => {
    it('reads the approved participants in order, each with their rating', async () => {
      const prisma = prismaWith({
        found: {
          ...event,
          participations: [
            {
              user: { id: 'u-jakub', name: 'Jakub' },
              rating: { stars: 4, comment: null, updatedAt, deletedAt: null },
            },
            { user: { id: 'u-lucie', name: 'Lucie' }, rating: null },
          ],
        },
      });

      await expect(
        new RatingRepository(prisma).findParticipantRatings('e1'),
      ).resolves.toEqual({
        event,
        participants: [
          {
            id: 'u-jakub',
            name: 'Jakub',
            rating: { stars: 4, comment: null, updatedAt, deletedAt: null },
          },
          { id: 'u-lucie', name: 'Lucie', rating: null },
        ],
      });
      const query = prisma.event.findUnique.mock.calls[0][0];
      expect(query.select?.participations).toMatchObject({
        where: { status: 'approved' },
        orderBy: [
          { approvedAt: { sort: 'asc', nulls: 'last' } },
          { id: 'asc' },
        ],
      });
    });

    it('null without the event', async () => {
      await expect(
        new RatingRepository(
          prismaWith({ found: null }),
        ).findParticipantRatings('e1'),
      ).resolves.toBeNull();
    });
  });

  describe('saveParticipantRatings', () => {
    it('locks the event, decides each participant, then writes each rating', async () => {
      const prisma = prismaWith({
        ratings: [{ participantId: 'u-lucie', deletedAt: null }],
      });
      const decide = jest.fn().mockReturnValue({ ok: true });

      await expect(
        new RatingRepository(prisma).saveParticipantRatings(
          'e1',
          'u-petra',
          inputs,
          decide,
        ),
      ).resolves.toEqual({
        ok: true,
        // the view read after the writes, in the same transaction (#313)
        snapshot: { event, participants: [] },
      });
      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(decide).toHaveBeenCalledTimes(2);
      expect(decide).toHaveBeenCalledWith({
        eventStatus: 'published',
        startsAt,
        endsAt: null,
        organizerUserId: 'u-petra',
        raterId: 'u-petra',
        participantId: 'u-jakub',
        participationStatus: 'approved',
        ratingDeleted: false,
      });
      expect(prisma.participantRating.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.participantRating.upsert).toHaveBeenCalledWith({
        where: {
          eventId_participantId: { eventId: 'e1', participantId: 'u-lucie' },
        },
        create: {
          eventId: 'e1',
          participantId: 'u-lucie',
          stars: 3,
          comment: null,
        },
        update: { stars: 3, comment: null },
      });
    });

    it('tells decide who never joined and whose rating a superadmin deleted', async () => {
      const prisma = prismaWith({
        participations: [{ userId: 'u-jakub', status: 'approved' }],
        ratings: [{ participantId: 'u-jakub', deletedAt: updatedAt }],
      });
      const decide = jest.fn().mockReturnValue({ ok: true });

      await new RatingRepository(prisma).saveParticipantRatings(
        'e1',
        'u-petra',
        inputs,
        decide,
      );
      expect(decide).toHaveBeenCalledWith(
        expect.objectContaining({
          participantId: 'u-jakub',
          ratingDeleted: true,
        }),
      );
      expect(decide).toHaveBeenCalledWith(
        expect.objectContaining({
          participantId: 'u-lucie',
          participationStatus: null,
        }),
      );
    });

    it('all or nothing: one refusal writes none and names the participant', async () => {
      const prisma = prismaWith();
      const decide = jest
        .fn()
        .mockReturnValueOnce({ ok: true })
        .mockReturnValueOnce({ ok: false, refusal: 'NOT_APPROVED' });

      await expect(
        new RatingRepository(prisma).saveParticipantRatings(
          'e1',
          'u-petra',
          inputs,
          decide,
        ),
      ).resolves.toEqual({
        ok: false,
        refusal: 'NOT_APPROVED',
        participantId: 'u-lucie',
      });
      expect(prisma.participantRating.upsert).not.toHaveBeenCalled();
    });

    it.each(['hidden', 'deleted'])(
      'null for an event a superadmin %s, as read under the lock, and writes nothing',
      async (status) => {
        const prisma = prismaWith({ found: { ...event, status } });
        const decide = jest.fn().mockReturnValue({ ok: true });

        await expect(
          new RatingRepository(prisma).saveParticipantRatings(
            'e1',
            'u-petra',
            inputs,
            decide,
          ),
        ).resolves.toBeNull();
        expect(decide).not.toHaveBeenCalled();
        expect(prisma.participantRating.upsert).not.toHaveBeenCalled();
      },
    );

    it('null when the event is gone', async () => {
      const prisma = prismaWith({ found: null });

      await expect(
        new RatingRepository(prisma).saveParticipantRatings(
          'e1',
          'u-petra',
          inputs,
          () => ({ ok: true }),
        ),
      ).resolves.toBeNull();
      expect(prisma.participantRating.upsert).not.toHaveBeenCalled();
    });
  });
});
