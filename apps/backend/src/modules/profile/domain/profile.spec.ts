import { buildMyEventsWhere } from '@/modules/event/repositories/my-events-where';
import { participationWhere, selfProfile, type ProfileRow } from './profile';

export const ownerRow = (): ProfileRow => ({
  id: 'owner',
  name: 'Jana Nová',
  email: 'jana@example.com',
  emailVerified: true,
  blockedAt: null,
  deletedAt: null,
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

describe('private participation history (#178)', () => {
  const now = new Date('2026-11-05T12:00:00Z');
  it('keeps the owner predicate and pending requests and matches the Přihlášen tab of Moje akce', () => {
    expect(participationWhere('owner', now, false)).toEqual({
      userId: 'owner',
      status: { in: ['pending', 'approved'] },
      event: buildMyEventsWhere('attending', 'owner', now),
    });
  });
  it('leaves out events already in progress, as Moje akce does', () => {
    const where = participationWhere('owner', now, false);
    expect(JSON.stringify(where)).toContain(
      `"startsAt":${JSON.stringify({ gt: now })}`,
    );
    expect(JSON.stringify(where)).not.toContain('endsAt');
  });
  it('only counts approved participation in history and uses the end time when available', () => {
    expect(participationWhere('other-owner', now, true)).toEqual({
      userId: 'other-owner',
      status: 'approved',
      event: {
        status: 'published',
        OR: [{ endsAt: { lt: now } }, { endsAt: null, startsAt: { lt: now } }],
      },
    });
  });
});
