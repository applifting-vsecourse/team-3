import {
  exportFriendshipSelect,
  exportProfileSelect,
  exportRatingReceivedSelect,
  toAccountExport,
  type AccountExportRows,
} from './account-export';

const now = new Date('2026-11-23T12:00:00Z');
const at = new Date('2026-10-01T10:00:00Z');
const event = { id: 'e1', title: 'Deskovky v Karlíně', startsAt: at };

const rows = (): AccountExportRows => ({
  profile: {
    id: 'me',
    name: 'Jana Nová',
    email: 'jana@example.com',
    emailVerified: true,
    username: null,
    image: null,
    bio: 'Hraju deskovky.',
    role: 'user',
    createdAt: at,
    ageConfirmedAt: at,
    termsAcceptedAt: at,
    onboardingCompletedAt: null,
    photoVisibility: 'everyone',
    bioVisibility: 'everyone',
    pastEventsVisibility: 'nobody',
    homeLocality: { name: 'Praha 8' },
    interests: [{ activity: { name: 'Deskové hry' } }],
    accounts: [
      { providerId: 'credential', createdAt: at },
      { providerId: 'google', createdAt: at },
    ],
    subscription: null,
  },
  participations: [
    {
      status: 'approved',
      message: 'Beru Carcassonne.',
      approvedAt: at,
      createdAt: at,
      event,
      rating: { stars: 5, comment: 'Super parťák.', createdAt: at },
    },
  ],
  organizedEvents: [],
  groupMemberships: [
    {
      role: 'admin',
      status: 'active',
      message: null,
      createdAt: at,
      group: { id: 'g1', name: 'Běžci' },
    },
  ],
  ratingsGiven: [
    {
      eventStars: 4,
      organizerStars: 5,
      comment: null,
      createdAt: at,
      deletedAt: at,
      event,
    },
  ],
  ratingsReceivedAsOrganizer: [
    {
      eventStars: 5,
      organizerStars: 5,
      comment: 'Díky!',
      createdAt: at,
      event,
      user: { name: 'Petr' },
    },
  ],
  friendships: [
    {
      status: 'accepted',
      createdAt: at,
      acceptedAt: at,
      requesterId: 'me',
      requester: { name: 'Jana Nová' },
      addressee: { name: 'Eva' },
    },
    {
      status: 'pending',
      createdAt: at,
      acceptedAt: null,
      requesterId: 'other',
      requester: { name: 'Karel' },
      addressee: { name: 'Jana Nová' },
    },
  ],
  notifications: [
    {
      type: 'friend_request',
      text: 'Karel ti poslal žádost.',
      createdAt: at,
      readAt: null,
    },
  ],
  eventMessages: [],
  groupAnnouncements: [],
  payments: [],
  reports: [],
});

describe('account export (B-080, GDPR art. 20)', () => {
  it('has every part of the account, with a format and a date', () => {
    const data = toAccountExport('me', rows(), now);
    expect(Object.keys(data).sort()).toEqual([
      'eventMessagesSent',
      'exportedAt',
      'format',
      'friendships',
      'groupAnnouncementsSent',
      'groupMemberships',
      'notifications',
      'organizedEvents',
      'participations',
      'payments',
      'profile',
      'ratingsGiven',
      'ratingsReceivedAsOrganizer',
      'reportsFiled',
      'version',
    ]);
    expect(data.exportedAt).toBe(now);
    expect(data.profile).toMatchObject({
      email: 'jana@example.com',
      homeLocality: 'Praha 8',
      interests: ['Deskové hry'],
      signInMethods: [
        { provider: 'password', since: at },
        { provider: 'google', since: at },
      ],
    });
    expect(data.participations[0].ratingReceived).toMatchObject({ stars: 5 });
    expect(data.ratingsGiven[0]).toMatchObject({ removedByModeration: true });
    expect(data.ratingsReceivedAsOrganizer[0]).toMatchObject({
      author: 'Petr',
    });
  });

  it('names the other person of a friendship and which way it went', () => {
    expect(toAccountExport('me', rows(), now).friendships).toEqual([
      expect.objectContaining({ person: 'Eva', direction: 'sent' }),
      expect.objectContaining({ person: 'Karel', direction: 'received' }),
    ]);
  });

  it("carries no other person's e-mail or id, and no sign-in secret", () => {
    const text = JSON.stringify(toAccountExport('me', rows(), now));
    expect(text).not.toContain('requesterId');
    expect(text).not.toContain('other');
    expect(text.match(/@/g)).toEqual(['@']); // only the person's own address
  });

  it('selects other people by name only and no secrets from the sign-in accounts', () => {
    expect(exportFriendshipSelect.requester).toEqual({
      select: { name: true },
    });
    expect(exportFriendshipSelect.addressee).toEqual({
      select: { name: true },
    });
    expect(exportRatingReceivedSelect.user).toEqual({ select: { name: true } });
    expect(exportProfileSelect.accounts).toEqual({
      select: { providerId: true, createdAt: true },
    });
  });
});
