import { isEventOver } from '@/modules/event/domain/event-over';
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
  | 'EVENT_NOT_HELD'
  | 'RATING_WINDOW_CLOSED'
  | 'NOT_ORGANIZER'
  | 'SELF_RATING'
  | 'NOT_APPROVED'
  | 'RATING_DELETED';

/** What decides whether an event can be rated at all (`eventNotRatable`). */
export type RatableEventState = {
  eventStatus: 'published' | 'cancelled' | 'hidden' | 'deleted';
  startsAt: Date;
  endsAt: Date | null;
  /** Its minimum, and how many were approved: below the minimum it didn't take place. */
  minParticipants: number;
  approvedCount: number;
};

export type ParticipantRatingState = RatableEventState & {
  organizerUserId: string;
  /** Who wants to rate. */
  raterId: string;
  /** Who is rated. */
  participantId: string;
  /** The status of their participation in the event; null without one (review #314). */
  participationStatus:
    'pending' | 'approved' | 'rejected' | 'withdrawn' | 'removed' | null;
  /** Their earlier rating was deleted by a superadmin (B-063). */
  ratingDeleted: boolean;
};

/** Why an event can't be rated at all, by anyone. */
export const EVENT_NOT_RATABLE = [
  'EVENT_NOT_PUBLISHED',
  'EVENT_NOT_ENDED',
  'EVENT_NOT_HELD',
  'RATING_WINDOW_CLOSED',
] as const;

export type EventNotRatable = (typeof EVENT_NOT_RATABLE)[number];

/**
 * Whether an event can be rated now (B-060), the same for rating the event
 * and its participants: it took place – published and over (`isEventOver`,
 * #272: without an end after its Prague day), not cancelled
 * or taken down by a superadmin, and enough people came for its minimum
 * (an event below it didn't take place, as its detail says: „Akce se
 * nekonala“) – and it ended at most RATING_WINDOW_DAYS ago. Null when it can.
 */
export function eventNotRatable(
  event: RatableEventState,
  now: Date,
): EventNotRatable | null {
  if (event.eventStatus !== 'published') return 'EVENT_NOT_PUBLISHED';
  if (!isEventOver(event, now)) return 'EVENT_NOT_ENDED';
  if (event.approvedCount < event.minParticipants) return 'EVENT_NOT_HELD';
  if (!isWithinRatingWindow(event, now)) return 'RATING_WINDOW_CLOSED';
  return null;
}

/** One participant in a rating of several at once. */
export type RatedParticipantState = {
  participantId: string;
  participationStatus:
    'pending' | 'approved' | 'rejected' | 'withdrawn' | 'removed' | null;
  /** Their earlier rating was deleted by a superadmin (B-063). */
  ratingDeleted: boolean;
};

/**
 * Whether an organizer may rate these participants at once (#180, B-060,
 * review #314) – all or none, and the answer doesn't depend on their order:
 * 1. only the organizer who created the event, also for an event of a group
 *    – first, so who isn't learns nothing about the event (#313);
 * 2. only an event that can be rated (`eventNotRatable`), checked once for
 *    the whole list: an event-wide refusal never names a participant;
 * 3. then each participant: not the organizer themselves (they may join their
 *    own event, Q12), only someone approved for it, and not one whose rating
 *    a superadmin deleted – that can only be restored, not given again. The
 *    first such refusal names its participant.
 *
 * RATING_DELETED comes after the event here, unlike `decideEventRating`,
 * where it comes before it (review #314): a participant's rating is one row
 * of a list, and once the event can't be rated the whole list gets the one
 * event-wide reason (after the window RATING_WINDOW_CLOSED, never a marked
 * row); rating the event is always one person's own, who hears that it was
 * deleted also after the window (#313).
 * One rating per participant and event and 1–5 stars are kept by the
 * database (`participant_rating`), not here.
 */
export function decideParticipantRatings(
  event: RatableEventState & { organizerUserId: string },
  raterId: string,
  participants: RatedParticipantState[],
  now: Date,
):
  | { ok: true }
  | { ok: false; refusal: ParticipantRatingRefusal; participantId?: string } {
  if (raterId !== event.organizerUserId) {
    return { ok: false, refusal: 'NOT_ORGANIZER' };
  }
  const notRatable = eventNotRatable(event, now);
  if (notRatable) return { ok: false, refusal: notRatable };
  for (const participant of participants) {
    const { participantId } = participant;
    if (participantId === event.organizerUserId) {
      return { ok: false, refusal: 'SELF_RATING', participantId };
    }
    if (participant.participationStatus !== 'approved') {
      return { ok: false, refusal: 'NOT_APPROVED', participantId };
    }
    if (participant.ratingDeleted) {
      return { ok: false, refusal: 'RATING_DELETED', participantId };
    }
  }
  return { ok: true };
}

/** The same for one participant (`decideParticipantRatings` with one). */
export function decideParticipantRating(
  state: ParticipantRatingState,
  now: Date,
): { ok: true } | { ok: false; refusal: ParticipantRatingRefusal } {
  const decision = decideParticipantRatings(state, state.raterId, [state], now);
  return decision.ok ? decision : { ok: false, refusal: decision.refusal };
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
