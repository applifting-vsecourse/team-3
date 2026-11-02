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
import { pastEvents } from '@/scripts/seed/data/rating-data';
import { buildContentRows, ContentRows, seedAccounts } from './content-rows';

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
      demoEvents.length + communityEvents.length + pastEvents.length,
    );
    const ids = [...rows.groups, ...rows.events].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('links members and participations to rows of the same build', () => {
    const rows = build();
    const groupIds = new Set(rows.groups.map((g) => g.id));
    const eventIds = new Set(rows.events.map((e) => e.id));

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
    const deleted = pastEvents.flatMap((e) => [
      ...e.ratings.filter((r) => r.deleted),
      ...e.participantRatings.filter((r) => r.deleted),
    ]);

    expect(
      [...rows.ratings, ...rows.participantRatings].filter(
        (r) => r.deletedAt === now,
      ),
    ).toHaveLength(deleted.length);
  });
});
