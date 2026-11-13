import { RatingSummary, summarizeStars } from './rating-summary';

/** One participant's rating of the event, as the organizer sees it (B-060). */
export type ReceivedRating = {
  author: { id: string; name: string };
  eventStars: number;
  organizerStars: number;
  comment: string | null;
  updatedAt: Date;
};

/**
 * What the event got from its participants (B-060 „Organizátor vidí
 * hodnocení a komentáře svých akcí“, #66): both averages, always with their
 * count, and each rating newest first. Ratings a superadmin deleted are left
 * out by the read, as everywhere.
 */
export type ReceivedRatings = {
  summary: { event: RatingSummary; organizer: RatingSummary };
  ratings: ReceivedRating[];
};

export function toReceivedRatings(ratings: ReceivedRating[]): ReceivedRatings {
  return {
    summary: {
      event: summarizeStars(ratings.map((rating) => rating.eventStars)),
      organizer: summarizeStars(ratings.map((rating) => rating.organizerStars)),
    },
    ratings,
  };
}

/**
 * Who sees them: who manages the event – its organizer or, for an event of a
 * group, an active admin of the group (as the event's management, B-055).
 */
export function canSeeReceivedRatings(viewer: {
  isOrganizer: boolean;
  isGroupAdmin: boolean;
}): boolean {
  return viewer.isOrganizer || viewer.isGroupAdmin;
}
