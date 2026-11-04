/**
 * An average rating as a profile shows it (#178, #179): the stars rounded to
 * one decimal and how many ratings it is made of. Without ratings the average
 * is null, not 0, which would read as a bad rating.
 */
export type RatingSummary = { average: number | null; count: number };

/**
 * The average of 1–5 stars, rounded to one decimal here (a half up), so every
 * page shows the same number.
 */
export function summarizeStars(stars: number[]): RatingSummary {
  if (stars.length === 0) return { average: null, count: 0 };
  const sum = stars.reduce((total, star) => total + star, 0);
  return {
    average: Math.round((sum * 10) / stars.length) / 10,
    count: stars.length,
  };
}

/** A participant's rating of the organizer, from `Rating`. */
export type OrganizerRatingRow = {
  organizerStars: number;
  deletedAt: Date | null;
  event: { groupId: string | null };
};

/**
 * The person's rating as an organizer (B-060): what participants gave in
 * `Rating.organizerStars`. Ratings a superadmin deleted don't count (B-063);
 * nor do events of a group, whose organizer rating belongs to the group.
 */
export function organizerRatingSummary(
  ratings: OrganizerRatingRow[],
): RatingSummary {
  return summarizeStars(
    ratings
      .filter((rating) => rating.deletedAt === null)
      .filter((rating) => rating.event.groupId === null)
      .map((rating) => rating.organizerStars),
  );
}

/** An organizer's rating of a participant, from `ParticipantRating`. */
export type ParticipantRatingRow = { stars: number; deletedAt: Date | null };

/**
 * The person's rating as a participant (#180): what organizers gave in
 * `ParticipantRating.stars`, without the ratings a superadmin deleted.
 */
export function participantRatingSummary(
  ratings: ParticipantRatingRow[],
): RatingSummary {
  return summarizeStars(
    ratings
      .filter((rating) => rating.deletedAt === null)
      .map((rating) => rating.stars),
  );
}
