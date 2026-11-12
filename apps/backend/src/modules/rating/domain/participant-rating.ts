import { isWithinRatingWindow } from './rating-window';

/**
 * Longest comment of a rating, of the event (`Rating`) and of a participant
 * (`ParticipantRating`, PO 4. 11.); the same as a bio. #66 validates it.
 */
export const RATING_COMMENT_MAX_LENGTH = 500;

/** Why rating a participant was refused; #66 answers 409 with the code. */
export type ParticipantRatingRefusal =
  | 'EVENT_NOT_PUBLISHED'
  | 'EVENT_NOT_ENDED'
  | 'RATING_WINDOW_CLOSED'
  | 'NOT_ORGANIZER'
  | 'SELF_RATING'
  | 'NOT_APPROVED';

export type ParticipantRatingState = {
  eventStatus: 'published' | 'cancelled' | 'hidden' | 'deleted';
  startsAt: Date;
  endsAt: Date | null;
  organizerUserId: string;
  /** Who wants to rate. */
  raterId: string;
  /** Who is rated, and the status of their participation in the event. */
  participantId: string;
  participationStatus:
    'pending' | 'approved' | 'rejected' | 'withdrawn' | 'removed';
};

/**
 * Whether an event is over (#180): once its end has passed, or its start
 * when it has no end.
 */
export function hasEventEnded(
  event: { startsAt: Date; endsAt: Date | null },
  now: Date,
): boolean {
  return (event.endsAt ?? event.startsAt) <= now;
}

/**
 * Whether an organizer may rate a participant (#180, B-060):
 * - only its organizer, also for an event of a group – checked first: who
 *   isn't the organizer learns nothing about the event's state (#313);
 * - only an event that took place: published and over, not cancelled or
 *   taken down by a superadmin;
 * - within RATING_WINDOW_DAYS of its end (#66), also to change the rating;
 * - not themselves: the organizer may join their own event (Q12);
 * - only someone who was approved for it.
 * One rating per participant and event and 1–5 stars are kept by the
 * database (`participant_rating`), not here.
 */
export function decideParticipantRating(
  state: ParticipantRatingState,
  now: Date,
): { ok: true } | { ok: false; refusal: ParticipantRatingRefusal } {
  if (state.raterId !== state.organizerUserId) {
    return { ok: false, refusal: 'NOT_ORGANIZER' };
  }
  if (state.eventStatus !== 'published') {
    return { ok: false, refusal: 'EVENT_NOT_PUBLISHED' };
  }
  if (!hasEventEnded(state, now)) {
    return { ok: false, refusal: 'EVENT_NOT_ENDED' };
  }
  if (!isWithinRatingWindow(state, now)) {
    return { ok: false, refusal: 'RATING_WINDOW_CLOSED' };
  }
  if (state.participantId === state.organizerUserId) {
    return { ok: false, refusal: 'SELF_RATING' };
  }
  if (state.participationStatus !== 'approved') {
    return { ok: false, refusal: 'NOT_APPROVED' };
  }
  return { ok: true };
}
