import { Prisma } from '@/generated/prisma/client';
import type { PublicEvent } from '@/modules/event/domain/event';
import { eventOverWhere } from '@/modules/event/domain/event-over';
import { buildMyEventsWhere } from '@/modules/event/repositories/my-events-where';
import type { RatingSummary } from '@/modules/rating/domain/rating-summary';

export const profileSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  blockedAt: true,
  deletedAt: true,
  homeLocality: {
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      lat: true,
      lng: true,
    },
  },
  interests: {
    select: { activity: { select: { id: true, name: true } } },
    orderBy: { activity: { name: 'asc' } },
  },
  accounts: {
    where: { providerId: 'credential', password: { not: null } },
    select: { id: true },
  },
} satisfies Prisma.UserSelect;
export type ProfileRow = Prisma.UserGetPayload<{
  select: typeof profileSelect;
}>;
export type SelfProfile = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  homeLocality: ProfileRow['homeLocality'];
  interests: { id: string; name: string }[];
};

// A projection, never a spread: auth/account and moderation data cannot escape.
export function selfProfile(row: ProfileRow): SelfProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    hasPassword: row.accounts.length > 0,
    homeLocality: row.homeLocality,
    interests: row.interests.map(({ activity }) => ({
      id: activity.id,
      name: activity.name,
    })),
  };
}
/** The public event (the same as in GET /api/events, for the event cards) and my place in it. */
export type ProfileEvent = PublicEvent & {
  status: 'published' | 'cancelled';
  localityName: string;
  participation: 'approved' | 'pending' | null;
};
export type ProfileRating = {
  id: string;
  stars: number;
  comment: string | null;
  createdAt: Date;
  event: { id: string; title: string };
  author: { id: string; name: string };
};
/**
 * How many events per section and ratings per role the profile overview
 * loads (Figma B-05 shows a slice with a link to the rest). The totals come
 * alongside: `…Total` for events, `…Summary.count` for ratings.
 */
export const PROFILE_OVERVIEW_TAKE = 3;
export type ProfileOverview = {
  organizing: ProfileEvent[];
  organizingTotal: number;
  upcoming: ProfileEvent[];
  upcomingTotal: number;
  past: ProfileEvent[];
  pastTotal: number;
  participantRatings: ProfileRating[];
  organizerRatings: ProfileRating[];
  participantSummary: RatingSummary;
  organizerSummary: RatingSummary;
};

/**
 * The owner's participations of a section. Upcoming („Kam jdu“) is exactly the
 * Přihlášen tab of Moje akce (`buildMyEventsWhere('attending')`: events that
 * have not started yet, cancelled ones with their label), so the section, its
 * total and „Všechny v Moje akce“ agree. History counts approved places of
 * events that are over (`eventOverWhere`, #272), cancelled ones too: the card
 * says „Zrušeno · Akce se nekonala“ and offers no rating (Figma B-05, #272).
 */
export function participationWhere(
  userId: string,
  now: Date,
  past: boolean,
): Prisma.ParticipationWhereInput {
  if (!past)
    return {
      userId,
      status: { in: ['pending', 'approved'] },
      event: buildMyEventsWhere('attending', userId, now),
    };
  return {
    userId,
    status: 'approved',
    event: {
      status: { in: ['published', 'cancelled'] },
      ...eventOverWhere(now),
    },
  };
}

export type UpdateProfileInput = {
  name?: string;
  homeLocalityId?: string | null;
  interestIds?: string[];
};
