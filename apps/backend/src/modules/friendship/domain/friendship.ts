/**
 * Friends (B-017, #307): one request per pair of people, whoever asked. The rules here are pure,
 * so every state can be tested without a database; the service only loads the pair's row and
 * applies what these decide.
 */

export const FRIENDSHIP_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[number];

/** The pair's row as far as the rules need it. */
export type FriendshipRow = {
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
};

/**
 * The pair's key: both ids sorted and joined. Its unique index keeps one row per pair in the
 * database, also when both send a request at the same moment.
 */
export function friendshipPairKey(oneId: string, otherId: string): string {
  return [oneId, otherId].sort().join(':');
}

/**
 * How the viewer stands to the other person, for their profile's button (Figma B-07 · Stavy
 * tlačítka přátelství):
 * - `friends`, accepted;
 * - `outgoing`, the viewer's request waits — also when the other quietly rejected it: the viewer
 *   still sees „Žádost odeslána“ (decided 18. 11.);
 * - `incoming`, the other's request waits for the viewer;
 * - `none`, nothing between them, or the viewer rejected the other's request: they may send one
 *   of their own;
 * - `self`, the viewer's own profile.
 */
export type FriendshipState =
  'none' | 'outgoing' | 'incoming' | 'friends' | 'self';

export function friendshipState(
  row: FriendshipRow | null,
  viewerId: string,
  otherId: string,
): FriendshipState {
  if (viewerId === otherId) return 'self';
  if (!row) return 'none';
  if (row.status === 'accepted') return 'friends';
  const isRequester = row.requesterId === viewerId;
  if (row.status === 'pending') return isRequester ? 'outgoing' : 'incoming';
  // rejected: silent for the one who asked, a clean slate for the one who rejected
  return isRequester ? 'outgoing' : 'none';
}

export type FriendshipRefusal =
  | 'SELF'
  | 'ALREADY_FRIENDS'
  | 'ALREADY_REQUESTED'
  | 'NO_REQUEST'
  | 'NO_FRIENDSHIP';

type Refused = { ok: false; refusal: FriendshipRefusal };

/**
 * „Přidat do přátel“: a new request, or — when the other already asks the viewer — accepting
 * it (one row per pair: B asking A who asks B is a yes). The one who rejected a request may
 * later send their own: the row turns round, a new request from them.
 */
export function decideRequest(
  row: FriendshipRow | null,
  viewerId: string,
  otherId: string,
): { ok: true; action: 'create' | 'accept' | 'resend' } | Refused {
  const state = friendshipState(row, viewerId, otherId);
  switch (state) {
    case 'self':
      return { ok: false, refusal: 'SELF' };
    case 'friends':
      return { ok: false, refusal: 'ALREADY_FRIENDS' };
    case 'outgoing':
      return { ok: false, refusal: 'ALREADY_REQUESTED' };
    case 'incoming':
      return { ok: true, action: 'accept' };
    case 'none':
      return { ok: true, action: row ? 'resend' : 'create' };
  }
}

/** „Odmítnout“: only a request waiting for the viewer; quietly, the other isn't told. */
export function decideReject(
  row: FriendshipRow | null,
  viewerId: string,
  otherId: string,
): { ok: true } | Refused {
  if (viewerId === otherId) return { ok: false, refusal: 'SELF' };
  return friendshipState(row, viewerId, otherId) === 'incoming'
    ? { ok: true }
    : { ok: false, refusal: 'NO_REQUEST' };
}

/**
 * „Zrušit žádost“ or „Odebrat z přátel“: the row goes, and a request may be sent again
 * (decided 18. 11., even after a quiet rejection — no protection against repeated requests for
 * now). A request waiting for the viewer is rejected, not deleted: `NO_FRIENDSHIP` here.
 */
export function decideRemove(
  row: FriendshipRow | null,
  viewerId: string,
  otherId: string,
): { ok: true; action: 'cancel' | 'unfriend' } | Refused {
  const state = friendshipState(row, viewerId, otherId);
  if (state === 'self') return { ok: false, refusal: 'SELF' };
  if (state === 'friends') return { ok: true, action: 'unfriend' };
  if (state === 'outgoing') return { ok: true, action: 'cancel' };
  return { ok: false, refusal: 'NO_FRIENDSHIP' };
}
