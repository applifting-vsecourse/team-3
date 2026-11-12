import { hasEventEnded } from './participant-rating';
import { isWithinRatingWindow } from './rating-window';

/** Stars of a rating; 1–5, validated by the request DTO. */
export const RATING_STARS_MIN = 1;
export const RATING_STARS_MAX = 5;

/**
 * Why a participant may not rate the event and its organizer (#66). The
 * first two are about who asks (403), the rest about the event or the
 * rating (409).
 */
export type EventRatingRefusal =
  | 'OWN_EVENT'
  | 'NOT_PARTICIPANT'
  | 'EVENT_NOT_PUBLISHED'
  | 'EVENT_NOT_ENDED'
  | 'RATING_WINDOW_CLOSED'
  | 'RATING_DELETED';

export type EventRatingState = {
  eventStatus: 'published' | 'cancelled' | 'hidden' | 'deleted';
  startsAt: Date;
  endsAt: Date | null;
  organizerUserId: string;
  /** Who wants to rate, and the status of their participation; null without one. */
  raterId: string;
  participationStatus:
    'pending' | 'approved' | 'rejected' | 'withdrawn' | 'removed' | null;
  /** Their earlier rating was deleted by a superadmin (B-063). */
  ratingDeleted: boolean;
};

/**
 * Whether a participant may rate the event and its organizer, or change
 * their rating (B-060, #66):
 * - not the organizer, even when joined to their own event (Q12);
 * - only someone who was approved for it; confirmed attendance isn't needed,
 *   nor being a member of the event's group any more (a former member rates
 *   a members-only event they went to);
 * - only an event that took place: published and over, not cancelled or
 *   taken down by a superadmin, and within RATING_WINDOW_DAYS of its end;
 * - a rating a superadmin deleted can only be restored by them, not given
 *   again.
 * One rating per user and event is kept by the database.
 */
export function decideEventRating(
  state: EventRatingState,
  now: Date,
): { ok: true } | { ok: false; refusal: EventRatingRefusal } {
  if (state.raterId === state.organizerUserId) {
    return { ok: false, refusal: 'OWN_EVENT' };
  }
  if (state.participationStatus !== 'approved') {
    return { ok: false, refusal: 'NOT_PARTICIPANT' };
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
  if (state.ratingDeleted) {
    return { ok: false, refusal: 'RATING_DELETED' };
  }
  return { ok: true };
}

/** What the participant gives: stars for the event and its organizer. */
export type EventRatingInput = {
  eventStars: number;
  organizerStars: number;
  comment: string | null;
};

/** The participant's own rating as they see it. */
export type EventRating = EventRatingInput & { updatedAt: Date };

/**
 * The participant's view of rating an event: their rating, until when they
 * may give or change it, and why not when they may not.
 */
export type MyEventRating = {
  rating: EventRating | null;
  ratableUntil: Date;
  refusal: EventRatingRefusal | null;
};
