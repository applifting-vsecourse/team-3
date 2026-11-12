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
  | 'NOT_APPROVED'
  | 'RATING_DELETED';

export type ParticipantRatingState = {
  eventStatus: 'published' | 'cancelled' | 'hidden' | 'deleted';
  startsAt: Date;
  endsAt: Date | null;
  organizerUserId: string;
  /** Who wants to rate. */
  raterId: string;
  /** Who is rated, and the status of their participation; null without one. */
  participantId: string;
  participationStatus:
    'pending' | 'approved' | 'rejected' | 'withdrawn' | 'removed' | null;
  /** Their earlier rating was deleted by a superadmin (B-063). */
  ratingDeleted: boolean;
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

/** Why an event can't be rated at all, by anyone. */
export const EVENT_NOT_RATABLE = [
  'EVENT_NOT_PUBLISHED',
  'EVENT_NOT_ENDED',
  'RATING_WINDOW_CLOSED',
] as const;

export type EventNotRatable = (typeof EVENT_NOT_RATABLE)[number];

/**
 * Whether an event can be rated now (B-060), the same for rating the event
 * and its participants: it took place – published and over, not cancelled
 * or taken down by a superadmin – and it ended at most RATING_WINDOW_DAYS
 * ago. Null when it can.
 */
export function eventNotRatable(
  event: {
    eventStatus: 'published' | 'cancelled' | 'hidden' | 'deleted';
    startsAt: Date;
    endsAt: Date | null;
  },
  now: Date,
): EventNotRatable | null {
  if (event.eventStatus !== 'published') return 'EVENT_NOT_PUBLISHED';
  if (!hasEventEnded(event, now)) return 'EVENT_NOT_ENDED';
  if (!isWithinRatingWindow(event, now)) return 'RATING_WINDOW_CLOSED';
  return null;
}

/**
 * Whether an organizer may rate a participant (#180, B-060):
 * - only its organizer, also for an event of a group – checked first: who
 *   isn't the organizer learns nothing about the event's state (#313);
 * - a rating a superadmin deleted can only be restored by them, not given
 *   again (#66) – said before the window, also after it (#313);
 * - only an event that can be rated (`eventNotRatable`): it took place and
 *   ended at most RATING_WINDOW_DAYS ago, also to change the rating;
 * - not themselves: the organizer may join their own event (Q12);
 * - only someone who was approved for it.
 * One rating per participant and event and 1–5 stars are kept by the
 * database (`participant_rating`), not here.
 */
export function decideParticipantRating(
  state: ParticipantRatingState,
  now: Date,
): { ok: true } | { ok: false; refusal: ParticipantRatingRefusal } {
  // who asks first: who isn't the organizer learns nothing about the event (#313)
  if (state.raterId !== state.organizerUserId) {
    return { ok: false, refusal: 'NOT_ORGANIZER' };
  }
  // before the window: once deleted, it stays deleted, not merely too late (#313)
  if (state.ratingDeleted) {
    return { ok: false, refusal: 'RATING_DELETED' };
  }
  const notRatable = eventNotRatable(state, now);
  if (notRatable) return { ok: false, refusal: notRatable };
  if (state.participantId === state.organizerUserId) {
    return { ok: false, refusal: 'SELF_RATING' };
  }
  if (state.participationStatus !== 'approved') {
    return { ok: false, refusal: 'NOT_APPROVED' };
  }
  return { ok: true };
}

/** What the organizer gives one participant: stars and an optional comment. */
export type ParticipantRatingInput = {
  participantId: string;
  stars: number;
  comment: string | null;
};

/** The organizer's rating of one participant as they see it. */
export type GivenParticipantRating = {
  stars: number;
  comment: string | null;
  updatedAt: Date;
};

/**
 * One approved participant in „Ohodnoť účastníky“ (Figma D-05): their
 * rating, or null before it; `ratingDeleted` when a superadmin deleted it
 * and it can't be given again.
 */
export type RatedParticipant = {
  id: string;
  name: string;
  rating: GivenParticipantRating | null;
  ratingDeleted: boolean;
};

/**
 * The organizer's view of rating their event's participants: whom, until
 * when, and why not when they may not (the same reason for everyone).
 */
export type ParticipantRatings = {
  participants: RatedParticipant[];
  ratableUntil: Date;
  refusal: EventNotRatable | null;
};
