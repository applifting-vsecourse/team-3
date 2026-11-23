import type { FriendshipRow } from '@/modules/friendship/domain/friendship';
import {
  decideInviteAccept,
  INVITE_CODE_PATTERN,
  INVITE_DAILY_LIMIT,
  inviteClaim,
  inviteCodeOf,
  inviteLimitSince,
  isNewAccount,
} from './invite';

const NEW = 'invitee';
const INVITER = 'inviter';
const now = new Date('2026-11-23T10:00:00.000Z');
const daysAgo = (days: number): Date =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const row = (
  requesterId: string,
  addresseeId: string,
  status: FriendshipRow['status'],
): FriendshipRow => ({ requesterId, addresseeId, status });

describe('invite code (#406)', () => {
  it('is 16 random bytes as 22 characters of base64url, nothing personal', () => {
    const code = inviteCodeOf(new Uint8Array(16).fill(255));
    expect(code).toBe('_____________________w');
    expect(code).toMatch(INVITE_CODE_PATTERN);
  });

  it.each(['', 'short', 'q3Zr1hXkE0bLw9yT2vNcA!', `${'a'.repeat(22)}/`])(
    'refuses %p',
    (code) => {
      expect(INVITE_CODE_PATTERN.test(code)).toBe(false);
    },
  );
});

describe('isNewAccount (#406)', () => {
  it('is new for 14 days after signing up', () => {
    expect(isNewAccount(daysAgo(0), now)).toBe(true);
    expect(isNewAccount(daysAgo(14), now)).toBe(true);
    expect(isNewAccount(daysAgo(15), now)).toBe(false);
  });

  it('counts the daily limit over the last 24 hours', () => {
    expect(inviteLimitSince(now)).toEqual(daysAgo(1));
  });
});

describe('inviteClaim (#406)', () => {
  const fresh = { createdAt: daysAgo(0), invitedById: null };

  it('a new account nobody invited becomes the inviter’s', () => {
    expect(inviteClaim(fresh, INVITER, 0, now)).toBe('claim');
    expect(inviteClaim(fresh, INVITER, INVITE_DAILY_LIMIT - 1, now)).toBe(
      'claim',
    );
  });

  it('claimed by the same inviter counts only while the account is new', () => {
    expect(
      inviteClaim(
        { createdAt: daysAgo(30), invitedById: INVITER },
        INVITER,
        0,
        now,
      ),
    ).toBe('ignored');
  });

  it('the same inviter asking again is claimed already', () => {
    expect(
      inviteClaim({ ...fresh, invitedById: INVITER }, INVITER, 99, now),
    ).toBe('claimed');
  });

  it('ignores the code for somebody else’s invitee', () => {
    expect(
      inviteClaim({ ...fresh, invitedById: 'other' }, INVITER, 0, now),
    ).toBe('ignored');
  });

  it('ignores the code for an older account', () => {
    expect(
      inviteClaim(
        { createdAt: daysAgo(30), invitedById: null },
        INVITER,
        0,
        now,
      ),
    ).toBe('ignored');
  });

  it('ignores the code past 20 sign-ups a day', () => {
    expect(inviteClaim(fresh, INVITER, INVITE_DAILY_LIMIT, now)).toBe(
      'ignored',
    );
  });
});

describe('decideInviteAccept (#406)', () => {
  it('refuses one’s own invite', () => {
    expect(decideInviteAccept(null, INVITER, INVITER, true)).toEqual({
      ok: false,
      refusal: 'SELF',
    });
  });

  it('already friends: nothing to write', () => {
    expect(
      decideInviteAccept(row(INVITER, NEW, 'accepted'), NEW, INVITER, true),
    ).toEqual({ ok: true, action: 'none', state: 'friends' });
  });

  describe('invited', () => {
    it('no row: friends at once', () => {
      expect(decideInviteAccept(null, NEW, INVITER, true)).toEqual({
        ok: true,
        action: 'befriend',
        state: 'friends',
      });
    });

    it.each([
      ['the inviter’s request', row(INVITER, NEW, 'pending')],
      ['my request', row(NEW, INVITER, 'pending')],
      ['the inviter’s request I rejected', row(INVITER, NEW, 'rejected')],
    ])('%s becomes the friendship', (_, existing) => {
      expect(decideInviteAccept(existing, NEW, INVITER, true)).toEqual({
        ok: true,
        action: 'promote',
        state: 'friends',
      });
    });
  });

  it('invited, but the inviter quietly rejected my request: it stays mine', () => {
    expect(
      decideInviteAccept(row(NEW, INVITER, 'rejected'), NEW, INVITER, true),
    ).toEqual({ ok: true, action: 'none', state: 'outgoing' });
  });

  describe('not invited: the ordinary „Přidat do přátel“', () => {
    it('no row: a request', () => {
      expect(decideInviteAccept(null, NEW, INVITER, false)).toEqual({
        ok: true,
        action: 'request',
        state: 'outgoing',
      });
    });

    it('the inviter already asks: accepting', () => {
      expect(
        decideInviteAccept(row(INVITER, NEW, 'pending'), NEW, INVITER, false),
      ).toEqual({ ok: true, action: 'accept', state: 'friends' });
    });

    it('I rejected the inviter before: my own request', () => {
      expect(
        decideInviteAccept(row(INVITER, NEW, 'rejected'), NEW, INVITER, false),
      ).toEqual({ ok: true, action: 'resend', state: 'outgoing' });
    });

    it.each(['pending', 'rejected'] as const)(
      'my request waits (%s): nothing to write',
      (status) => {
        expect(
          decideInviteAccept(row(NEW, INVITER, status), NEW, INVITER, false),
        ).toEqual({ ok: true, action: 'none', state: 'outgoing' });
      },
    );
  });
});
