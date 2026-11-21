import { Prisma } from '@/generated/prisma/client';
import type { RatingSummary } from '@/modules/rating/domain/rating-summary';

export const profileSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  bio: true,
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
  bio: string | null;
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
    bio: row.bio,
    hasPassword: row.accounts.length > 0,
    homeLocality: row.homeLocality,
    interests: row.interests.map(({ activity }) => ({
      id: activity.id,
      name: activity.name,
    })),
  };
}
export type ProfileRating = {
  id: string;
  stars: number;
  comment: string | null;
  createdAt: Date;
  event: { id: string; title: string };
  author: { id: string; name: string };
};
/**
 * How many ratings per role the profile overview loads (Figma B-05 shows a
 * slice); all of them are counted in `…Summary.count`.
 */
export const PROFILE_OVERVIEW_TAKE = 3;
/**
 * The profile's overview: the ratings. Events are in Moje (#367: the profile
 * is who I am and whom I know, Moje what I do): `GET /api/me/events`.
 */
export type ProfileOverview = {
  participantRatings: ProfileRating[];
  organizerRatings: ProfileRating[];
  participantSummary: RatingSummary;
  organizerSummary: RatingSummary;
};

export type UpdateProfileInput = {
  name?: string;
  bio?: string | null;
  homeLocalityId?: string | null;
  interestIds?: string[];
};

export type OnboardingInput = {
  homeLocalityId: string;
  interestIds: string[];
  bio?: string | null;
  displayName?: string | null;
};
