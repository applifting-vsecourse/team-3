import {
  eventNotOverWhere,
  eventOverWhere,
} from '@/modules/event/domain/event-over';
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
  it('keeps an event in progress in Kam jdu until it is over, as Moje akce does (#272)', () => {
    const where = participationWhere('owner', now, false);
    expect(where.event).toEqual(buildMyEventsWhere('attending', 'owner', now));
    expect(JSON.stringify(where)).toContain(
      JSON.stringify(eventNotOverWhere(now).OR),
    );
  });
  it('history: approved participation of events that are over, cancelled ones too (#272)', () => {
    expect(participationWhere('other-owner', now, true)).toEqual({
      userId: 'other-owner',
      status: 'approved',
      event: {
        status: { in: ['published', 'cancelled'] },
        ...eventOverWhere(now),
      },
    });
  });
});
