import {
  ParticipantRatingsSnapshot,
  RatingRepository,
} from '@/modules/rating/repositories/rating.repository';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { RatingService } from './rating.service';

// RatingService: the organizer rates the participants (#66, Figma D-05)

const now = new Date('2026-11-01T12:00:00.000Z');
const startsAt = new Date('2026-10-31T17:00:00.000Z');
const endsAt = new Date('2026-10-31T19:00:00.000Z');
const ratableUntil = new Date('2026-11-14T19:00:00.000Z');
const updatedAt = new Date('2026-11-01T08:00:00.000Z');

const snapshot = (
  event: Partial<ParticipantRatingsSnapshot['event']> = {},
): ParticipantRatingsSnapshot => ({
  event: {
    status: 'published',
    startsAt,
    endsAt,
    organizerUserId: 'u-petra',
    ...event,
  },
  participants: [
    {
      id: 'u-jakub',
      name: 'Jakub',
      rating: { stars: 4, comment: 'Díky', updatedAt, deletedAt: null },
    },
    // the organizer joined to her own event (Q12)
    { id: 'u-petra', name: 'Petra', rating: null },
    { id: 'u-lucie', name: 'Lucie', rating: null },
    {
      id: 'u-eliska',
      name: 'Eliška',
      rating: { stars: 1, comment: 'Spam', updatedAt, deletedAt: updatedAt },
    },
  ],
});

const inputs = [
  { participantId: 'u-jakub', stars: 5, comment: 'Skvělá parta' },
  { participantId: 'u-lucie', stars: 5, comment: 'Skvělá parta' },
];

describe('RatingService – participant ratings (#66)', () => {
  let repository: MockProxy<RatingRepository>;
  let service: RatingService;

  beforeEach(() => {
    repository = mock<RatingRepository>();
    service = new RatingService(repository);
  });

  describe('getParticipantRatings', () => {
    it('lists the approved participants without the organizer, deleted ratings hidden', async () => {
      repository.findParticipantRatings.mockResolvedValue(snapshot());

      await expect(
        service.getParticipantRatings('e1', 'u-petra', now),
      ).resolves.toEqual({
        participants: [
          {
            id: 'u-jakub',
            name: 'Jakub',
            rating: { stars: 4, comment: 'Díky', updatedAt },
            ratingDeleted: false,
          },
          { id: 'u-lucie', name: 'Lucie', rating: null, ratingDeleted: false },
          { id: 'u-eliska', name: 'Eliška', rating: null, ratingDeleted: true },
        ],
        ratableUntil,
        refusal: null,
      });
      expect(repository.findParticipantRatings).toHaveBeenCalledWith('e1');
    });

    it.each([
      [{ status: 'cancelled' }, 'EVENT_NOT_PUBLISHED'],
      [
        { startsAt: new Date('2026-11-02T17:00:00.000Z'), endsAt: null },
        'EVENT_NOT_ENDED',
      ],
      [
        { startsAt: new Date('2026-10-01T17:00:00.000Z'), endsAt: null },
        'RATING_WINDOW_CLOSED',
      ],
    ] as const)(
      'says why nobody can be rated: %o → %s',
      async (event, refusal) => {
        repository.findParticipantRatings.mockResolvedValue(snapshot(event));

        await expect(
          service.getParticipantRatings('e1', 'u-petra', now),
        ).resolves.toMatchObject({ refusal });
      },
    );

    it('only the organizer who created it; an admin of the group too is 403 NOT_ORGANIZER', async () => {
      repository.findParticipantRatings.mockResolvedValue(snapshot());

      const error = await service
        .getParticipantRatings('e1', 'u-tomas', now)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'NOT_ORGANIZER',
      });
    });

    it.each(['hidden', 'deleted'] as const)(
      'a %s event does not exist (404)',
      async (status) => {
        repository.findParticipantRatings.mockResolvedValue(
          snapshot({ status }),
        );

        await expect(
          service.getParticipantRatings('e1', 'u-petra', now),
        ).rejects.toBeInstanceOf(NotFoundException);
      },
    );

    it('an unknown event is 404', async () => {
      repository.findParticipantRatings.mockResolvedValue(null);

      await expect(
        service.getParticipantRatings('e1', 'u-petra', now),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('rateParticipants', () => {
    it('saves all under the lock and answers with the view read there (#313)', async () => {
      repository.saveParticipantRatings.mockResolvedValue({
        ok: true,
        snapshot: snapshot(),
      });

      await expect(
        service.rateParticipants('e1', 'u-petra', inputs, now),
      ).resolves.toMatchObject({
        refusal: null,
        ratableUntil,
        participants: expect.arrayContaining([
          expect.objectContaining({ id: 'u-jakub' }),
        ]),
      });
      expect(repository.saveParticipantRatings).toHaveBeenCalledWith(
        'e1',
        'u-petra',
        inputs,
        expect.any(Function),
      );
      // nothing read outside the transaction, neither before nor after
      expect(repository.findParticipantRatings).not.toHaveBeenCalled();
    });

    it('decides each with decideParticipantRating at the given time', async () => {
      repository.saveParticipantRatings.mockResolvedValue({
        ok: true,
        snapshot: snapshot(),
      });

      await service.rateParticipants('e1', 'u-petra', inputs, now);
      const decide = repository.saveParticipantRatings.mock.calls[0][3];
      const state = {
        eventStatus: 'published' as const,
        startsAt,
        endsAt,
        organizerUserId: 'u-petra',
        raterId: 'u-petra',
        participantId: 'u-jakub',
        participationStatus: 'approved' as const,
        ratingDeleted: false,
      };
      expect(decide(state)).toEqual({ ok: true });
      expect(decide({ ...state, ratingDeleted: true })).toEqual({
        ok: false,
        refusal: 'RATING_DELETED',
      });
      expect(decide({ ...state, raterId: 'u-tomas' })).toEqual({
        ok: false,
        refusal: 'NOT_ORGANIZER',
      });
    });

    it('someone else than the organizer is 403 NOT_ORGANIZER, without a participant', async () => {
      repository.saveParticipantRatings.mockResolvedValue({
        ok: false,
        refusal: 'NOT_ORGANIZER',
        participantId: 'u-jakub',
      });

      const error = await service
        .rateParticipants('e1', 'u-tomas', inputs, now)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'NOT_ORGANIZER',
        message: expect.any(String),
      });
    });

    it.each(['SELF_RATING', 'NOT_APPROVED', 'RATING_DELETED'] as const)(
      '%s is 409 naming the participant',
      async (refusal) => {
        repository.saveParticipantRatings.mockResolvedValue({
          ok: false,
          refusal,
          participantId: 'u-lucie',
        });

        const error = await service
          .rateParticipants('e1', 'u-petra', inputs, now)
          .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).getResponse()).toEqual({
          code: refusal,
          message: expect.any(String),
          participantId: 'u-lucie',
        });
      },
    );

    it.each([
      'EVENT_NOT_PUBLISHED',
      'EVENT_NOT_ENDED',
      'RATING_WINDOW_CLOSED',
    ] as const)(
      '%s is 409 about the event, without a participant',
      async (refusal) => {
        repository.saveParticipantRatings.mockResolvedValue({
          ok: false,
          refusal,
          participantId: 'u-jakub',
        });

        const error = await service
          .rateParticipants('e1', 'u-petra', inputs, now)
          .catch((e: unknown) => e);
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).getResponse()).toEqual({
          code: refusal,
          message: expect.any(String),
        });
      },
    );

    it('an unknown, hidden or deleted event – as read under the lock – is 404', async () => {
      repository.saveParticipantRatings.mockResolvedValue(null);

      await expect(
        service.rateParticipants('e1', 'u-petra', inputs, now),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
