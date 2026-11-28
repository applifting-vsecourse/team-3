import type { Prisma } from '@/generated/prisma/client';
import { boxAround, distanceKm, type LatLng } from '@/shared/geo/distance';
import { compareCzech } from '@/shared/text/czech-order';

/**
 * Najdi parťáka (#84): people near me who like the same activities, one card at a time. The
 * rules here are pure, so who may show up, in what order and how the deck pages can be tested
 * without a database; the repository only loads the rows and the service applies these.
 */

/** „Hledat do 25 km“ steps through these, as the okolí on /akce (+10 / +25 / +50 km). */
export const PARTNER_RADII_KM = [10, 25, 50] as const;
export type PartnerRadiusKm = (typeof PARTNER_RADII_KM)[number];
export const DEFAULT_PARTNER_RADIUS_KM: PartnerRadiusKm = 10;
/** One page of the deck; the app asks for the next one while five cards are still left. */
export const PARTNER_PAGE_SIZE = 20;
/** A skipped person may come back after this long (Strava hides a suggestion for 28 days). */
export const PARTNER_SKIP_DAYS = 90;
/**
 * The distance a card shows, in bands, never finer and never the locality (the public profile
 * doesn't show it, #179): rounded up to the band, „do 2 km“, „asi 5 km“, „asi 10 km“, „asi 25
 * km“, „do 50 km“. It is measured between the centres of the two home localities, not where
 * anybody lives; distance oracles on dating apps (USENIX Security '24) are why it is coarse.
 */
export const PARTNER_DISTANCE_BANDS_KM = [2, 5, 10, 25, 50] as const;
export type PartnerDistanceBand = (typeof PARTNER_DISTANCE_BANDS_KM)[number];

export type PartnerActivity = { id: string; name: string; slug: string };

/** A person within the radius's rectangle as the repository loads them. */
export type PartnerCandidateRecord = {
  id: string;
  name: string;
  homeLocality: LatLng | null;
  interests: { activity: PartnerActivity }[];
  /** Their request to the viewer still waiting for an answer, if any (at most one row). */
  sentFriendRequests: { id: string }[];
};

/** What the viewer brings: their home locality and what they like. */
export type PartnerViewer = {
  home: LatLng;
  interestIds: readonly string[];
};

/**
 * One card: only what the public profile (#179) shows anyway — the name and the interests —
 * plus the distance band. Never the e-mail, the locality, coordinates, photos or where they go.
 */
export type PartnerSuggestion = {
  id: string;
  name: string;
  distanceBandKm: PartnerDistanceBand;
  /** „Oba vás baví“: the activities we both like, in Czech order. */
  sharedInterests: PartnerActivity[];
  /** Their other interests, in Czech order, as on their public profile. */
  otherInterests: PartnerActivity[];
  /** „Posílá ti žádost“: „Přidat“ accepts it, and that is the match. */
  hasRequestedMe: boolean;
  /**
   * „3 společní přátelé“ (#473): only how many, never who; null below two, so a 1 never tells
   * whom someone is friends with. Not a sort key: the cursor would have to carry it.
   */
  mutualFriendsCount: number | null;
};

/** A card as the ranking builds it; the page's cards get their mutual friends afterwards. */
export type RankedPartner = Omit<PartnerSuggestion, 'mutualFriendsCount'>;

/** A ranked card with its mutual friends, as the API gives it. */
export function withMutualFriends(
  partner: RankedPartner,
  mutualFriendsCount: number | null,
): PartnerSuggestion {
  return { ...partner, mutualFriendsCount };
}

/**
 * Who may show up for the viewer, as a Prisma `where`. Only people who can be met: verified,
 * not blocked or deleted, with the onboarding done and „Ukazovat mě v Najdi parťáka“ on, a home
 * locality in the radius's rectangle (the exact distance is checked in `rankPartners`) and at
 * least one activity the viewer likes too. Never the viewer, nor anyone they have a friendship
 * row with — friends, a request either way, one quietly rejected either way — except a request
 * from them still waiting for me: liking them back is the match (Bumble's and Tinder's mutual
 * like). Nobody the viewer skipped in the last `PARTNER_SKIP_DAYS` days.
 */
export function partnerCandidatesWhere(
  viewerId: string,
  viewer: PartnerViewer,
  radiusKm: number,
  now: Date,
): Prisma.UserWhereInput {
  const { west, south, east, north } = boxAround(viewer.home, radiusKm);
  return {
    id: { not: viewerId },
    emailVerified: true,
    blockedAt: null,
    deletedAt: null,
    onboardingCompletedAt: { not: null },
    partnerDiscoverable: true,
    homeLocality: {
      lat: { gte: south, lte: north },
      lng: { gte: west, lte: east },
    },
    interests: { some: { activityId: { in: [...viewer.interestIds] } } },
    // their row to me: only a request still waiting for my answer may stay
    sentFriendRequests: {
      none: { addresseeId: viewerId, status: { not: 'pending' } },
    },
    // my row to them, in any state
    receivedFriendRequests: { none: { requesterId: viewerId } },
    partnerSkipsReceived: {
      none: { skipperId: viewerId, createdAt: { gt: skipsSince(now) } },
    },
  };
}

/** Skips made after this still hide the person. */
export function skipsSince(now: Date): Date {
  return new Date(now.getTime() - PARTNER_SKIP_DAYS * 24 * 60 * 60 * 1000);
}

/** The smallest band the distance fits in; beyond the last one, none (nobody is that far). */
export function distanceBand(km: number): PartnerDistanceBand | undefined {
  return PARTNER_DISTANCE_BANDS_KM.find((band) => km <= band);
}

/**
 * The deck's order: first who already asks me (the first swipes often end in a match), then
 * more activities in common, then the nearer band, then by id so it never shuffles. Each key is
 * on the card anyway, so the cursor built from them gives nothing away.
 */
export function comparePartners(a: PartnerSortKey, b: PartnerSortKey): number {
  if (a.hasRequestedMe !== b.hasRequestedMe) return a.hasRequestedMe ? -1 : 1;
  if (a.sharedCount !== b.sharedCount) return b.sharedCount - a.sharedCount;
  if (a.distanceBandKm !== b.distanceBandKm) {
    return a.distanceBandKm - b.distanceBandKm;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

type PartnerSortKey = {
  id: string;
  hasRequestedMe: boolean;
  sharedCount: number;
  distanceBandKm: number;
};

const sortKey = (partner: RankedPartner): PartnerSortKey => ({
  id: partner.id,
  hasRequestedMe: partner.hasRequestedMe,
  sharedCount: partner.sharedInterests.length,
  distanceBandKm: partner.distanceBandKm,
});

/**
 * The whole deck for the viewer, in order: people exactly within the radius (not just its
 * rectangle) who share at least one activity with the viewer. Someone with nothing in common
 * isn't a partner, however near.
 */
export function rankPartners(
  viewer: PartnerViewer,
  candidates: readonly PartnerCandidateRecord[],
  radiusKm: number,
): RankedPartner[] {
  const liked = new Set(viewer.interestIds);
  const ranked: RankedPartner[] = [];
  for (const candidate of candidates) {
    if (!candidate.homeLocality) continue;
    // the cut-off is the band, never the exact distance: what crosses the radius is exactly what
    // changes the band shown, so an edge reveals nothing finer than the card does
    const band = distanceBand(distanceKm(viewer.home, candidate.homeLocality));
    if (band === undefined || band > radiusKm) continue;
    const interests = candidate.interests
      .map(({ activity: { id, name, slug } }) => ({ id, name, slug }))
      .sort((a, b) => compareCzech(a.name, b.name));
    const sharedInterests = interests.filter(({ id }) => liked.has(id));
    if (sharedInterests.length === 0) continue;
    ranked.push({
      id: candidate.id,
      name: candidate.name,
      distanceBandKm: band,
      sharedInterests,
      otherInterests: interests.filter(({ id }) => !liked.has(id)),
      hasRequestedMe: candidate.sentFriendRequests.length > 0,
    });
  }
  return ranked.sort((a, b) => comparePartners(sortKey(a), sortKey(b)));
}

/**
 * Where the previous page ended: the last card's place in the order, not an offset. People the
 * viewer skipped or liked meanwhile drop out of the deck, and an offset would then jump over as
 * many others; the place in the order doesn't move.
 */
export function encodePartnerCursor(partner: RankedPartner): string {
  const key = sortKey(partner);
  return Buffer.from(
    JSON.stringify([
      key.hasRequestedMe ? 1 : 0,
      key.sharedCount,
      key.distanceBandKm,
      key.id,
    ]),
  ).toString('base64url');
}

/** The cursor back, or undefined when it isn't one this API gave out. */
export function decodePartnerCursor(value: string): PartnerSortKey | undefined {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );
    if (!Array.isArray(parsed) || parsed.length !== 4) return undefined;
    const [requested, sharedCount, band, id] = parsed as unknown[];
    if (
      (requested !== 0 && requested !== 1) ||
      !Number.isInteger(sharedCount) ||
      !Number.isInteger(band) ||
      typeof id !== 'string' ||
      id.length === 0
    ) {
      return undefined;
    }
    return {
      hasRequestedMe: requested === 1,
      sharedCount: sharedCount as number,
      distanceBandKm: band as number,
      id,
    };
  } catch {
    return undefined;
  }
}

export type PartnerPage<T extends RankedPartner = PartnerSuggestion> = {
  items: T[];
  /** Null when the deck is through: nobody else within the radius. */
  nextCursor: string | null;
};

/** One page of the ranked deck after the cursor. */
export function partnerPage<T extends RankedPartner>(
  ranked: readonly T[],
  after: PartnerSortKey | undefined,
  size: number = PARTNER_PAGE_SIZE,
): PartnerPage<T> {
  const rest = after
    ? ranked.filter((partner) => comparePartners(sortKey(partner), after) > 0)
    : ranked;
  const page = rest.slice(0, size);
  const last = page[page.length - 1];
  return {
    items: page,
    nextCursor: rest.length > size && last ? encodePartnerCursor(last) : null,
  };
}
