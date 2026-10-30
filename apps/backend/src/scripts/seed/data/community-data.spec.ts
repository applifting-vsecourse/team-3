import { nameProblem } from '@/shared/auth/domain/name-policy';
import {
  communityEventPlans,
  communityEvents,
  communityGroupPlans,
  communityGroups,
  communityUsers,
  isPrague,
} from './community-data';
import { czechTowns } from './czech-towns';
import {
  demoActivities,
  demoEvents,
  demoGroups,
  demoLocalities,
  demoUsers,
} from './demo-data';
import { toEventRow, toGroupRow } from './demo-rows';

// Kontroly komunitních dat: že jdou vložit do databáze (odkazy, unikátnost) a že
// nerozbijí živé demo #47 (nikdo z komunity v demo akcích, pražské akce v prvních
// 8 dnech nechybí lidi). Chyba v datech má spadnout tady, ne při seedu na stagingu.

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const userKeys = new Set(communityUsers.map((u) => u.key));
const verified = new Set(
  communityUsers.filter((u) => u.emailVerified).map((u) => u.key),
);
const activitySlugs = new Set<string>(demoActivities.map((a) => a.slug));
const localitySlugs = new Set<string>([
  ...demoLocalities.map((l) => l.slug),
  ...czechTowns.map((t) => t.slug),
]);
const coordinates = new Map<string, { lat: number; lng: number }>(
  [...demoLocalities, ...czechTowns].map((l) => [l.slug, l]),
);
const approvedCount = (event: (typeof communityEvents)[number]): number =>
  event.participations.filter((p) => p.status === 'approved').length;
const unique = (values: string[]): boolean =>
  new Set(values).size === values.length;

// Pondělí až neděle v 0:30, 12:00 a 23:30 pražského času (zimní čas, +01:00).
const seedMoments = [
  '10-26',
  '10-27',
  '10-28',
  '10-29',
  '10-30',
  '10-31',
  '11-01',
].flatMap((day) =>
  ['00:30', '12:00', '23:30'].map(
    (time) => new Date(`2026-${day}T${time}:00+01:00`),
  ),
);

describe('community data', () => {
  it('is big enough to look like a living product', () => {
    expect(communityUsers.length).toBeGreaterThanOrEqual(100);
    expect(communityEvents.length).toBeGreaterThanOrEqual(60);
    expect(communityGroups.length).toBeGreaterThanOrEqual(12);
    const towns = new Set(
      communityEvents.map((e) =>
        isPrague(e.localitySlug) ? 'praha' : e.localitySlug,
      ),
    );
    expect(towns.size).toBeGreaterThanOrEqual(25);
  });

  it('has unique keys, e-mails and usernames, none of them a demo account', () => {
    const emails = [...communityUsers, ...demoUsers].map((u) =>
      u.email.toLowerCase(),
    );
    const usernames = [...communityUsers, ...demoUsers].map((u) =>
      u.username.toLowerCase(),
    );
    expect(unique(emails)).toBe(true);
    expect(unique(usernames)).toBe(true);
    expect(unique([...communityUsers, ...demoUsers].map((u) => u.key))).toBe(
      true,
    );
    expect(unique(communityEvents.map((e) => e.key))).toBe(true);
    expect(unique(communityGroups.map((g) => g.key))).toBe(true);
    for (const user of communityUsers) {
      // the username plugin: lower case, letters, digits, dots, at most 30
      expect(user.username).toMatch(/^[a-z0-9.]{3,30}$/);
      expect(user.email).toBe(`${user.username}@example.com`);
    }
  });

  // the seed signs the users up through BetterAuth, which checks the name (#153)
  it("gives every user a name the sign-up's name rule lets through", () => {
    for (const user of communityUsers)
      expect(nameProblem(user.name)).toBeNull();
  });

  it('has a few unverified newcomers and some users asking for more', () => {
    const unverified = communityUsers.filter((u) => !u.emailVerified);
    expect(unverified.length).toBeGreaterThanOrEqual(3);
    expect(unverified.length).toBeLessThanOrEqual(8);
    const wantMore = communityUsers.filter((u) => /Uvítal/.test(u.bio));
    expect(wantMore.length).toBeGreaterThanOrEqual(8);
  });

  it('lives all over Czechia, about a third in Prague', () => {
    const prague = communityUsers.filter((u) => isPrague(u.homeLocalitySlug));
    expect(prague.length / communityUsers.length).toBeGreaterThan(0.2);
    expect(prague.length / communityUsers.length).toBeLessThan(0.4);
    expect(
      new Set(communityUsers.map((u) => u.homeLocalitySlug)).size,
    ).toBeGreaterThanOrEqual(30);
  });

  it('references only catalog activities and localities', () => {
    for (const user of communityUsers) {
      expect(localitySlugs.has(user.homeLocalitySlug)).toBe(true);
      expect(user.interestSlugs.length).toBeGreaterThan(0);
      user.interestSlugs.forEach((slug) =>
        expect(activitySlugs.has(slug)).toBe(true),
      );
    }
    for (const item of [...communityEvents, ...communityGroups]) {
      expect(`${item.key} ${item.activitySlug}`).toBe(
        `${item.key} ${activitySlugs.has(item.activitySlug) ? item.activitySlug : '?'}`,
      );
      expect(`${item.key} ${item.localitySlug}`).toBe(
        `${item.key} ${localitySlugs.has(item.localitySlug) ? item.localitySlug : '?'}`,
      );
    }
  });

  it('places every event near its town', () => {
    for (const event of communityEvents) {
      const town = coordinates.get(event.localitySlug)!;
      expect(Math.abs(event.lat - town.lat)).toBeLessThan(0.02);
      expect(Math.abs(event.lng - town.lng)).toBeLessThan(0.03);
    }
  });

  it('lets only verified community users organize, join and request', () => {
    for (const event of communityEvents) {
      expect(verified.has(event.organizerKey)).toBe(true);
      const keys = event.participations.map((p) => p.userKey);
      expect(unique(keys)).toBe(true);
      expect(keys).not.toContain(event.organizerKey);
      keys.forEach((key) => expect(verified.has(key)).toBe(true));
    }
    for (const group of communityGroups) {
      const keys = group.members.map((m) => m.userKey);
      expect(unique(keys)).toBe(true);
      keys.forEach((key) => expect(verified.has(key)).toBe(true));
      expect(
        group.members.some((m) => m.role === 'admin' && m.status === 'active'),
      ).toBe(true);
    }
  });

  it('never touches the demo events and groups (#47)', () => {
    for (const event of demoEvents) {
      expect(userKeys.has(event.organizerKey)).toBe(false);
      event.participations.forEach((p) =>
        expect(userKeys.has(p.userKey)).toBe(false),
      );
    }
    for (const group of demoGroups) {
      group.members.forEach((m) => expect(userKeys.has(m.userKey)).toBe(false));
    }
  });

  it('fills every event and group exactly as planned', () => {
    communityEventPlans.forEach((plan, index) => {
      const event = communityEvents[index];
      const count = (status: string): number =>
        event.participations.filter((p) => p.status === status).length;
      expect(
        `${plan.key} ${count('approved')}/${count('pending')}/${count('withdrawn')}`,
      ).toBe(
        `${plan.key} ${plan.approved}/${plan.pending ?? 0}/${plan.withdrawn ?? 0}`,
      );
      expect(plan.min).toBeLessThanOrEqual(plan.max);
      expect(plan.approved).toBeLessThanOrEqual(plan.max);
      if (plan.approvalMode === 'open') expect(plan.pending ?? 0).toBe(0);
    });
    communityGroupPlans.forEach((plan, index) => {
      const group = communityGroups[index];
      expect(group.members.length).toBe(
        plan.adminKeys.length + plan.members + (plan.pending ?? 0),
      );
      if (plan.type === 'public') expect(plan.pending ?? 0).toBe(0);
    });
  });

  it('mixes full, missing and comfortable events and both approval modes', () => {
    const states = new Set(
      communityEvents.map((event) => {
        const approved = approvedCount(event);
        if (approved < event.minParticipants) return 'chybi';
        return approved >= event.maxParticipants ? 'plno' : 'volno';
      }),
    );
    expect(states).toEqual(new Set(['chybi', 'volno', 'plno']));
    expect(new Set(communityEvents.map((e) => e.approvalMode))).toEqual(
      new Set(['open', 'approval']),
    );
  });

  it('has nobody at two events on the same day', () => {
    const days = new Map<string, number[]>();
    for (const event of communityEvents) {
      const attendees = [
        event.organizerKey,
        ...event.participations
          .filter((p) => p.status !== 'withdrawn')
          .map((p) => p.userKey),
      ];
      for (const key of attendees) {
        days.set(key, [...(days.get(key) ?? []), event.schedule.daysFromNow]);
      }
    }
    for (const [key, list] of days) {
      expect(`${key} ${unique(list.map(String))}`).toBe(`${key} true`);
    }
  });

  it('includes the autumn athletics race in Ústí nad Orlicí', () => {
    const race = communityEvents.find(
      (e) =>
        e.activitySlug === 'atletika' && e.localitySlug === 'usti-nad-orlici',
    );
    expect(race?.title).toMatch(/atletické závody/);
  });

  it('keeps titles free of weekdays and occupancy states, texts free of placeholders', () => {
    const weekdays =
      /pondělí|úter[ýk]|střed[auy]|čtvrtek|pátek|sobot|neděl|víkend/i;
    const states = /chybí|volná místa|volné místo|plno|obsazeno/i;
    for (const event of communityEvents) {
      expect(event.title).not.toMatch(weekdays);
      expect(event.title).not.toMatch(states);
      expect(event.description ?? '').not.toMatch(weekdays);
      expect(
        (event.description ?? '')
          .split(/[.!?](\s|$)/)
          .filter((s) => s.trim().length > 1).length,
      ).toBeGreaterThanOrEqual(2);
    }
    const texts = [
      ...communityUsers.flatMap((u) => [u.name, u.username, u.email, u.bio]),
      ...communityEvents.flatMap((e) => [
        e.title,
        e.description ?? '',
        e.address,
        e.equipment ?? '',
        ...e.participations.map((p) => p.message ?? ''),
      ]),
      ...communityGroups.flatMap((g) => [
        g.name,
        g.description,
        ...g.members.map((m) => m.message ?? ''),
      ]),
    ];
    for (const text of texts) {
      expect(text).not.toMatch(/test|qa|lorem/i);
    }
  });

  it.each(seedMoments)(
    'puts every event in the future, with an end after the start, for a seed at %s',
    (now) => {
      for (const event of communityEvents) {
        const row = toEventRow(event, now);
        expect(row.startsAt.getTime()).toBeGreaterThan(now.getTime());
        expect(row.startsAt.getTime() - now.getTime()).toBeLessThan(
          41 * DAY_IN_MS,
        );
        expect(row.endsAt.getTime()).toBeGreaterThan(row.startsAt.getTime());
      }
    },
  );

  it.each(seedMoments)(
    'keeps Prague events within 8 days of a seed at %s off the „Chybí lidé“ filter (#47 demo)',
    (now) => {
      for (const event of communityEvents) {
        if (!isPrague(event.localitySlug)) continue;
        if (approvedCount(event) >= event.minParticipants) continue;
        const row = toEventRow(event, now);
        expect(
          `${event.key} ${row.startsAt.getTime() - now.getTime() > 8 * DAY_IN_MS}`,
        ).toBe(`${event.key} true`);
      }
    },
  );

  it.each(seedMoments)(
    'keeps Prague board games more than 8 days after a seed at %s, so L1 stays the first card under Deskové hry (#47 demo)',
    (now) => {
      for (const event of communityEvents) {
        if (!isPrague(event.localitySlug)) continue;
        if (event.activitySlug !== 'deskove-hry') continue;
        const row = toEventRow(event, now);
        expect(
          `${event.key} ${row.startsAt.getTime() - now.getTime() > 8 * DAY_IN_MS}`,
        ).toBe(`${event.key} true`);
      }
    },
  );

  it('converts to database rows', () => {
    const now = new Date('2026-10-26T12:00:00+01:00');
    for (const group of communityGroups) {
      expect(toGroupRow(group, now).deactivatedAt).toBeNull();
    }
    for (const event of communityEvents) {
      const row = toEventRow(event, now);
      for (const p of row.participations) {
        expect(p.approvedAt !== null).toBe(p.status === 'approved');
      }
    }
  });
});
