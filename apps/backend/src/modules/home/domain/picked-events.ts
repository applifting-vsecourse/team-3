import { PublicEvent } from '@/modules/event/domain/event';
import { RatingSummary } from '@/modules/rating/domain/rating-summary';
import { HomeViewer, isWellRated, ratingKeyOf } from './home-sections';

/**
 * The personal parts of the quick picks on /akce (#250, Figma A-02d), on top
 * of the ordinary filters: the same rules as the landing page's sections
 * (docs/ux-audit.md › Úvodní stránka), so a tab and its section agree.
 */
export type PickFilters = {
  /** „Podle tvých zájmů“, „Tady chybíš“: activities from the profile and past events. */
  interests?: boolean;
  /** „Od dobře hodnocených“: an average of at least 4.5 from at least 3 ratings. */
  wellRated?: boolean;
  /** „Tady chybíš“: no event one organizes, joined, asked to join or can't ask any more. */
  notJoined?: boolean;
};

/**
 * Which events the pick keeps, in their order. A visitor has no interests and
 * nothing joined: those parts then keep everything. Interests without any
 * (nothing in the profile, no past event) keep everything too — the landing
 * page shows a random pick there, a list just stays whole.
 */
export function keepPicked(
  events: PublicEvent[],
  picks: PickFilters,
  viewer: HomeViewer | null,
  ratings: Map<string, RatingSummary>,
): PublicEvent[] {
  const joined = new Set(viewer?.joinedEventIds ?? []);
  const interests = new Set(viewer?.interestActivityIds ?? []);
  return events.filter(
    (event) =>
      (!picks.notJoined ||
        (!joined.has(event.id) && event.organizer.id !== viewer?.id)) &&
      (!picks.interests ||
        interests.size === 0 ||
        interests.has(event.activity.id)) &&
      (!picks.wellRated || isWellRated(ratings.get(ratingKeyOf(event)))),
  );
}
