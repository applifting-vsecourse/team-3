import type { PartnerSuggestion } from '@/modules/partner/domain/partner-suggestions';

/**
 * „Parťáci v okolí“ on the landing page (#474): the first few of the deck as rows, for a
 * signed-in user who has a reason to look and hasn't looked lately. The rules are pure, so
 * when the block shows can be tested without a database; the frontend only renders what the
 * API decided (`isShown`).
 */

/** How many people the block shows; fewer than this and it isn't there at all. */
export const PARTNER_HOME_SIZE = 3;
/** A visit to /partaci hides the block this long: they have just seen the deck. */
export const PARTNER_HOME_AFTER_VISIT_DAYS = 7;
/** „Skrýt“ hides it this long. */
export const PARTNER_HOME_HIDE_DAYS = 30;
/** With this many friends one has found people already: the block stays away. */
export const PARTNER_HOME_MAX_FRIENDS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

/** What the frequency cap reads, stored on the user (never in the browser). */
export type PartnerHomeState = {
  visitedAt: Date | null;
  hiddenUntil: Date | null;
  friendsCount: number;
};

/** What the deck said for the viewer: the gaps, „Ukazovat mě“ off, and its first page. */
export type PartnerHomeDeck = {
  missing: readonly string[];
  hidden: boolean;
  items: readonly PartnerSuggestion[];
};

export type PartnerHomePreview = {
  /** Whether the landing page shows the block; when false, `items` is empty. */
  isShown: boolean;
  items: PartnerSuggestion[];
};

export const NOT_SHOWN: PartnerHomePreview = { isShown: false, items: [] };

/** Until when „Skrýt“ pressed now hides the block. */
export function partnerHomeHiddenUntil(now: Date): Date {
  return new Date(now.getTime() + PARTNER_HOME_HIDE_DAYS * DAY_MS);
}

/**
 * Whether the cap lets the block in at all, before the deck is even built: not within 7 days
 * of a visit to /partaci, not while „Skrýt“ holds, not with 10 or more friends.
 */
export function isPartnerHomeDue(state: PartnerHomeState, now: Date): boolean {
  if (state.friendsCount >= PARTNER_HOME_MAX_FRIENDS) return false;
  if (state.hiddenUntil && state.hiddenUntil.getTime() > now.getTime()) {
    return false;
  }
  if (
    state.visitedAt &&
    now.getTime() - state.visitedAt.getTime() <
      PARTNER_HOME_AFTER_VISIT_DAYS * DAY_MS
  ) {
    return false;
  }
  return true;
}

/**
 * The block: only with the profile complete (`missing` empty), „Ukazovat mě“ on and at least
 * three people, then exactly the first three in the deck's order. Otherwise nothing — no empty
 * state on the landing page, it would be a section for the section's sake (DESIGN.md › Layout).
 */
export function partnerHomePreview(
  deck: PartnerHomeDeck,
  state: PartnerHomeState,
  now: Date,
): PartnerHomePreview {
  if (!isPartnerHomeDue(state, now)) return NOT_SHOWN;
  if (deck.missing.length > 0 || deck.hidden) return NOT_SHOWN;
  if (deck.items.length < PARTNER_HOME_SIZE) return NOT_SHOWN;
  return { isShown: true, items: deck.items.slice(0, PARTNER_HOME_SIZE) };
}
