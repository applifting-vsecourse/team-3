import { computeCapacity } from '@/modules/event/domain/capacity';
import { PublicEvent } from '@/modules/event/domain/event';
import { RecruitingGroup } from '@/modules/group/domain/group';
import { RatingSummary } from '@/modules/rating/domain/rating-summary';
import {
  buildHomeEventSections,
  distanceKm,
  HOME_GROUPS_LIMIT,
  HomeEventsInput,
  isWellRated,
  orderRecruitingGroups,
  ratingKeyOf,
} from './home-sections';

// Wednesday; the weekend is Saturday 7. and Sunday 8. 11.
const now = new Date('2026-11-04T10:00:00.000Z');
const PRAHA_3 = { lat: 50.0833, lng: 14.45 };

type EventSpec = {
  startsAt?: string;
  min?: number;
  max?: number;
  approved?: number;
  activityId?: string;
  organizerId?: string;
  groupId?: string;
  lat?: number;
  lng?: number;
};

const anEvent = (id: string, spec: EventSpec = {}): PublicEvent => {
  const min = spec.min ?? 4;
  const max = spec.max ?? 10;
  return {
    id,
    title: `Akce ${id}`,
    startsAt: new Date(spec.startsAt ?? '2026-11-05T16:00:00.000Z'),
    endsAt: null,
    address: 'Praha',
    lat: spec.lat ?? PRAHA_3.lat,
    lng: spec.lng ?? PRAHA_3.lng,
    activity: {
      id: spec.activityId ?? 'a-volejbal',
      slug: 'volejbal',
      name: 'Volejbal',
      category: { id: 'c-sport', slug: 'sport', name: 'Sport', icon: 'ball' },
    },
    locality: { id: 'l-praha-3', slug: 'praha-3', name: 'Praha 3' },
    organizer: { id: spec.organizerId ?? 'u-org', name: 'Petra' },
    group: spec.groupId ? { id: spec.groupId, name: 'Parta' } : null,
    minParticipants: min,
    maxParticipants: max,
    // at the minimum by default, so it misses nobody
    capacity: computeCapacity(
      { minParticipants: min, maxParticipants: max },
      spec.approved ?? min,
    ),
    isPromoted: false,
  };
};

const input = (overrides: Partial<HomeEventsInput>): HomeEventsInput => ({
  events: [],
  interest: new Map(),
  ratings: new Map(),
  center: null,
  viewer: null,
  now,
  ...overrides,
});

const keysOf = (sections: { key: string }[]): string[] =>
  sections.map((section) => section.key);

const idsIn = (
  sections: { key: string; events: PublicEvent[] }[],
  key: string,
): string[] | undefined =>
  sections
    .find((section) => section.key === key)
    ?.events.map((event) => event.id);

const visitor = null;
const signedIn = (
  overrides: Partial<NonNullable<HomeEventsInput['viewer']>> = {},
): NonNullable<HomeEventsInput['viewer']> => ({
  id: 'u-me',
  interestActivityIds: [],
  joinedEventIds: [],
  ...overrides,
});

describe('buildHomeEventSections', () => {
  it('no events: no sections at all, not empty ones', () => {
    expect(buildHomeEventSections(input({}))).toEqual([]);
    expect(
      buildHomeEventSections(input({ viewer: signedIn(), center: PRAHA_3 })),
    ).toEqual([]);
  });

  describe('highlight and „Tady chybíš“', () => {
    it('the panel gets the event missing the fewest people, the section the next three', () => {
      const events = [
        anEvent('missing-3', { approved: 1 }),
        anEvent('missing-1-later', {
          approved: 3,
          startsAt: '2026-11-06T16:00:00.000Z',
        }),
        anEvent('missing-1', { approved: 3 }),
        anEvent('missing-2', { approved: 2 }),
        anEvent('missing-4', { approved: 0 }),
        anEvent('at-minimum'),
      ];

      const sections = buildHomeEventSections(input({ events }));

      expect(idsIn(sections, 'highlight')).toEqual(['missing-1']);
      expect(idsIn(sections, 'missing')).toEqual([
        'missing-1-later',
        'missing-2',
        'missing-3',
      ]);
    });

    it('signed in, the panel prefers an event from their interests', () => {
      const events = [
        anEvent('missing-1', { approved: 3 }),
        anEvent('mine-missing-2', { approved: 2, activityId: 'a-deskovky' }),
      ];

      const sections = buildHomeEventSections(
        input({
          events,
          viewer: signedIn({ interestActivityIds: ['a-deskovky'] }),
        }),
      );

      expect(idsIn(sections, 'highlight')).toEqual(['mine-missing-2']);
      expect(idsIn(sections, 'missing')).toEqual(['missing-1']);
    });
  });

  it('„Tento víkend“: Saturday and Sunday in Prague time, soonest first', () => {
    const events = [
      // Friday 23:30 in Prague
      anEvent('friday-night', { startsAt: '2026-11-06T22:30:00.000Z' }),
      // Saturday 0:30 in Prague
      anEvent('saturday-early', { startsAt: '2026-11-06T23:30:00.000Z' }),
      anEvent('sunday', { startsAt: '2026-11-08T15:00:00.000Z' }),
      // Monday 0:30 in Prague
      anEvent('monday', { startsAt: '2026-11-08T23:30:00.000Z' }),
    ];

    const sections = buildHomeEventSections(input({ events }));

    expect(idsIn(sections, 'weekend')).toEqual(['saturday-early', 'sunday']);
  });

  it('an event is only in the first section it belongs to', () => {
    // misses people and is on the weekend: panel first, never „Tento víkend“
    const events = [
      anEvent('weekend-missing', {
        approved: 3,
        startsAt: '2026-11-07T10:00:00.000Z',
      }),
      anEvent('weekend', { startsAt: '2026-11-07T12:00:00.000Z' }),
    ];

    const sections = buildHomeEventSections(
      input({ events, center: PRAHA_3, interest: new Map([['weekend', 5]]) }),
    );

    expect(idsIn(sections, 'highlight')).toEqual(['weekend-missing']);
    expect(idsIn(sections, 'weekend')).toEqual(['weekend']);
    const all = sections.flatMap((section) =>
      section.events.map((event) => event.id),
    );
    expect(all).toHaveLength(new Set(all).size);
    // both are used up, so there is no „Kousek od tebe“ nor „O tyhle akce je zájem“
    expect(keysOf(sections)).toEqual(['highlight', 'weekend']);
  });

  it('at most three events in a section', () => {
    const events = Array.from({ length: 6 }, (_, i) =>
      anEvent(`weekend-${i}`, {
        startsAt: `2026-11-07T1${i}:00:00.000Z`,
      }),
    );

    const sections = buildHomeEventSections(input({ events }));

    expect(idsIn(sections, 'weekend')).toEqual([
      'weekend-0',
      'weekend-1',
      'weekend-2',
    ]);
  });

  it('a full event is in no section, not even the popular one', () => {
    const events = [
      anEvent('full', { min: 2, max: 4, approved: 4 }),
      anEvent('full-weekend', {
        min: 2,
        max: 2,
        approved: 2,
        startsAt: '2026-11-07T10:00:00.000Z',
      }),
    ];

    expect(
      buildHomeEventSections(
        input({
          events,
          center: PRAHA_3,
          interest: new Map([
            ['full', 9],
            ['full-weekend', 9],
          ]),
        }),
      ),
    ).toEqual([]);
  });

  it('signed in: no event they organize, joined or asked to join', () => {
    const events = [
      anEvent('mine', { approved: 3, organizerId: 'u-me' }),
      anEvent('joined', { approved: 3 }),
      anEvent('requested', { approved: 2 }),
      anEvent('other', { approved: 1 }),
    ];

    const sections = buildHomeEventSections(
      input({
        events,
        viewer: signedIn({ joinedEventIds: ['joined', 'requested'] }),
      }),
    );

    expect(idsIn(sections, 'highlight')).toEqual(['other']);
    expect(keysOf(sections)).not.toContain('missing');
  });

  describe('„Podle tvých zájmů“', () => {
    it('signed in: events of their activities, soonest first', () => {
      const events = [
        anEvent('deskovky-later', {
          activityId: 'a-deskovky',
          startsAt: '2026-11-12T16:00:00.000Z',
        }),
        anEvent('volejbal'),
        anEvent('deskovky', { activityId: 'a-deskovky' }),
      ];

      const sections = buildHomeEventSections(
        input({
          events,
          viewer: signedIn({ interestActivityIds: ['a-deskovky'] }),
        }),
      );

      expect(idsIn(sections, 'interests')).toEqual([
        'deskovky',
        'deskovky-later',
      ]);
    });

    it('without interests and past events a random pick of what is left', () => {
      const events = ['e1', 'e2', 'e3', 'e4'].map((id) => anEvent(id));
      // Fisher–Yates always swapping with the first: e1 ends up last
      const random = (): number => 0;

      const sections = buildHomeEventSections(
        input({ events, viewer: signedIn(), random }),
      );

      expect(idsIn(sections, 'interests')).toEqual(['e2', 'e3', 'e4']);
    });

    it('a visitor never gets it', () => {
      const sections = buildHomeEventSections(
        input({ events: [anEvent('e1')], viewer: visitor }),
      );

      expect(keysOf(sections)).not.toContain('interests');
    });
  });

  describe('„Kousek od tebe“', () => {
    it('the closest to the center of the locality first', () => {
      const events = [
        anEvent('far', { lat: 50.15, lng: 14.6 }),
        anEvent('close', { lat: 50.084, lng: 14.451 }),
        anEvent('middle', { lat: 50.1, lng: 14.48 }),
      ];

      const sections = buildHomeEventSections(
        input({ events, center: PRAHA_3 }),
      );

      expect(idsIn(sections, 'nearby')).toEqual(['close', 'middle', 'far']);
    });

    it('all of Czechia has no center, so no such section', () => {
      const sections = buildHomeEventSections(
        input({ events: [anEvent('e1')], center: null }),
      );

      expect(keysOf(sections)).not.toContain('nearby');
    });
  });

  describe('„O tyhle akce je zájem“', () => {
    it('a visitor: the most interest first, nobody interested is left out', () => {
      const events = [anEvent('e1'), anEvent('e2'), anEvent('e3')];

      const sections = buildHomeEventSections(
        input({
          events,
          interest: new Map([
            ['e1', 1],
            ['e2', 4],
          ]),
        }),
      );

      expect(idsIn(sections, 'popular')).toEqual(['e2', 'e1']);
    });

    it('a signed-in user does not get it', () => {
      const sections = buildHomeEventSections(
        input({
          events: [anEvent('e1')],
          interest: new Map([['e1', 4]]),
          viewer: signedIn({ interestActivityIds: ['a-other'] }),
        }),
      );

      expect(keysOf(sections)).not.toContain('popular');
    });
  });

  describe('„Od dobře hodnocených organizátorů“', () => {
    const summary = (average: number, count: number): RatingSummary => ({
      average,
      count,
    });

    it('organizers and groups from 4.5 with 3 ratings, the best first', () => {
      const events = [
        anEvent('person-4.6', { organizerId: 'u1' }),
        anEvent('group-4.9', { organizerId: 'u2', groupId: 'g1' }),
        anEvent('person-4.4', { organizerId: 'u3' }),
        anEvent('person-5-two-ratings', { organizerId: 'u4' }),
        // the group's founder is well rated, the group itself is not
        anEvent('group-unrated', { organizerId: 'u1', groupId: 'g2' }),
        anEvent('person-4.5', { organizerId: 'u5' }),
      ];
      const ratings = new Map([
        ['user:u1', summary(4.6, 3)],
        ['group:g1', summary(4.9, 12)],
        ['user:u3', summary(4.4, 30)],
        ['user:u4', summary(5, 2)],
        ['user:u5', summary(4.5, 3)],
      ]);

      const sections = buildHomeEventSections(input({ events, ratings }));

      expect(idsIn(sections, 'wellRated')).toEqual([
        'group-4.9',
        'person-4.6',
        'person-4.5',
      ]);
    });
  });

  it('„Od dobře hodnocených“: one event per organizer or group', () => {
    const events = [
      anEvent('monika-1', { organizerId: 'u-monika' }),
      anEvent('monika-2', { organizerId: 'u-monika' }),
      anEvent('group-1', { organizerId: 'u-x', groupId: 'g1' }),
      anEvent('group-2', { organizerId: 'u-y', groupId: 'g1' }),
      anEvent('radek', { organizerId: 'u-radek' }),
    ];
    const ratings = new Map([
      ['user:u-monika', { average: 5, count: 8 }],
      ['group:g1', { average: 4.9, count: 7 }],
      ['user:u-radek', { average: 4.6, count: 5 }],
    ]);

    const sections = buildHomeEventSections(input({ events, ratings }));

    expect(idsIn(sections, 'wellRated')).toEqual([
      'monika-1',
      'group-1',
      'radek',
    ]);
  });

  it('the visitor order of Figma A-01d', () => {
    const events = [
      anEvent('panel', { approved: 3 }),
      anEvent('missing', { approved: 2 }),
      anEvent('weekend', { startsAt: '2026-11-07T10:00:00.000Z' }),
      anEvent('near'),
      anEvent('popular'),
      anEvent('rated', { organizerId: 'u-rated' }),
    ];

    const sections = buildHomeEventSections(
      input({
        events,
        center: PRAHA_3,
        interest: new Map([['popular', 3]]),
        ratings: new Map([['user:u-rated', { average: 5, count: 3 }]]),
      }),
    );

    // „Kousek od tebe“ takes the three left, all in the same spot
    expect(keysOf(sections)).toEqual([
      'highlight',
      'missing',
      'weekend',
      'nearby',
    ]);
    // without a center the rest gets its turn
    expect(
      keysOf(
        buildHomeEventSections(
          input({
            events,
            interest: new Map([['popular', 3]]),
            ratings: new Map([['user:u-rated', { average: 5, count: 3 }]]),
          }),
        ),
      ),
    ).toEqual(['highlight', 'missing', 'weekend', 'popular', 'wellRated']);
  });
});

describe('isWellRated', () => {
  it.each<[RatingSummary | undefined, boolean]>([
    [{ average: 4.5, count: 3 }, true],
    [{ average: 4.4, count: 100 }, false],
    [{ average: 5, count: 2 }, false],
    [{ average: null, count: 0 }, false],
    [undefined, false],
  ])('%j → %s', (summary, expected) => {
    expect(isWellRated(summary)).toBe(expected);
  });
});

describe('ratingKeyOf', () => {
  it("a group's event carries the group's rating, any other the organizer's", () => {
    expect(ratingKeyOf(anEvent('e', { organizerId: 'u1' }))).toBe('user:u1');
    expect(
      ratingKeyOf(anEvent('e', { organizerId: 'u1', groupId: 'g1' })),
    ).toBe('group:g1');
  });
});

describe('distanceKm', () => {
  it('Praha – Brno is about 185 km', () => {
    const km = distanceKm(
      { lat: 50.0755, lng: 14.4378 },
      { lat: 49.1951, lng: 16.6068 },
    );
    expect(km).toBeGreaterThan(180);
    expect(km).toBeLessThan(190);
  });
});

describe('orderRecruitingGroups', () => {
  const aGroup = (id: string, name: string, next: string): RecruitingGroup => ({
    id,
    name,
    type: 'closed',
    activity: {
      id: 'a1',
      slug: 'volejbal',
      name: 'Volejbal',
      category: { id: 'c1', slug: 'sport', name: 'Sport', icon: 'ball' },
    },
    locality: { id: 'l1', slug: 'praha-3', name: 'Praha 3' },
    memberCount: 5,
    nextEventAt: new Date(next),
  });

  it('the soonest next event first, then by name; at most three', () => {
    const groups = [
      aGroup('g-later', 'Áčko', '2026-11-10T10:00:00.000Z'),
      aGroup('g-soon-b', 'Běžci', '2026-11-05T10:00:00.000Z'),
      aGroup('g-soon-a', 'Atleti', '2026-11-05T10:00:00.000Z'),
      aGroup('g-last', 'Zumba', '2026-11-20T10:00:00.000Z'),
    ];

    const ordered = orderRecruitingGroups(groups);

    expect(ordered.map((group) => group.id)).toEqual([
      'g-soon-a',
      'g-soon-b',
      'g-later',
    ]);
    expect(ordered).toHaveLength(HOME_GROUPS_LIMIT);
  });

  it('the time of the next event does not go out (it may be members-only)', () => {
    const [group] = orderRecruitingGroups([
      aGroup('g1', 'Parta', '2026-11-05T10:00:00.000Z'),
    ]);

    expect(group).not.toHaveProperty('nextEventAt');
  });
});
