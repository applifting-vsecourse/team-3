import {
  anonymizedAccount,
  decideConfirmation,
  DELETED_USER_NAME,
  deletedEmail,
  groupsRunAlone,
} from './account-deletion';

const now = new Date('2026-11-23T12:00:00Z');
const DAY = 86_400;

describe('decideConfirmation (B-080, OWASP re-authentication)', () => {
  const base = { now, sessionCreatedAt: now, freshAgeSeconds: DAY };

  it('asks an account with a password for it, and nothing else counts', () => {
    expect(
      decideConfirmation({ ...base, hasPassword: true, password: 'Tajne123' }),
    ).toEqual({ kind: 'verify-password', password: 'Tajne123' });
    expect(
      decideConfirmation({
        ...base,
        hasPassword: true,
        confirmation: 'smazat účet',
      }),
    ).toEqual({ kind: 'refused', refusal: 'PASSWORD_REQUIRED' });
  });

  it('a password account is not refused for an old session: the password is the re-authentication', () => {
    expect(
      decideConfirmation({
        ...base,
        hasPassword: true,
        password: 'x',
        sessionCreatedAt: new Date(now.getTime() - 30 * DAY * 1000),
      }).kind,
    ).toBe('verify-password');
  });

  it('asks a Google-only account for the phrase, without case or extra spaces', () => {
    expect(
      decideConfirmation({
        ...base,
        hasPassword: false,
        confirmation: '  Smazat   ÚČET ',
      }),
    ).toEqual({ kind: 'confirmed' });
    for (const confirmation of [undefined, '', 'smazat', 'smazat ucet']) {
      expect(
        decideConfirmation({ ...base, hasPassword: false, confirmation }),
      ).toEqual({ kind: 'refused', refusal: 'CONFIRMATION_MISMATCH' });
    }
  });

  it('wants a fresh sign-in from a Google-only account', () => {
    const at = (secondsAgo: number) =>
      decideConfirmation({
        ...base,
        hasPassword: false,
        confirmation: 'smazat účet',
        sessionCreatedAt: new Date(now.getTime() - secondsAgo * 1000),
      });
    expect(at(DAY - 1)).toEqual({ kind: 'confirmed' });
    expect(at(DAY)).toEqual({
      kind: 'refused',
      refusal: 'REAUTHENTICATION_REQUIRED',
    });
  });
});

describe('groupsRunAlone (B-080, B-054)', () => {
  it('names the active groups whose only active admin the person is', () => {
    expect(
      groupsRunAlone([
        {
          groupId: 'g1',
          groupName: 'Běžci',
          groupStatus: 'active',
          activeAdminCount: 1,
        },
        {
          groupId: 'g2',
          groupName: 'Deskovky',
          groupStatus: 'active',
          activeAdminCount: 2,
        },
        {
          groupId: 'g3',
          groupName: 'Stará',
          groupStatus: 'inactive',
          activeAdminCount: 1,
        },
      ]),
    ).toEqual([{ id: 'g1', name: 'Běžci' }]);
  });
});

describe('anonymizedAccount (B-080)', () => {
  it('keeps the row under „Smazaný uživatel“ with nothing personal left', () => {
    const data = anonymizedAccount('u1', now);
    expect(data).toMatchObject({
      name: DELETED_USER_NAME,
      email: deletedEmail('u1'),
      emailVerified: false,
      image: null,
      username: null,
      displayUsername: null,
      bio: null,
      homeLocalityId: null,
      role: 'user',
      deletedAt: now,
    });
    expect(DELETED_USER_NAME).toBe('Smazaný uživatel');
  });

  it('frees the e-mail for a new sign-up with a unique, undeliverable address', () => {
    expect(deletedEmail('u1')).toBe('deleted-u1@deleted.invalid');
    expect(deletedEmail('u1')).not.toBe(deletedEmail('u2'));
  });
});
