import {
  pragueDayOf,
  startOfPragueDayAfter,
} from '@/modules/event/domain/prague-day';

/**
 * How long after an event its participants and organizer may rate, and
 * change their rating (B-060, tým 4. 11.): calendar days in Prague, not
 * 14 × 24 h (review #313). The same for `Rating` and `ParticipantRating`.
 */
export const RATING_WINDOW_DAYS = 14;

/**
 * The last moment to rate an event: the end of the RATING_WINDOW_DAYS-th
 * Prague calendar day after the day the event ended (or started, when it has
 * no end – the same moment as `hasEventEnded`). An event that ended on Monday
 * 19. 10. at 20:00 can be rated until Monday 2. 11., 23:59:59.999 in Prague,
 * whatever time zone or change of time lies between.
 */
export function ratingDeadline(event: {
  startsAt: Date;
  endsAt: Date | null;
}): Date {
  const endDay = pragueDayOf(event.endsAt ?? event.startsAt);
  const closesAt = startOfPragueDayAfter(endDay, RATING_WINDOW_DAYS + 1);
  return new Date(closesAt.getTime() - 1);
}

/** Whether the rating window is still open; its last moment still counts. */
export function isWithinRatingWindow(
  event: { startsAt: Date; endsAt: Date | null },
  now: Date,
): boolean {
  return now <= ratingDeadline(event);
}
