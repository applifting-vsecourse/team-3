/**
 * Deleting one's account (B-080, #64). The account is anonymized, not removed:
 * events, ratings and payments point at it (`onDelete: Restrict`), and the
 * past stays readable for the others under „Smazaný uživatel“, as GitHub's
 * „ghost“ or Discord's „Deleted User“ do. What belongs to the person (profile,
 * e-mail, sign-in, friendships, memberships, upozornění) goes.
 */

/** The name a deleted account shows wherever it was: participants, ratings, messages. */
export const DELETED_USER_NAME = 'Smazaný uživatel';

/** The reason the participants of its cancelled events see (gender-neutral, DESIGN.md › Copy). */
export const ORGANIZER_DELETED_CANCEL_REASON = 'Účet organizátora byl smazán.';

/**
 * What an account without a password (Google only) types to confirm, as
 * GitHub asks for a phrase (research in the PR). Compared without case and
 * extra spaces, so „Smazat účet“ counts.
 */
export const DELETE_CONFIRMATION_PHRASE = 'smazat účet';

/**
 * The e-mail a deleted account keeps: unique, so the column's unique index
 * holds, and on the reserved `.invalid` domain (RFC 2606), so nothing is ever
 * delivered there. The real address is freed: the person can sign up again.
 */
export const deletedEmail = (userId: string): string =>
  `deleted-${userId}@deleted.invalid`;

export type DeletionRefusal =
  /** an account with a password sent none */
  | 'PASSWORD_REQUIRED'
  /** an account without a password didn't type the phrase */
  | 'CONFIRMATION_MISMATCH'
  /** an account without a password signed in too long ago (OWASP re-authentication) */
  | 'REAUTHENTICATION_REQUIRED';

export type ConfirmationDecision =
  | { kind: 'verify-password'; password: string }
  | { kind: 'confirmed' }
  | { kind: 'refused'; refusal: DeletionRefusal };

const normalizePhrase = (text: string): string =>
  text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('cs');

/**
 * How the person proves it is them before the account goes (OWASP: a
 * sensitive action asks for the current credential again). With a password:
 * the password, checked by BetterAuth. Without one (signed up with Google):
 * the phrase, and a session started within BetterAuth's `freshAge` — the
 * same rule its own sensitive endpoints use — so a phone left signed in for
 * a week can't delete the account with a phrase alone.
 */
export function decideConfirmation(input: {
  hasPassword: boolean;
  password?: string;
  confirmation?: string;
  sessionCreatedAt: Date;
  now: Date;
  freshAgeSeconds: number;
}): ConfirmationDecision {
  if (input.hasPassword) {
    return input.password
      ? { kind: 'verify-password', password: input.password }
      : { kind: 'refused', refusal: 'PASSWORD_REQUIRED' };
  }
  if (
    !input.confirmation ||
    normalizePhrase(input.confirmation) !== DELETE_CONFIRMATION_PHRASE
  ) {
    return { kind: 'refused', refusal: 'CONFIRMATION_MISMATCH' };
  }
  const age = input.now.getTime() - input.sessionCreatedAt.getTime();
  if (input.freshAgeSeconds > 0 && age >= input.freshAgeSeconds * 1000) {
    return { kind: 'refused', refusal: 'REAUTHENTICATION_REQUIRED' };
  }
  return { kind: 'confirmed' };
}

export type AdminMembership = {
  groupId: string;
  groupName: string;
  groupStatus: 'active' | 'inactive';
  /** active admins of the group, the person included */
  activeAdminCount: number;
};

/**
 * The groups the person runs alone (B-080, B-054): an active group whose only
 * active admin they are. B-080: „Poslední správce skupiny musí předat správu,
 * jinak se skupina deaktivuje.“ The dialog names them beforehand with the way
 * to hand over; whatever is still theirs when they confirm is deactivated,
 * as „Deaktivovat skupinu“ does (B-051). A group with another admin just
 * loses a member.
 */
export function groupsRunAlone(
  memberships: AdminMembership[],
): { id: string; name: string }[] {
  return memberships
    .filter(
      (membership) =>
        membership.groupStatus === 'active' && membership.activeAdminCount <= 1,
    )
    .map(({ groupId, groupName }) => ({ id: groupId, name: groupName }));
}

/**
 * The account's row once deleted: the name others see, a freed e-mail, no
 * profile (bio, photo, username, home locality), nothing visible to anyone,
 * no admin role. `deletedAt` keeps it out of every list and the public
 * profile (404).
 */
export function anonymizedAccount(
  userId: string,
  now: Date,
): {
  name: string;
  email: string;
  emailVerified: false;
  image: null;
  username: null;
  displayUsername: null;
  bio: null;
  homeLocalityId: null;
  role: 'user';
  photoVisibility: 'nobody';
  bioVisibility: 'nobody';
  pastEventsVisibility: 'nobody';
  deletedAt: Date;
  updatedAt: Date;
} {
  return {
    name: DELETED_USER_NAME,
    email: deletedEmail(userId),
    emailVerified: false,
    image: null,
    username: null,
    displayUsername: null,
    bio: null,
    homeLocalityId: null,
    role: 'user',
    photoVisibility: 'nobody',
    bioVisibility: 'nobody',
    pastEventsVisibility: 'nobody',
    deletedAt: now,
    updatedAt: now,
  };
}
