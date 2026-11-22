import { selfProfile, type ProfileRow } from './profile';

export const ownerRow = (): ProfileRow => ({
  id: 'owner',
  name: 'Jana Nová',
  email: 'jana@example.com',
  emailVerified: true,
  blockedAt: null,
  deletedAt: null,
  partnerDiscoverable: true,
  homeLocality: null,
  interests: [],
  accounts: [{ id: 'credential' }],
});

describe('private profile projection (#178)', () => {
  it('returns only intended fields even if an adapter supplies extra auth or moderation data', () => {
    const row = {
      ...ownerRow(),
      role: 'admin',
      password: 'test-only-hash',
      blockedReason: 'private',
      accounts: [
        {
          id: 'credential',
          password: 'test-only-hash',
          accessToken: 'test-only-token',
        },
      ],
    };
    const profile = selfProfile(row);
    expect(profile).toEqual({
      id: 'owner',
      name: 'Jana Nová',
      email: 'jana@example.com',
      emailVerified: true,
      homeLocality: null,
      interests: [],
      hasPassword: true,
      partnerDiscoverable: true,
    });
    expect(JSON.stringify(profile)).not.toMatch(
      /test-only|blockedReason|accessToken/,
    );
  });

  it('does not invent a password for a social-only account', () => {
    expect(selfProfile({ ...ownerRow(), accounts: [] }).hasPassword).toBe(
      false,
    );
  });
});

describe('interests in Czech order (#370)', () => {
  it('Š between S and T, not after Z as the database has it', () => {
    const interests = ['Tenis', 'Šachy', 'Zumba', 'Squash'].map((name) => ({
      activity: { id: name, name },
    }));

    expect(
      selfProfile({ ...ownerRow(), interests }).interests.map(
        ({ name }) => name,
      ),
    ).toEqual(['Squash', 'Šachy', 'Tenis', 'Zumba']);
  });
});
