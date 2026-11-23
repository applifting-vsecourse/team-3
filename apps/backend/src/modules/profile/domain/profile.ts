import { Prisma } from '@/generated/prisma/client';
import type { RatingSummary } from '@/modules/rating/domain/rating-summary';
import { byCzechName } from '@/shared/text/czech-order';

/**
 * Who sees the photo, the bio and the visited events (B-014, #64). The circles
 * are nested: everyone ⊃ friends (friends and the organizers of events I apply
 * to) ⊃ organizers (just those organizers) ⊃ nobody (just me).
 */
export const PROFILE_VISIBILITIES = [
  'everyone',
  'friends',
  'organizers',
  'nobody',
] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];
export type ProfileVisibilitySettings = {
  photo: ProfileVisibility;
  bio: ProfileVisibility;
  pastEvents: ProfileVisibility;
};

export const profileSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  bio: true,
  photoImageKey: true,
  photoVisibility: true,
  bioVisibility: true,
  pastEventsVisibility: true,
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
  /** The uploaded photo (#64), at GET /api/images/{photoKey}; null = initials. */
  photoKey: string | null;
  visibility: ProfileVisibilitySettings;
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
    photoKey: row.photoImageKey,
    visibility: {
      photo: row.photoVisibility,
      bio: row.bioVisibility,
      pastEvents: row.pastEventsVisibility,
    },
    hasPassword: row.accounts.length > 0,
    homeLocality: row.homeLocality,
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
  bio?: string | null;
  photoVisibility?: ProfileVisibility;
  bioVisibility?: ProfileVisibility;
  pastEventsVisibility?: ProfileVisibility;
  homeLocalityId?: string | null;
  interestIds?: string[];
};

export type OnboardingInput = Omit<
  UpdateProfileInput,
  'name' | 'homeLocalityId' | 'interestIds'
> & {
  homeLocalityId: string;
  interestIds: string[];
  displayName?: string | null;
};
