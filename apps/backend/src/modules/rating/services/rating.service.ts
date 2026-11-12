import {
  decideEventRating,
  EVENT_RATING_FORBIDDEN,
  EventRatingInput,
  EventRatingRefusal,
  isEventGone,
  MyEventRating,
} from '@/modules/rating/domain/event-rating';
import {
  RATING_WINDOW_DAYS,
  ratingDeadline,
} from '@/modules/rating/domain/rating-window';
import {
  EventRatingSnapshot,
  RatingRepository,
} from '@/modules/rating/repositories/rating.repository';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

/** Shown as they are in the app; the code is what the frontend reacts to. */
export const EVENT_RATING_REFUSAL_MESSAGES: Record<EventRatingRefusal, string> =
  {
    OWN_EVENT: 'Svou vlastní akci hodnotit nejde.',
    NOT_PARTICIPANT: 'Hodnotit může jen ten, kdo byl na akci přihlášený.',
    EVENT_NOT_PUBLISHED: 'Zrušenou akci hodnotit nejde.',
    EVENT_NOT_ENDED: 'Hodnotit půjde, až akce skončí.',
    RATING_WINDOW_CLOSED: `Hodnotit šlo jen ${RATING_WINDOW_DAYS} dní po akci.`,
    RATING_DELETED: 'Hodnocení odstranil správce, znovu ho dát nejde.',
  };

/** Who asks is 403, the state of the event or the rating 409. */
const FORBIDDEN: ReadonlySet<EventRatingRefusal> = new Set(
  EVENT_RATING_FORBIDDEN,
);

const refused = (refusal: EventRatingRefusal): HttpException => {
  const body = {
    code: refusal,
    message: EVENT_RATING_REFUSAL_MESSAGES[refusal],
  };
  return FORBIDDEN.has(refusal)
    ? new ForbiddenException(body)
    : new ConflictException(body);
};

/**
 * A participant rates the event and its organizer (B-060, #66, Figma C-03).
 * For an event of a group the organizer stars belong to the group, which
 * the averages already take care of (`rating-summary.ts`).
 */
@Injectable()
export class RatingService {
  constructor(private readonly ratingRepository: RatingRepository) {}

  /**
   * The user's rating of the event and whether they may give or change it.
   * Unknown, hidden and deleted events are 404; someone who wasn't approved
   * for it, or its organizer, 403. Membership of the event's group doesn't
   * matter: a former member rates the members-only event they went to.
   */
  async getMyEventRating(
    eventId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<MyEventRating> {
    const snapshot = await this.findRatableEvent(eventId, userId);
    const decision = decideEventRating(snapshot.state, now);
    if (!decision.ok && FORBIDDEN.has(decision.refusal)) {
      throw refused(decision.refusal);
    }
    const { rating } = snapshot;
    return {
      // a rating a superadmin deleted is not shown, not even to its author
      rating:
        rating && rating.deletedAt === null
          ? {
              eventStars: rating.eventStars,
              organizerStars: rating.organizerStars,
              comment: rating.comment,
              updatedAt: rating.updatedAt,
            }
          : null,
      ratableUntil: ratingDeadline(snapshot.state),
      refusal: decision.ok ? null : decision.refusal,
    };
  }

  /**
   * Gives the rating, or changes it while the window is open. The same
   * call does both: one rating per user and event. Everything is decided
   * on one read under the lock (#313): whether the event exists, the
   * refusal – 403 or 409 with a code (`decideEventRating`) – and until when
   * it may be changed.
   */
  async rateEvent(
    eventId: string,
    userId: string,
    input: EventRatingInput,
    now: Date = new Date(),
  ): Promise<MyEventRating> {
    const result = await this.ratingRepository.saveEventRating(
      eventId,
      userId,
      input,
      (state) => decideEventRating(state, now),
    );
    if (!result) throw new NotFoundException('Akce neexistuje.');
    if (!result.ok) throw refused(result.refusal);
    return {
      rating: result.rating,
      ratableUntil: ratingDeadline(result.state),
      refusal: null,
    };
  }

  private async findRatableEvent(
    eventId: string,
    userId: string,
  ): Promise<EventRatingSnapshot> {
    const snapshot = await this.ratingRepository.findEventRating(
      eventId,
      userId,
    );
    if (!snapshot || isEventGone(snapshot.state.eventStatus)) {
      throw new NotFoundException('Akce neexistuje.');
    }
    return snapshot;
  }
}
