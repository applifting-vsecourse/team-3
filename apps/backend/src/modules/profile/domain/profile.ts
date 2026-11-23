import { Prisma } from '@/generated/prisma/client';
import type { RatingSummary } from '@/modules/rating/domain/rating-summary';
import { byCzechName } from '@/shared/text/czech-order';

export const profileSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  blockedAt: true,
  deletedAt: true,
  partnerDiscoverable: true,
  homeLocalityChangeDay: true,
  homeLocalityChangeCount: true,
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
  /** „Ukazovat mě v Najdi parťáka“ (#84), on by default. */
  partnerDiscoverable: boolean;
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
    partnerDiscoverable: row.partnerDiscoverable,
    // in Czech order, not the database's (#370)
    interests: byCzechName(
      row.interests.map(({ activity }) => ({
        id: activity.id,
        name: activity.name,
      })),
    ),
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
 * How many ratings per role the profile overview loads; all of them are counted
 * in `…Summary.count`. The profile shows the latest three (Figma B-05) and the
 * rest on „Zobrazit další“ (#370), so a list there ends somewhere.
 */
export const PROFILE_OVERVIEW_TAKE = 50;
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
  homeLocalityId?: string | null;
  interestIds?: string[];
  partnerDiscoverable?: boolean;
};
