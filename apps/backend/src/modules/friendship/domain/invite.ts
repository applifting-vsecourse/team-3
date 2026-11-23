/**
 * Pozvánka od kamaráda (#406): a personal link `/pozvanka/:code`. Whoever signs up through it
 * and confirms „Přidat do přátel“ in the onboarding is the inviter's friend at once, without a
 * request: sharing the link was the inviter's yes. No rewards (brief §4). The rules here are pure, like the friendship
 * rules they build on (`friendship.ts`), so every case is tested without a database.
 */
import {
  decideRequest,
  friendshipState,
  type FriendshipRow,
} from '@/modules/friendship/domain/friendship';

/**
 * 16 random bytes from a CSPRNG (128 bits, the OWASP Session Management Cheat Sheet's size of
 * an unguessable id) as base64url: 22 characters of `A–Z a–z 0–9 - _`, no name, no e-mail,
 * no user id (Duolingo's invite links are an opaque code like this too).
 */
export const INVITE_CODE_BYTES = 16;
export const INVITE_CODE_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export const inviteCodeOf = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString('base64url');

/**
 * How long after signing up an account counts as new: the onboarding offers the invite right
 * after the first sign-in, and an e-mail link may wait a few days. An older account that opens
 * a friend's link is no invited newcomer: it lands on the inviter's profile and sends an
 * ordinary friend request, so a link that got around (posted in a group chat) can't make
 * strangers friends who see where the inviter goes (Wise and Revolut count only new accounts).
 */
export const INVITE_NEW_ACCOUNT_DAYS = 14;
/** Sign-ups through one code per 24 hours; past it the code is quietly ignored (brief §4). */
export const INVITE_DAILY_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export const isNewAccount = (createdAt: Date, now: Date): boolean =>
  now.getTime() - createdAt.getTime() <= INVITE_NEW_ACCOUNT_DAYS * DAY_MS;

/** Since when sign-ups count towards today's limit of a code. */
export const inviteLimitSince = (now: Date): Date =>
  new Date(now.getTime() - DAY_MS);

/** The invitee as far as claiming the invite matters. */
export type InviteeAccount = { createdAt: Date; invitedById: string | null };

/**
 * Whether the invitee counts as invited by this inviter:
 * - `claim`: a new account nobody invited yet, and the code's limit isn't reached: it is now
 *   the inviter's invitee, and the inviter hears of it;
 * - `claimed`: already the inviter's invitee (the onboarding asked again), while still new;
 * - `ignored`: an older account, somebody else's invitee, or the code's limit is reached —
 *   the code is quietly ignored, „Přidat do přátel“ is an ordinary request.
 */
export function inviteClaim(
  account: InviteeAccount,
  inviterId: string,
  joinedToday: number,
  now: Date,
): 'claim' | 'claimed' | 'ignored' {
  // only while the account is new: an old invite never undoes the inviter's later „no“
  if (!isNewAccount(account.createdAt, now)) return 'ignored';
  if (account.invitedById === inviterId) return 'claimed';
  if (account.invitedById !== null) return 'ignored';
  return joinedToday < INVITE_DAILY_LIMIT ? 'claim' : 'ignored';
}

/**
 * What „Přidat do přátel“ from an invite does, from the invitee's side; `isInvited` is a
 * claimed invite (`inviteClaim`):
 * - `befriend`: no row between them, invited: a new friendship, accepted at once;
 * - `promote`: a row in any other state (a request either way, or the invitee's quiet rejection
 *   of the inviter), invited: the row becomes the friendship. A request of the invitee that the
 *   inviter quietly rejected stays theirs: the link doesn't undo the inviter's „no“;
 * - `request` / `accept` / `resend`: not invited, the ordinary „Přidat do přátel“
 *   (`decideRequest`): a request to the inviter, or accepting the inviter's own;
 * - `none`: nothing to write: already friends, or an older account whose request already waits.
 * `state` is how the invitee stands to the inviter afterwards.
 */
export type InviteDecision =
  | {
      ok: true;
      action: 'befriend' | 'promote' | 'accept';
      state: 'friends';
    }
  | { ok: true; action: 'request' | 'resend'; state: 'outgoing' }
  | { ok: true; action: 'none'; state: 'friends' | 'outgoing' }
  | { ok: false; refusal: 'SELF' };

export function decideInviteAccept(
  row: FriendshipRow | null,
  inviteeId: string,
  inviterId: string,
  isInvited: boolean,
): InviteDecision {
  const state = friendshipState(row, inviteeId, inviterId);
  if (state === 'self') return { ok: false, refusal: 'SELF' };
  if (state === 'friends')
    return { ok: true, action: 'none', state: 'friends' };
  // the inviter quietly rejected the invitee's request: the link doesn't override that
  const isRejectedByInviter =
    row?.status === 'rejected' && row.addresseeId === inviterId;
  if (isInvited && !isRejectedByInviter) {
    return row
      ? { ok: true, action: 'promote', state: 'friends' }
      : { ok: true, action: 'befriend', state: 'friends' };
  }
  const request = decideRequest(row, inviteeId, inviterId);
  if (!request.ok) return { ok: true, action: 'none', state: 'outgoing' };
  if (request.action === 'accept')
    return { ok: true, action: 'accept', state: 'friends' };
  return {
    ok: true,
    action: request.action === 'create' ? 'request' : 'resend',
    state: 'outgoing',
  };
}
