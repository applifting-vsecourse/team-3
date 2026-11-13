import { EventRatingState } from '@/modules/rating/domain/event-rating';
import { RATING_WINDOW_DAYS } from '@/modules/rating/domain/rating-window';
import {
  EventRatingSnapshot,
  RatingRepository,
} from '@/modules/rating/repositories/rating.repository';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { RatingService } from './rating.service';

const now = new Date('2026-11-01T12:00:00.000Z');
const startsAt = new Date('2026-10-31T17:00:00.000Z');
const endsAt = new Date('2026-10-31T19:00:00.000Z');
const ratableUntil = new Date('2026-11-14T19:00:00.000Z');
const updatedAt = new Date('2026-11-01T08:00:00.000Z');

const snapshot = (
  state: Partial<EventRatingState> = {},
  rating: EventRatingSnapshot['rating'] = null,
): EventRatingSnapshot => ({
  state: {
    eventStatus: 'published',
    startsAt,
    endsAt,
    organizerUserId: 'u-petra',
    raterId: 'u-jakub',
    participationStatus: 'approved',
    ratingDeleted: rating?.deletedAt != null,
    ...state,
  },
  rating,
});

const saved = {
  eventStars: 5,
  organizerStars: 4,
  comment: 'Skvělá parta',
  updatedAt,
};

const input = { eventStars: 5, organizerStars: 4, comment: 'Skvělá parta' };

describe('RatingService (#66)', () => {
  let repository: MockProxy<RatingRepository>;
  let service: RatingService;

  beforeEach(() => {
    repository = mock<RatingRepository>();
    service = new RatingService(repository);
  });

  describe('getMyEventRating', () => {
    it('before rating: no rating, until when, nothing in the way', async () => {
      repository.findEventRating.mockResolvedValue(snapshot());

      await expect(
        service.getMyEventRating('e1', 'u-jakub', now),
      ).resolves.toEqual({ rating: null, ratableUntil, refusal: null });
      expect(repository.findEventRating).toHaveBeenCalledWith('e1', 'u-jakub');
    });

    it('returns the earlier rating without its deletion mark', async () => {
      repository.findEventRating.mockResolvedValue(
        snapshot({}, { ...saved, deletedAt: null }),
      );

      await expect(
        service.getMyEventRating('e1', 'u-jakub', now),
      ).resolves.toEqual({ rating: saved, ratableUntil, refusal: null });
    });

    it('a rating a superadmin deleted is not shown and says why', async () => {
      repository.findEventRating.mockResolvedValue(
        snapshot({}, { ...saved, deletedAt: updatedAt }),
      );

      await expect(
        service.getMyEventRating('e1', 'u-jakub', now),
      ).resolves.toEqual({
        rating: null,
        ratableUntil,
        refusal: 'RATING_DELETED',
      });
    });

    it('says when it is too early or too late, with the rating kept', async () => {
      repository.findEventRating.mockResolvedValue(
        snapshot({}, { ...saved, deletedAt: null }),
      );

      await expect(
        service.getMyEventRating(
          'e1',
          'u-jakub',
          new Date('2026-11-15T00:00:00.000Z'),
        ),
      ).resolves.toEqual({
        rating: saved,
        ratableUntil,
        refusal: 'RATING_WINDOW_CLOSED',
      });
    });

    it('a cancelled event is found, and cannot be rated', async () => {
      repository.findEventRating.mockResolvedValue(
        snapshot({ eventStatus: 'cancelled' }),
      );

      await expect(
        service.getMyEventRating('e1', 'u-jakub', now),
      ).resolves.toMatchObject({ refusal: 'EVENT_NOT_PUBLISHED' });
    });

    it.each(['hidden', 'deleted'] as const)(
      'a %s event does not exist (404)',
      async (eventStatus) => {
        repository.findEventRating.mockResolvedValue(snapshot({ eventStatus }));

        await expect(
          service.getMyEventRating('e1', 'u-jakub', now),
        ).rejects.toBeInstanceOf(NotFoundException);
      },
    );

    it('an unknown event is 404', async () => {
      repository.findEventRating.mockResolvedValue(null);

      await expect(
        service.getMyEventRating('e1', 'u-jakub', now),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each([
      ['the organizer', { raterId: 'u-petra' }, 'OWN_EVENT'],
      ['a stranger', { participationStatus: null }, 'NOT_PARTICIPANT'],
      [
        'a rejected applicant',
        { participationStatus: 'rejected' },
        'NOT_PARTICIPANT',
      ],
    ] as const)('%s gets 403 %s', async (_who, state, code) => {
      repository.findEventRating.mockResolvedValue(snapshot(state));

      const error = await service
        .getMyEventRating('e1', 'u-jakub', now)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code,
      });
    });
  });

  describe('rateEvent', () => {
    it('saves under the lock, with until when from the state read there', async () => {
      // the event got a later end meanwhile: the answer follows the read under the lock
      const later = snapshot({ endsAt: new Date('2026-10-31T21:00:00.000Z') });
      repository.saveEventRating.mockResolvedValue({
        ok: true,
        rating: saved,
        state: later.state,
      });

      await expect(
        service.rateEvent('e1', 'u-jakub', input, now),
      ).resolves.toEqual({
        rating: saved,
        ratableUntil: new Date('2026-11-14T21:00:00.000Z'),
        refusal: null,
      });
      expect(repository.saveEventRating).toHaveBeenCalledWith(
        'e1',
        'u-jakub',
        input,
        expect.any(Function),
      );
    });

    it('reads nothing outside the lock (#313)', async () => {
      repository.saveEventRating.mockResolvedValue({
        ok: true,
        rating: saved,
        state: snapshot().state,
      });

      await service.rateEvent('e1', 'u-jakub', input, now);
      expect(repository.findEventRating).not.toHaveBeenCalled();
    });

    it('decides with the state read under the lock, at the given time', async () => {
      repository.saveEventRating.mockResolvedValue(null);

      await service.rateEvent('e1', 'u-jakub', input, now).catch(() => null);
      const decide = repository.saveEventRating.mock.calls[0][3];
      expect(decide(snapshot().state)).toEqual({ ok: true });
      expect(decide(snapshot({ eventStatus: 'cancelled' }).state)).toEqual({
        ok: false,
        refusal: 'EVENT_NOT_PUBLISHED',
      });
    });

    it.each([
      ['EVENT_NOT_PUBLISHED', ConflictException],
      ['EVENT_NOT_ENDED', ConflictException],
      ['RATING_WINDOW_CLOSED', ConflictException],
      ['RATING_DELETED', ConflictException],
      ['OWN_EVENT', ForbiddenException],
      ['NOT_PARTICIPANT', ForbiddenException],
    ] as const)('%s is refused with its code', async (refusal, type) => {
      repository.saveEventRating.mockResolvedValue({ ok: false, refusal });

      const error = await service
        .rateEvent('e1', 'u-jakub', input, now)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(type);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: refusal,
        message: expect.any(String),
      });
    });

    it('an unknown, hidden or deleted event – as read under the lock – is 404', async () => {
      repository.saveEventRating.mockResolvedValue(null);

      await expect(
        service.rateEvent('e1', 'u-jakub', input, now),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('says the window from RATING_WINDOW_DAYS', async () => {
      repository.saveEventRating.mockResolvedValue({
        ok: false,
        refusal: 'RATING_WINDOW_CLOSED',
      });

      const error = await service
        .rateEvent('e1', 'u-jakub', input, now)
        .catch((e: unknown) => e);
      expect((error as ConflictException).getResponse()).toMatchObject({
        message: `Hodnotit šlo jen ${RATING_WINDOW_DAYS} dní po akci.`,
      });
    });
  });
});
