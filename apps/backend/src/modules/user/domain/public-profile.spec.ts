import {
  publicProfile,
  type PersonalRatingRecord,
  type PublicEventRecord,
  type PublicUserRecord,
  type ReceivedRatingRecord,
} from './public-profile';

const now = new Date('2026-11-06T12:00:00Z');
const user: PublicUserRecord = {
  id: 'user',
  name: 'Jana Nová',
  interests: [{ activity: { id: 'run', name: 'Běh' } }],
};
const event = (
  changes: Partial<PublicEventRecord> = {},
): PublicEventRecord => ({
  id: 'public-event',
  title: 'Volejbal',
  status: 'published',
  visibility: 'public',
  groupId: null,
  organizerUserId: 'user',
  startsAt: new Date('2026-11-01T10:00:00Z'),
  endsAt: null,
  address: 'Hala Strahov, Vaníčkova 2, Praha 6',
  minParticipants: 1,
  locality: { id: 'p6', slug: 'praha-6', name: 'Praha' },
  activity: {
    id: 'volejbal',
    slug: 'volejbal',
    name: 'Volejbal',
    category: { id: 'sport', slug: 'sport', name: 'Sport', icon: 'ball' },
  },
  _count: { participations: 3 },
  ...changes,
});
const received = (
  changes: Partial<ReceivedRatingRecord> = {},
): ReceivedRatingRecord => ({
  id: 'received',
  stars: 5,
  comment: 'Díky za hru.',
  createdAt: now,
  deletedAt: null,
  event: {
    ...event(),
    organizer: { id: 'host', name: 'Petr', deletedAt: null, blockedAt: null },
  },
  ...changes,
});
const personal = (
  changes: Partial<PersonalRatingRecord> = {},
): PersonalRatingRecord => ({
  organizerStars: 4,
  eventStars: 5,
  deletedAt: null,
  event: event(),
  ...changes,
});

describe('public profile privacy (#179)', () => {
  it('does not expose account/contact fields, home locality, attendance or groups from a broader adapter record', () => {
    const row = {
      ...user,
      email: 'private@example.com',
      homeLocality: { name: 'private-home' },
      accounts: [{ password: 'test-private-hash' }],
      participations: ['private-attendance'],
      groupMemberships: ['private-group'],
    };
    const result = publicProfile(row, [], [], [], now);
    expect(Object.keys(result).sort()).toEqual(
      [
        'id',
        'name',
        'interests',
        'participantSummary',
        'organizerSummary',
        'eventSummary',
        'participantRatings',
        'organizedEvents',
      ].sort(),
    );
    expect(JSON.stringify(result)).not.toMatch(
      /private@example|private-home|test-private-hash|private-attendance|private-group/,
    );
    expect(result.participantSummary).toEqual({ average: null, count: 0 });
  });
  it('lists only ratings from public events; the others count in the average alone', () => {
    const privateRating = received({ id: 'private-rating', stars: 4 });
    privateRating.event = {
      ...privateRating.event,
      id: 'private-event-id',
      title: 'private-event-title',
      visibility: 'private',
    };
    const membersRating = received({ id: 'members-rating', stars: 3 });
    membersRating.event = {
      ...membersRating.event,
      id: 'members-event-id',
      title: 'members-event-title',
      visibility: 'members',
    };
    const result = publicProfile(
      user,
      [received(), privateRating, membersRating],
      [],
      [],
      now,
    );
    expect(result.participantRatings.map((row) => row.event)).toEqual([
      { id: 'public-event', title: 'Volejbal' },
    ]);
    expect(result.participantSummary).toEqual({ average: 4, count: 3 });
    expect(JSON.stringify(result)).not.toMatch(/private-event-|members-event-/);
  });
  it('omits deleted ratings and ratings of hidden, cancelled or unfinished events', () => {
    const rows = [received(), received({ id: 'removed', deletedAt: now })];
    for (const status of ['hidden', 'deleted', 'cancelled'])
      rows.push(received({ event: { ...received().event, status } }));
    rows.push(
      received({
        event: {
          ...received().event,
          endsAt: new Date('2026-11-07T12:00:00Z'),
        },
      }),
    );
    const result = publicProfile(user, rows, [], [], now);
    expect(result.participantRatings).toHaveLength(1);
    expect(result.participantSummary).toEqual({ average: 5, count: 1 });
  });
  it('does not identify a deleted or blocked author', () => {
    const row = received();
    row.event.organizer = {
      id: 'private-author-id',
      name: 'private-author-name',
      deletedAt: now,
      blockedAt: null,
    };
    const result = publicProfile(user, [row], [], [], now);
    expect(result.participantRatings[0].author).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/private-author/);
  });
  it.each([0, 3])(
    'exposes the approved total %s without participation records',
    (count) => {
      const row = {
        ...event({ _count: { participations: count } }),
        participations: [
          { userId: 'private-participant', user: { name: 'private-name' } },
        ],
      };
      const result = publicProfile(user, [], [], [row], now);
      expect(result.organizedEvents[0].approvedCount).toBe(count);
      expect(JSON.stringify(result.organizedEvents)).not.toMatch(
        /private-participant|private-name|participations|_count/,
      );
    },
  );
  it('says how many were missing to the minimum, so the card can say „Nekonalo se“ (review #323)', () => {
    const below = event({
      minParticipants: 4,
      _count: { participations: 1 },
    });
    const held = event({ id: 'held', _count: { participations: 5 } });
    const result = publicProfile(user, [], [], [below, held], now);
    expect(result.organizedEvents.map((e) => [e.id, e.missingToMin])).toEqual([
      ['public-event', 3],
      ['held', 0],
    ]);
  });
  it('lists only finished public personal events and their own nondeleted rating averages', () => {
    const privateEvent = event({ id: 'private-event', visibility: 'private' });
    const personalRows = [
      personal(),
      personal({ eventStars: 3, organizerStars: 2, event: privateEvent }),
      personal({ deletedAt: now }),
      personal({ event: event({ groupId: 'group' }) }),
    ];
    const events = [
      event(),
      privateEvent,
      event({ visibility: 'members' }),
      event({ groupId: 'group' }),
      event({ status: 'cancelled' }),
      event({ status: 'hidden' }),
      event({ organizerUserId: 'somebody-else' }),
      event({ endsAt: new Date('2026-11-07T12:00:00Z') }),
    ];
    const result = publicProfile(user, [], personalRows, events, now);
    expect(result.organizedEvents).toHaveLength(1);
    expect(result.organizedEvents[0].rating).toEqual({ average: 5, count: 1 });
    expect(result.organizerSummary).toEqual({ average: 3, count: 2 });
    expect(result.eventSummary).toEqual({ average: 4, count: 2 });
  });
  it('gives an organised event what the past event card shows (#179)', () => {
    const result = publicProfile(user, [], [], [event()], now);
    expect(result.organizedEvents[0]).toMatchObject({
      address: 'Hala Strahov, Vaníčkova 2, Praha 6',
      locality: { id: 'p6', slug: 'praha-6', name: 'Praha' },
      activity: { slug: 'volejbal', category: { icon: 'ball' } },
      localityName: 'Praha',
      activityName: 'Volejbal',
    });
  });
});
