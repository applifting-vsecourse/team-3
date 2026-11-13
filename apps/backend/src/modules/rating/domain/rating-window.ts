/**
 * How long after an event its participants and organizer may rate, and
 * change their rating (B-060, tým 4. 11.). The same for `Rating` and
 * `ParticipantRating`.
 */
export const RATING_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The last moment to rate an event: RATING_WINDOW_DAYS after its end, or
 * after its start when it has no end (the same moment as `hasEventEnded`).
 */
export function ratingDeadline(event: {
  startsAt: Date;
  endsAt: Date | null;
}): Date {
  const end = event.endsAt ?? event.startsAt;
  return new Date(end.getTime() + RATING_WINDOW_DAYS * DAY_MS);
}

/** Whether the rating window is still open; its last moment still counts. */
export function isWithinRatingWindow(
  event: { startsAt: Date; endsAt: Date | null },
  now: Date,
): boolean {
  return now <= ratingDeadline(event);
}
