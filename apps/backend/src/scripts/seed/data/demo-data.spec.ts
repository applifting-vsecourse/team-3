import { toSlug } from '@/modules/catalog/services/catalog.service';
import { nameProblem } from '@/shared/auth/domain/name-policy';
import {
  demoActivities,
  demoActivityCategories,
  demoEvents,
  demoGroups,
  demoLocalities,
  demoUsers,
} from './demo-data';
import { toEventRow, toGroupRow } from './demo-rows';

// Kontroly testovacích dat #47. Hlídají akceptační kritéria (termíny v budoucnosti,
// obsazenost odpovídá scénáři) i to, že data jdou vložit do databáze (odkazy,
// unikátnost), aby chyba v datech nevyšla najevo až při seedu na stagingu.

const userKeys = new Set(demoUsers.map((user) => user.key));
const activitySlugs = new Set<string>(demoActivities.map((a) => a.slug));
const localitySlugs = new Set<string>(demoLocalities.map((l) => l.slug));
const approvedCount = (event: (typeof demoEvents)[number]): number =>
  event.participations.filter((p) => p.status === 'approved').length;

describe('demo data', () => {
  it('has unique keys, e-mails, usernames and slugs', () => {
    const unique = (values: string[]): boolean =>
      new Set(values).size === values.length;
    expect(unique(demoUsers.map((u) => u.key))).toBe(true);
    expect(unique(demoUsers.map((u) => u.email))).toBe(true);
    expect(unique(demoUsers.map((u) => u.username))).toBe(true);
    expect(unique(demoEvents.map((e) => e.key))).toBe(true);
    expect(unique(demoGroups.map((g) => g.key))).toBe(true);
    expect(unique(demoActivities.map((a) => a.slug))).toBe(true);
    expect(unique(demoActivityCategories.map((c) => c.slug))).toBe(true);
    expect(unique(demoLocalities.map((l) => l.slug))).toBe(true);
  });

  // the seed signs the users up through BetterAuth, which checks the name (#153)
  it("gives every user a name the sign-up's name rule lets through", () => {
    for (const user of demoUsers) expect(nameProblem(user.name)).toBeNull();
  });

  it('ends every category with an "other" activity (B-002)', () => {
    for (const category of demoActivityCategories) {
      const activities = demoActivities
        .filter((a) => a.categorySlug === category.slug)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      expect(activities.length).toBeGreaterThanOrEqual(5);
      expect(activities[activities.length - 1].name).toMatch(/^Jin/);
    }
  });

  it('builds locality slugs from names unless a duplicate name needs a suffix', () => {
    // The slug migration backfills existing rows with the same rule, so a
    // hand-written slug that drifts from it would make the seed duplicate a row.
    const nameCounts = new Map<string, number>();
    demoLocalities.forEach((l) =>
      nameCounts.set(l.name, (nameCounts.get(l.name) ?? 0) + 1),
    );
    for (const locality of demoLocalities) {
      if (nameCounts.get(locality.name) === 1) {
        expect(locality.slug).toBe(toSlug(locality.name));
      }
    }
  });

  it('lists parent localities before their parts', () => {
    demoLocalities.forEach((locality, index) => {
      if (!locality.parentSlug) return;
      const parentIndex = demoLocalities.findIndex(
        (l) => l.slug === locality.parentSlug,
      );
      expect(parentIndex).toBeGreaterThanOrEqual(0);
      expect(parentIndex).toBeLessThan(index);
    });
  });

  it('references only existing users, activities and localities', () => {
    for (const user of demoUsers) {
      expect(localitySlugs.has(user.homeLocalitySlug)).toBe(true);
      user.interestSlugs.forEach((slug) =>
        expect(activitySlugs.has(slug)).toBe(true),
      );
    }
    for (const group of demoGroups) {
      expect(activitySlugs.has(group.activitySlug)).toBe(true);
      expect(localitySlugs.has(group.localitySlug)).toBe(true);
      group.members.forEach((m) => expect(userKeys.has(m.userKey)).toBe(true));
    }
    for (const event of demoEvents) {
      expect(activitySlugs.has(event.activitySlug)).toBe(true);
      expect(localitySlugs.has(event.localitySlug)).toBe(true);
      expect(userKeys.has(event.organizerKey)).toBe(true);
      event.participations.forEach((p) =>
        expect(userKeys.has(p.userKey)).toBe(true),
      );
    }
  });

  it('has at most one membership and one participation per user', () => {
    for (const group of demoGroups) {
      const keys = group.members.map((m) => m.userKey);
      expect(new Set(keys).size).toBe(keys.length);
    }
    for (const event of demoEvents) {
      const keys = event.participations.map((p) => p.userKey);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('gives every group an active admin', () => {
    for (const group of demoGroups) {
      expect(
        group.members.some((m) => m.role === 'admin' && m.status === 'active'),
      ).toBe(true);
    }
  });

  it('matches each event scenario with its approved participations', () => {
    for (const event of demoEvents) {
      const approved = approvedCount(event);
      expect(event.maxParticipants).toBeGreaterThanOrEqual(
        event.minParticipants,
      );
      expect(approved).toBeLessThanOrEqual(event.maxParticipants);
      if (event.status === 'cancelled') {
        expect(event.cancelReason).toBeTruthy();
        continue;
      }
      const scenario =
        approved < event.minParticipants
          ? 'chybi'
          : approved >= event.maxParticipants
            ? 'plno'
            : 'volno';
      expect(`${event.key}: ${scenario}`).toBe(
        `${event.key}: ${event.scenario}`,
      );
    }
  });

  it('covers all occupancy states and both approval modes (#47)', () => {
    const scenarios = new Set(demoEvents.map((e) => e.scenario));
    expect(scenarios).toEqual(new Set(['chybi', 'volno', 'plno', 'zrusena']));
    const modes = new Set(demoEvents.map((e) => e.approvalMode));
    expect(modes).toEqual(new Set(['open', 'approval']));
  });

  it('lets only verified users organize, join events and groups', () => {
    const unverified = new Set(
      demoUsers.filter((u) => !u.emailVerified).map((u) => u.key),
    );
    for (const event of demoEvents) {
      expect(unverified.has(event.organizerKey)).toBe(false);
      event.participations.forEach((p) =>
        expect(unverified.has(p.userKey)).toBe(false),
      );
    }
    for (const group of demoGroups) {
      group.members.forEach((m) =>
        expect(unverified.has(m.userKey)).toBe(false),
      );
    }
  });
});

describe('demo rows', () => {
  // Pondělí až neděle v 0:30, 12:00 a 23:30 pražského času.
  const seedMoments = [19, 20, 21, 22, 23, 24, 25].flatMap((day) =>
    ['00:30', '12:00', '23:30'].map(
      (time) => new Date(`2026-10-${day}T${time}:00+02:00`),
    ),
  );

  it.each(seedMoments)(
    'puts every event at least an hour after a seed at %s (#47)',
    (now) => {
      for (const event of demoEvents) {
        const row = toEventRow(event, now);
        expect(row.startsAt.getTime()).toBeGreaterThanOrEqual(
          now.getTime() + 60 * 60 * 1000,
        );
        expect(row.endsAt.getTime()).toBeGreaterThan(row.startsAt.getTime());
      }
    },
  );

  it('stamps cancellation, approval and deactivation times', () => {
    const now = new Date('2026-10-22T20:00:00+02:00');
    for (const event of demoEvents) {
      const row = toEventRow(event, now);
      expect(row.cancelledAt !== null).toBe(event.status === 'cancelled');
      for (const p of row.participations) {
        expect(p.approvedAt !== null).toBe(p.status === 'approved');
        if (p.approvedAt) {
          expect(p.approvedAt.getTime()).toBeLessThan(now.getTime());
        }
      }
    }
    for (const group of demoGroups) {
      const row = toGroupRow(group, now);
      expect(row.deactivatedAt !== null).toBe(group.status === 'inactive');
    }
  });
});
