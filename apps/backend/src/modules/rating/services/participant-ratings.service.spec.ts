import { RatedParticipantState } from '@/modules/rating/domain/participant-rating';
import {
  ParticipantRatingsSnapshot,
  RatableEvent,
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
// the end of Sat 14. 11. in Prague (UTC+1), 14 calendar days after Sat 31. 10.
const ratableUntil = new Date('2026-11-14T22:59:59.999Z');
const updatedAt = new Date('2026-11-01T08:00:00.000Z');

const anEvent = (overrides: Partial<RatableEvent> = {}): RatableEvent => ({
  status: 'published',
  startsAt,
  endsAt,
  organizerUserId: 'u-petra',
  minParticipants: 2,
  approvedCount: 4,
  ...overrides,
});

const participants: ParticipantRatingsSnapshot['participants'] = [
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
];

const inputs = [
  { participantId: 'u-jakub', stars: 5, comment: 'Skvělá parta' },
  { participantId: 'u-lucie', stars: 5, comment: 'Skvělá parta' },
];

const approved = (participantId: string): RatedParticipantState => ({
  participantId,
  participationStatus: 'approved' as const,
  ratingDeleted: false,
});

describe('RatingService – participant ratings (#66)', () => {
  let repository: MockProxy<RatingRepository>;
  let service: RatingService;

  beforeEach(() => {
    repository = mock<RatingRepository>();
    service = new RatingService(repository);
  });

  describe('getParticipantRatings', () => {
    it('lists the approved participants without the organizer, deleted ratings hidden', async () => {
      repository.findRatableEvent.mockResolvedValue(anEvent());
      repository.findParticipantsWithRatings.mockResolvedValue(participants);

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
      expect(repository.findRatableEvent).toHaveBeenCalledWith('e1');
      expect(repository.findParticipantsWithRatings).toHaveBeenCalledWith('e1');
    });

    it.each([
      [{ status: 'cancelled' as const }, 'EVENT_NOT_PUBLISHED'],
      [
        { startsAt: new Date('2026-11-02T17:00:00.000Z'), endsAt: null },
        'EVENT_NOT_ENDED',
      ],
      [{ approvedCount: 1 }, 'EVENT_NOT_HELD'],
      [
        { startsAt: new Date('2026-10-01T17:00:00.000Z'), endsAt: null },
        'RATING_WINDOW_CLOSED',
      ],
    ])('says why nobody can be rated: %o → %s', async (event, refusal) => {
      repository.findRatableEvent.mockResolvedValue(anEvent(event));
      repository.findParticipantsWithRatings.mockResolvedValue(participants);

      await expect(
        service.getParticipantRatings('e1', 'u-petra', now),
      ).resolves.toMatchObject({ refusal });
    });

    it('someone else is 403 NOT_ORGANIZER before any participant is read (#314)', async () => {
      repository.findRatableEvent.mockResolvedValue(anEvent());

      const error = await service
        .getParticipantRatings('e1', 'u-tomas', now)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'NOT_ORGANIZER',
      });
      expect(repository.findParticipantsWithRatings).not.toHaveBeenCalled();
    });

    it.each(['hidden', 'deleted'] as const)(
      'a %s event does not exist (404), and no participant is read',
      async (status) => {
        repository.findRatableEvent.mockResolvedValue(anEvent({ status }));

        await expect(
          service.getParticipantRatings('e1', 'u-petra', now),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(repository.findParticipantsWithRatings).not.toHaveBeenCalled();
      },
    );

    it('an unknown event is 404', async () => {
      repository.findRatableEvent.mockResolvedValue(null);

      await expect(
        service.getParticipantRatings('e1', 'u-petra', now),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('rateParticipants', () => {
    it('saves all under the lock and answers with the view read there (#313)', async () => {
      repository.saveParticipantRatings.mockResolvedValue({
        ok: true,
        snapshot: { event: anEvent(), participants },
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
        inputs,
        expect.any(Function),
      );
      // nothing read outside the transaction, neither before nor after
      expect(repository.findRatableEvent).not.toHaveBeenCalled();
      expect(repository.findParticipantsWithRatings).not.toHaveBeenCalled();
    });

    it('decides for the whole list at once, as the caller, at the given time (#314)', async () => {
      repository.saveParticipantRatings.mockResolvedValue(null);

      await service
        .rateParticipants('e1', 'u-petra', inputs, now)
        .catch(() => null);
      const decide = repository.saveParticipantRatings.mock.calls[0][2];
      expect(decide(anEvent(), [approved('u-jakub')])).toEqual({ ok: true });
      // window closed and a deleted rating first: the event-wide reason, without a participant
      expect(
        decide(
          anEvent({
            startsAt: new Date('2026-10-01T17:00:00.000Z'),
            endsAt: null,
          }),
          [
            { ...approved('u-eliska'), ratingDeleted: true },
            approved('u-jakub'),
          ],
        ),
      ).toEqual({ ok: false, refusal: 'RATING_WINDOW_CLOSED' });
      // the caller is the rater: someone else is NOT_ORGANIZER
      await service
        .rateParticipants('e1', 'u-tomas', inputs, now)
        .catch(() => null);
      const asTomas = repository.saveParticipantRatings.mock.calls[1][2];
      expect(asTomas(anEvent(), [approved('u-jakub')])).toEqual({
        ok: false,
        refusal: 'NOT_ORGANIZER',
      });
    });

    it('someone else than the organizer is 403 NOT_ORGANIZER, without a participant', async () => {
      repository.saveParticipantRatings.mockResolvedValue({
        ok: false,
        refusal: 'NOT_ORGANIZER',
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
      'EVENT_NOT_HELD',
      'RATING_WINDOW_CLOSED',
    ] as const)(
      '%s is 409 about the event, without a participant',
      async (refusal) => {
        repository.saveParticipantRatings.mockResolvedValue({
          ok: false,
          refusal,
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
