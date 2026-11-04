import {
  communityEvents,
  communityGroups,
} from '@/scripts/seed/data/community-data';
import { czechTowns } from '@/scripts/seed/data/czech-towns';
import {
  demoActivities,
  demoEvents,
  demoGroups,
  demoLocalities,
} from '@/scripts/seed/data/demo-data';
import { groupEvents } from '@/scripts/seed/data/group-events-data';
import { generatedPastEvents } from '@/scripts/seed/data/past-data';
import { pastEvents } from '@/scripts/seed/data/rating-data';
import {
  buildContentRows,
  ContentRows,
  legacySeedContentWhere,
  seedAccounts,
} from './content-rows';

// Odkazy z dat na id: neznámý klíč nebo slug spadne tady, ne při seedu na stagingu.
const resolver =
  (keys: string[], prefix: string) =>
  (key: string): string => {
    if (!keys.includes(key)) throw new Error(`Unknown ${prefix} ${key}`);
    return `${prefix}-${key}`;
  };

const now = new Date('2026-11-02T12:00:00+01:00');

const build = (): ContentRows => {
  let next = 0;
  return buildContentRows({
    now,
    userId: resolver(
      seedAccounts.map((a) => a.key),
      'u',
    ),
    activityId: resolver(
      demoActivities.map((a) => a.slug),
      'a',
    ),
    localityId: resolver(
      [...demoLocalities, ...czechTowns].map((l) => l.slug),
      'l',
    ),
    newId: () => `id-${next++}`,
  });
};

describe('buildContentRows', () => {
  it('turns all of the test data into rows, every reference resolved', () => {
    const rows = build();

    expect(rows.groups).toHaveLength(
      demoGroups.length + communityGroups.length,
    );
    expect(rows.events).toHaveLength(
      demoEvents.length +
        communityEvents.length +
        groupEvents.length +
        pastEvents.length +
        generatedPastEvents.length,
    );
    const ids = [...rows.groups, ...rows.events].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('links members and participations to rows of the same build', () => {
    const rows = build();
    const groupIds = new Set(rows.groups.map((g) => g.id));
    const eventIds = new Set(rows.events.map((e) => e.id));

    // akce skupin (#181) míří na skupinu ze stejného sestavení
    const groupEventRows = rows.events.filter((e) => e.groupId);
    expect(groupEventRows.length).toBeGreaterThan(0);
    groupEventRows.forEach((e) => expect(groupIds.has(e.groupId!)).toBe(true));
    rows.groupMembers.forEach((m) =>
      expect(groupIds.has(m.groupId)).toBe(true),
    );
    for (const item of [
      ...rows.participations,
      ...rows.ratings,
      ...rows.participantRatings,
    ]) {
      expect(eventIds.has(item.eventId)).toBe(true);
    }
  });

  // the database checks the same with a composite foreign key (#180)
  it('rates only participants approved on that event', () => {
    const rows = build();
    const approved = new Set(
      rows.participations
        .filter((p) => p.status === 'approved')
        .map((p) => `${p.eventId} ${p.userId}`),
    );

    for (const rating of rows.participantRatings) {
      expect(approved.has(`${rating.eventId} ${rating.participantId}`)).toBe(
        true,
      );
    }
    for (const rating of rows.ratings) {
      expect(approved.has(`${rating.eventId} ${rating.userId}`)).toBe(true);
    }
  });

  it('stamps the ratings deleted by the superadmin with the seed time', () => {
    const rows = build();
    const deleted = [...pastEvents, ...generatedPastEvents].flatMap((e) => [
      ...e.ratings.filter((r) => r.deleted),
      ...e.participantRatings.filter((r) => r.deleted),
    ]);

    expect(
      [...rows.ratings, ...rows.participantRatings].filter(
        (r) => r.deletedAt === now,
      ),
    ).toHaveLength(deleted.length);
  });

  it("keeps the organizer's comments on participants (PO 4. 11.)", () => {
    const rows = build();
    const comments = [...pastEvents, ...generatedPastEvents].flatMap((e) =>
      e.participantRatings.flatMap((r) => (r.comment ? [r.comment] : [])),
    );

    expect(comments.length).toBeGreaterThan(0);
    expect(
      rows.participantRatings.flatMap((r) => (r.comment ? [r.comment] : [])),
    ).toEqual(comments);
  });
});

describe('legacySeedContentWhere', () => {
  const where = legacySeedContentWhere(
    {
      userId: (key) => `u-${key}`,
      localityId: (slug) => `l-${slug}`,
    },
    ['u-a'],
  );

  it('matches every event of the data by its organizer and title', () => {
    const events = where.events.OR as {
      organizerUserId: string;
      title: string;
    }[];

    expect(events).toHaveLength(
      demoEvents.length + communityEvents.length + pastEvents.length,
    );
    expect(events).toContainEqual({
      organizerUserId: `u-${demoEvents[0].organizerKey}`,
      title: demoEvents[0].title,
    });
    // a tester's event under a demo account has a title of its own
    expect(events.some((e) => e.title.startsWith('TEST'))).toBe(false);
  });

  it('matches the groups by their name before #181, administered by a seed account', () => {
    const groups = where.groups.OR as { name: string; localityId: string }[];

    expect(groups).toHaveLength(demoGroups.length + communityGroups.length);
    // the community group renamed in #181 still had the duplicate name
    expect(
      groups.filter(
        (g) => g.name === 'Běžci ze Stromovky' && g.localityId === 'l-praha-7',
      ),
    ).toHaveLength(2);
    expect(where.groups.members).toEqual({
      some: { userId: { in: ['u-a'] }, role: 'admin' },
    });
  });
});
