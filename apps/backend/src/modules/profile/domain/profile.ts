import { Prisma } from '@/generated/prisma/client';
import type { PublicEvent } from '@/modules/event/domain/event';
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

/** The authenticated owner is always part of every private history predicate. */
export function participationWhere(
  userId: string,
  now: Date,
  past: boolean,
): Prisma.ParticipationWhereInput {
  return {
    userId,
    status: past ? 'approved' : { in: ['pending', 'approved'] },
    event: {
      status: 'published',
      OR: past
        ? [{ endsAt: { lt: now } }, { endsAt: null, startsAt: { lt: now } }]
        : [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: now } }],
    },
  };
}

export type UpdateProfileInput = {
  name?: string;
  homeLocalityId?: string | null;
  interestIds?: string[];
};
