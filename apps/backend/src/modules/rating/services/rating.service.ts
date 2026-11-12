import {
  decideEventRating,
  EVENT_RATING_FORBIDDEN,
  EventRatingInput,
  EventRatingRefusal,
  isEventGone,
  MyEventRating,
} from '@/modules/rating/domain/event-rating';
import {
  decideParticipantRating,
  eventNotRatable,
  ParticipantRatingInput,
  ParticipantRatingRefusal,
  ParticipantRatings,
} from '@/modules/rating/domain/participant-rating';
import {
  RATING_WINDOW_DAYS,
  ratingDeadline,
} from '@/modules/rating/domain/rating-window';
import {
  EventRatingSnapshot,
  ParticipantRatingsSnapshot,
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

/** For the organizer rating the participants (Figma D-05). */
export const PARTICIPANT_RATING_REFUSAL_MESSAGES: Record<
  ParticipantRatingRefusal,
  string
> = {
  NOT_ORGANIZER: 'Účastníky hodnotí jen organizátor akce.',
  EVENT_NOT_PUBLISHED: 'Zrušenou akci hodnotit nejde.',
  EVENT_NOT_ENDED: 'Účastníky půjde hodnotit, až akce skončí.',
  RATING_WINDOW_CLOSED: `Hodnotit šlo jen ${RATING_WINDOW_DAYS} dní po akci.`,
  SELF_RATING: 'Sám sebe hodnotit nejde.',
  NOT_APPROVED: 'Hodnotit jde jen schválené účastníky akce.',
  RATING_DELETED: 'Hodnocení odstranil správce, znovu ho dát nejde.',
};

/** Refusals about one participant; the others are about the whole event. */
const ABOUT_PARTICIPANT: ReadonlySet<ParticipantRatingRefusal> = new Set([
  'SELF_RATING',
  'NOT_APPROVED',
  'RATING_DELETED',
]);

/**
 * A refused participant rating: 403 for someone else than the organizer,
 * 409 otherwise. A refusal about one participant names them, so the
 * frontend can mark the row; one about the event doesn't.
 */
const participantRatingRefused = (
  refusal: ParticipantRatingRefusal,
  participantId?: string,
): HttpException => {
  const body = {
    code: refusal,
    message: PARTICIPANT_RATING_REFUSAL_MESSAGES[refusal],
    ...(participantId && ABOUT_PARTICIPANT.has(refusal)
      ? { participantId }
      : {}),
  };
  return refusal === 'NOT_ORGANIZER'
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

  /**
   * „Ohodnoť účastníky“ (Figma D-05): the event's approved participants
   * with the organizer's rating of each, until when they may be rated and
   * why not now. Only the organizer who created the event, also for an event
   * of a group: other admins of the group don't rate (B-060, review #215).
   */
  async getParticipantRatings(
    eventId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<ParticipantRatings> {
    const snapshot = await this.findOrganizedEvent(eventId, userId);
    return toParticipantRatings(snapshot, now);
  }

  /**
   * Gives or changes the organizer's ratings of participants (B-060): one
   * participant, or everyone at once with the same stars and comment as the
   * frontend fills them in („Všem stejně“). Each is saved on its own, the
   * default for the event isn't. All or nothing: when one is refused, none
   * is saved and the error names the participant. Everything comes from
   * one transaction under the lock (#313): whether the event exists, the
   * refusals – NOT_ORGANIZER first – and the view as after saving.
   */
  async rateParticipants(
    eventId: string,
    userId: string,
    inputs: ParticipantRatingInput[],
    now: Date = new Date(),
  ): Promise<ParticipantRatings> {
    const result = await this.ratingRepository.saveParticipantRatings(
      eventId,
      userId,
      inputs,
      (state) => decideParticipantRating(state, now),
    );
    if (!result) throw new NotFoundException('Akce neexistuje.');
    if (!result.ok) {
      throw participantRatingRefused(result.refusal, result.participantId);
    }
    return toParticipantRatings(result.snapshot, now);
  }

  private async findOrganizedEvent(
    eventId: string,
    userId: string,
  ): Promise<ParticipantRatingsSnapshot> {
    const snapshot =
      await this.ratingRepository.findParticipantRatings(eventId);
    if (!snapshot || isEventGone(snapshot.event.status)) {
      throw new NotFoundException('Akce neexistuje.');
    }
    if (snapshot.event.organizerUserId !== userId) {
      throw participantRatingRefused('NOT_ORGANIZER');
    }
    return snapshot;
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

function toParticipantRatings(
  { event, participants }: ParticipantRatingsSnapshot,
  now: Date,
): ParticipantRatings {
  const eventState = {
    eventStatus: event.status,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
  };
  return {
    participants: participants
      // the organizer joined to their own event (Q12) doesn't rate themselves
      .filter((participant) => participant.id !== event.organizerUserId)
      .map(({ id, name, rating }) => {
        const deleted = rating !== null && rating.deletedAt !== null;
        return {
          id,
          name,
          // a rating a superadmin deleted is not shown; it can't be given again
          rating:
            rating && !deleted
              ? {
                  stars: rating.stars,
                  comment: rating.comment,
                  updatedAt: rating.updatedAt,
                }
              : null,
          ratingDeleted: deleted,
        };
      }),
    ratableUntil: ratingDeadline(eventState),
    refusal: eventNotRatable(eventState, now),
  };
}
