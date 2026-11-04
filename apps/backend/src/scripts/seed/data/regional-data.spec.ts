import {
  communityEventPlans,
  communityEvents,
  communityUsers,
  isPrague,
  regionOf,
} from './community-data';
import { demoActivities, DemoEvent, demoEvents, pragueDate } from './demo-data';
import { EventSource, toEventRow } from './demo-rows';
import { groupEvents, SEED_MOMENTS } from './group-events-data';
import {
  COMMON_ACTIVITIES,
  MIN_EVENTS_PER_ACTIVITY,
  REGIONAL_CITIES,
} from './regional-data';

// Kontroly AK 2 z #181 nad všemi nadcházejícími akcemi seedu (demo #47, komunita
// s krajskými městy, akce skupin): hledač v kterémkoli krajském městě najde běžné
// aktivity a nikdy jen plnou akci (#167).

const upcoming: EventSource[] = [
  ...(demoEvents as DemoEvent[]),
  ...communityEvents,
  ...groupEvents,
];
const findable = upcoming.filter(
  (e) => e.status === 'published' && e.visibility === 'public',
);
const cityOf = (slug: string): string => (isPrague(slug) ? 'praha' : slug);
const isFull = (e: EventSource): boolean =>
  e.participations.filter((p) => p.status === 'approved').length >=
  e.maxParticipants;

describe('regional events (#181)', () => {
  it.each(REGIONAL_CITIES)(
    'gives every common activity at least two findable events in %s',
    (city) => {
      for (const activity of COMMON_ACTIVITIES) {
        const count = findable.filter(
          (e) => cityOf(e.localitySlug) === city && e.activitySlug === activity,
        ).length;
        expect(`${activity} ${count >= MIN_EVENTS_PER_ACTIVITY}`).toBe(
          `${activity} true`,
        );
      }
    },
  );

  it('never leaves a city with only full events of a common activity', () => {
    for (const city of REGIONAL_CITIES) {
      for (const activity of COMMON_ACTIVITIES) {
        const events = findable.filter(
          (e) => cityOf(e.localitySlug) === city && e.activitySlug === activity,
        );
        expect(`${city} ${activity} ${events.some((e) => !isFull(e))}`).toBe(
          `${city} ${activity} true`,
        );
      }
    }
  });

  // #167: jediný nohejbal v republice byl plný – slepá ulička
  it('has a not-full findable event for every activity that has any', () => {
    for (const activity of demoActivities.map((a) => a.slug)) {
      const events = findable.filter((e) => e.activitySlug === activity);
      if (events.length === 0) continue;
      expect(`${activity} ${events.some((e) => !isFull(e))}`).toBe(
        `${activity} true`,
      );
    }
  });

  it('counts enough events in every region and regional city', () => {
    const byRegion = new Map<string, number>();
    for (const e of findable) {
      const region = regionOf(e.localitySlug);
      byRegion.set(region, (byRegion.get(region) ?? 0) + 1);
    }
    // 13 krajů s krajským městem a Středočeský (sídlo v Praze)
    expect(byRegion.size).toBeGreaterThanOrEqual(14);
    for (const [region, count] of byRegion) {
      expect(`${region} ${count >= 4}`).toBe(`${region} true`);
    }
    for (const city of REGIONAL_CITIES) {
      const count = findable.filter(
        (e) => cityOf(e.localitySlug) === city,
      ).length;
      expect(`${city} ${count >= 20}`).toBe(`${city} true`);
    }
  });

  it('lets the generated events be organized by someone from the city', () => {
    const homes = new Map(communityUsers.map((u) => [u.key, u]));
    for (const plan of communityEventPlans.filter((p) =>
      p.key.startsWith('r-'),
    )) {
      const organizer = homes.get(plan.organizerKey)!;
      expect(
        `${plan.key} ${cityOf(organizer.homeLocalitySlug) === cityOf(plan.localitySlug)}`,
      ).toBe(`${plan.key} true`);
    }
  });

  it('keeps Prague generated events off the „Chybí lidé“ filter (#47 demo)', () => {
    for (const plan of communityEventPlans.filter(
      (p) => p.key.startsWith('r-') && isPrague(p.localitySlug),
    )) {
      expect(`${plan.key} ${plan.approved >= plan.min}`).toBe(
        `${plan.key} true`,
      );
    }
  });

  // demo data #47 hlídají překryv časů, ne den: dvě demo akce v jeden den smějí být
  it.each(SEED_MOMENTS)(
    'has nobody, demo accounts included, at a new event on a day with another event, for a seed at %s',
    (now) => {
      const demo = new Set<EventSource>(demoEvents as DemoEvent[]);
      const days = new Map<
        string,
        { day: string; demo: boolean; key: string }[]
      >();
      for (const event of upcoming) {
        const { y, m, d } = pragueDate(toEventRow(event, now).startsAt);
        const attendees = new Set([
          event.organizerKey,
          ...event.participations
            .filter((p) => p.status !== 'withdrawn')
            .map((p) => p.userKey),
        ]);
        for (const key of attendees) {
          days.set(key, [
            ...(days.get(key) ?? []),
            { day: `${y}-${m}-${d}`, demo: demo.has(event), key: event.key },
          ]);
        }
      }
      for (const [user, list] of days) {
        const clashes = list.flatMap((a, i) =>
          list
            .slice(i + 1)
            .filter((b) => b.day === a.day && !(a.demo && b.demo))
            .map((b) => `${a.key}+${b.key}`),
        );
        expect(`${user} ${clashes.join(',')}`).toBe(`${user} `);
      }
    },
  );
});
