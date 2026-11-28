import {
  decodePartnerCursor,
  distanceBand,
  encodePartnerCursor,
  partnerCandidatesWhere,
  partnerPage,
  rankPartners,
  skipsSince,
  withMutualFriends,
  type PartnerCandidateRecord,
  type PartnerViewer,
} from './partner-suggestions';

// Praha (Staré Město) and places at known distances from it
const PRAHA = { lat: 50.0875, lng: 14.4214 };
const KARLIN = { lat: 50.0922, lng: 14.4508 }; // ~2.2 km
const ROZTOKY = { lat: 50.1584, lng: 14.3976 }; // ~8 km
const BENESOV = { lat: 49.7817, lng: 14.6869 }; // ~39 km
const BRNO = { lat: 49.1951, lng: 16.6068 }; // ~185 km

const VOLLEYBALL = { id: 'a-volejbal', name: 'Volejbal', slug: 'volejbal' };
const CHESS = { id: 'a-sachy', name: 'Šachy', slug: 'sachy' };
const BOARD_GAMES = {
  id: 'a-deskovky',
  name: 'Deskové hry',
  slug: 'deskove-hry',
};
const RUNNING = { id: 'a-beh', name: 'Běh', slug: 'beh' };

const viewer: PartnerViewer = {
  home: PRAHA,
  interestIds: [VOLLEYBALL.id, CHESS.id, BOARD_GAMES.id],
};

const person = (
  id: string,
  overrides: Partial<PartnerCandidateRecord> = {},
): PartnerCandidateRecord => ({
  id,
  name: `Člověk ${id}`,
  homeLocality: PRAHA,
  interests: [{ activity: VOLLEYBALL }],
  sentFriendRequests: [],
  ...overrides,
});

const now = new Date('2026-11-23T10:00:00.000Z');

describe('partnerCandidatesWhere (#84)', () => {
  const where = partnerCandidatesWhere('me', viewer, 25, now);

  it('lets through only people who can be met and want to be found', () => {
    expect(where).toMatchObject({
      id: { not: 'me' },
      emailVerified: true,
      blockedAt: null,
      deletedAt: null,
      onboardingCompletedAt: { not: null },
      partnerDiscoverable: true,
    });
  });

  it('needs an activity the viewer likes too', () => {
    expect(where.interests).toEqual({
      some: { activityId: { in: viewer.interestIds } },
    });
  });

  it('keeps the home locality in the radius’s rectangle, never smaller than the circle', () => {
    const { lat, lng } = where.homeLocality as {
      lat: { gte: number; lte: number };
      lng: { gte: number; lte: number };
    };
    // 25 km is ~0.225° of latitude and ~0.35° of longitude at Prague
    expect(PRAHA.lat - lat.gte).toBeGreaterThan(0.224);
    expect(lat.lte - PRAHA.lat).toBeGreaterThan(0.224);
    expect(PRAHA.lng - lng.gte).toBeGreaterThan(0.34);
    expect(lng.lte - PRAHA.lng).toBeGreaterThan(0.34);
  });

  it('leaves out friends and every request either way, but keeps theirs still waiting for me (the match)', () => {
    expect(where.sentFriendRequests).toEqual({
      none: { addresseeId: 'me', status: { not: 'pending' } },
    });
    expect(where.receivedFriendRequests).toEqual({
      none: { requesterId: 'me' },
    });
  });

  it('leaves out whom I skipped in the last 90 days', () => {
    expect(where.partnerSkipsReceived).toEqual({
      none: {
        skipperId: 'me',
        createdAt: { gt: new Date('2026-08-25T10:00:00.000Z') },
      },
    });
    expect(skipsSince(now)).toEqual(new Date('2026-08-25T10:00:00.000Z'));
  });
});

describe('distanceBand (#84)', () => {
  it.each([
    [0, 2],
    [2, 2],
    [2.01, 5],
    [5, 5],
    [7.4, 10],
    [10, 10],
    [24.9, 25],
    [26, 50],
    [50, 50],
  ])('%s km is shown in the %s km band', (km, band) => {
    expect(distanceBand(km)).toBe(band);
  });

  it('beyond 50 km there is no band: nobody is shown that far', () => {
    expect(distanceBand(50.1)).toBeUndefined();
  });
});

describe('rankPartners (#84)', () => {
  it('leaves out people beyond the radius, also inside its rectangle', () => {
    const ranked = rankPartners(
      viewer,
      [
        person('near', { homeLocality: ROZTOKY }),
        person('far', { homeLocality: BENESOV }),
        person('brno', { homeLocality: BRNO }),
      ],
      25,
    );
    expect(ranked.map(({ id }) => id)).toEqual(['near']);
  });

  it('leaves out people without a home locality or without an activity in common', () => {
    const ranked = rankPartners(
      viewer,
      [
        person('nowhere', { homeLocality: null }),
        person('runner', { interests: [{ activity: RUNNING }] }),
      ],
      25,
    );
    expect(ranked).toEqual([]);
  });

  it('shows only public data: the name, the distance band and the interests split into shared and other', () => {
    const [card] = rankPartners(
      viewer,
      [
        person('p1', {
          homeLocality: KARLIN,
          interests: [
            { activity: RUNNING },
            { activity: VOLLEYBALL },
            { activity: CHESS },
          ],
        }),
      ],
      25,
    );
    expect(card).toEqual({
      id: 'p1',
      name: 'Člověk p1',
      distanceBandKm: 5,
      // Czech order: Š between S and T, so before V
      sharedInterests: [CHESS, VOLLEYBALL],
      otherInterests: [RUNNING],
      hasRequestedMe: false,
    });
    expect(JSON.stringify(card)).not.toMatch(/lat|lng|email|locality/i);
  });

  it('puts who already asks me first, then more activities in common, then the nearer band, then the id', () => {
    const ranked = rankPartners(
      viewer,
      [
        person('d-near-one', { homeLocality: PRAHA }),
        person('c-far-two', {
          homeLocality: ROZTOKY,
          interests: [{ activity: VOLLEYBALL }, { activity: CHESS }],
        }),
        person('a-asks-me', {
          homeLocality: BENESOV,
          sentFriendRequests: [{ id: 'f1' }],
        }),
        person('b-near-one', { homeLocality: PRAHA }),
        person('e-mid-one', { homeLocality: ROZTOKY }),
      ],
      50,
    );
    expect(ranked.map(({ id }) => id)).toEqual([
      'a-asks-me',
      'c-far-two',
      'b-near-one',
      'd-near-one',
      'e-mid-one',
    ]);
    expect(ranked[0].hasRequestedMe).toBe(true);
  });
});

describe('partnerPage (#84)', () => {
  const ranked = rankPartners(
    viewer,
    Array.from({ length: 5 }, (_, index) => person(`p${index}`)),
    25,
  );

  it('gives the first page and a cursor while more people are left', () => {
    const page = partnerPage(ranked, undefined, 2);
    expect(page.items.map(({ id }) => id)).toEqual(['p0', 'p1']);
    expect(page.nextCursor).toEqual(expect.any(String));
  });

  it('goes on after the cursor and ends with null', () => {
    const first = partnerPage(ranked, undefined, 3);
    const second = partnerPage(
      ranked,
      decodePartnerCursor(first.nextCursor ?? ''),
      3,
    );
    expect(second.items.map(({ id }) => id)).toEqual(['p3', 'p4']);
    expect(second.nextCursor).toBeNull();
  });

  it('nobody is skipped over when people from the earlier page drop out meanwhile', () => {
    const first = partnerPage(ranked, undefined, 2);
    // p0 and p1 were skipped or liked: they are no longer candidates
    const later = ranked.filter(({ id }) => id !== 'p0' && id !== 'p1');
    const second = partnerPage(
      later,
      decodePartnerCursor(first.nextCursor ?? ''),
      2,
    );
    expect(second.items.map(({ id }) => id)).toEqual(['p2', 'p3']);
  });

  it('an exactly full last page has no next cursor', () => {
    expect(partnerPage(ranked, undefined, 5).nextCursor).toBeNull();
  });
});

describe('partner cursor (#84)', () => {
  it('holds only what the card shows and reads back', () => {
    const [card] = rankPartners(viewer, [person('p1')], 25);
    const cursor = encodePartnerCursor(card);
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodePartnerCursor(cursor)).toEqual({
      hasRequestedMe: false,
      sharedCount: 1,
      distanceBandKm: 2,
      id: 'p1',
    });
  });

  it.each([
    'not-a-cursor',
    Buffer.from('{"a":1}').toString('base64url'),
    Buffer.from('[2,1,2,"x"]').toString('base64url'),
    Buffer.from('[1,1.5,2,"x"]').toString('base64url'),
    Buffer.from('[1,1,2,""]').toString('base64url'),
  ])('refuses anything it did not give out (%s)', (value) => {
    expect(decodePartnerCursor(value)).toBeUndefined();
  });
});

describe('withMutualFriends (#473)', () => {
  it('adds only the count to the card, never who', () => {
    const [card] = rankPartners(viewer, [person('p1')], 25);
    const withCount = withMutualFriends(card, 3);
    expect(withCount).toEqual({ ...card, mutualFriendsCount: 3 });
    expect(withMutualFriends(card, null).mutualFriendsCount).toBeNull();
    // the count isn't a sort key: the cursor stays the same
    expect(encodePartnerCursor(withCount)).toBe(encodePartnerCursor(card));
  });
});
