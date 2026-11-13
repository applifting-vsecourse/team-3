import { eventNotRatable, RatableEventState } from './participant-rating';

/** Stars of a rating; 1–5, validated by the request DTO. */
export const RATING_STARS_MIN = 1;
export const RATING_STARS_MAX = 5;

/** Why a participant may not rate the event and its organizer (#66). */
export const EVENT_RATING_REFUSALS = [
  'OWN_EVENT',
  'NOT_PARTICIPANT',
  'EVENT_NOT_PUBLISHED',
  'EVENT_NOT_ENDED',
  'EVENT_NOT_HELD',
  'RATING_DELETED',
  'RATING_WINDOW_CLOSED',
] as const;

export type EventRatingRefusal = (typeof EVENT_RATING_REFUSALS)[number];

/**
 * The refusals about who asks: 403, and never shown as `refusal` of the
 * rating page. The rest are about the event or the rating: 409, and the
 * page says them.
 */
export const EVENT_RATING_FORBIDDEN: readonly EventRatingRefusal[] = [
  'OWN_EVENT',
  'NOT_PARTICIPANT',
];

/** What `refusal` of GET /events/:id/rating can be. */
export const EVENT_RATING_SHOWN_REFUSALS = EVENT_RATING_REFUSALS.filter(
  (refusal) => !EVENT_RATING_FORBIDDEN.includes(refusal),
);

export type EventRatingState = RatableEventState & {
  organizerUserId: string;
  /** Who wants to rate, and the status of their participation; null without one. */
  raterId: string;
  participationStatus:
    'pending' | 'approved' | 'rejected' | 'withdrawn' | 'removed' | null;
  /** Their earlier rating was deleted by a superadmin (B-063). */
  ratingDeleted: boolean;
};

/**
 * A hidden or deleted event doesn't exist for users, as everywhere (404);
 * a cancelled one does, and says why it can't be rated.
 */
export const isEventGone = (status: EventRatingState['eventStatus']): boolean =>
  status === 'hidden' || status === 'deleted';

/**
 * Whether a participant may rate the event and its organizer, or change
 * their rating (B-060, #66):
 * - not the organizer – the one who created the event, also for an event
 *   of a group; the group's other admins rate it like anyone else who went
 *   (#313) – even when joined to their own event (Q12);
 * - only someone who was approved for it; confirmed attendance isn't needed,
 *   nor being a member of the event's group any more (a former member rates
 *   a members-only event they went to);
 * - only an event that took place: published and over, not cancelled or
 *   taken down by a superadmin, and within RATING_WINDOW_DAYS of its end;
 * - a rating a superadmin deleted can only be restored by them, not given
 *   again; that is what the participant hears, also after the window.
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
  // before the window: once deleted, it stays deleted, not merely too late
  if (state.ratingDeleted) {
    return { ok: false, refusal: 'RATING_DELETED' };
  }
  const notRatable = eventNotRatable(state, now);
  if (notRatable) return { ok: false, refusal: notRatable };
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
