import { PublicEvent } from '@/modules/event/domain/event';
import { rankByInterest } from '@/modules/event/domain/interest';
import {
  pragueWeekendOf,
  startOfNextPragueDay,
  startOfPragueDay,
} from '@/modules/event/domain/prague-day';
import { GroupSummary, RecruitingGroup } from '@/modules/group/domain/group';
import { RatingSummary } from '@/modules/rating/domain/rating-summary';

/**
 * Sections of the landing page (#182, B-027, Figma A-01 / A-01d / A-01p),
 * in the order the page shows them. `highlight` is the panel „Teď chybí
 * jeden“ at the top. A visitor gets `popular` („O tyhle akce je zájem“),
 * only a signed-in user gets `interests` („Podle tvých zájmů“).
 */
export const HOME_EVENT_SECTION_KEYS = [
  'highlight',
  'missing',
  'weekend',
  'interests',
  'nearby',
  'popular',
  'wellRated',
] as const;
export type HomeEventSectionKey = (typeof HOME_EVENT_SECTION_KEYS)[number];

export const HOME_SECTION_KEYS = [
  ...HOME_EVENT_SECTION_KEYS,
  'groups',
] as const;
export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

/** Figma A-01d: one event in the panel, three cards in every other section. */
export const HIGHLIGHT_LIMIT = 1;
export const HOME_SECTION_LIMIT = 3;
/** Figma A-01d / A-01pd: three group cards. */
export const HOME_GROUPS_LIMIT = 3;

/**
 * „Od dobře hodnocených organizátorů“ (docs/ux-audit.md › Úvodní stránka):
 * an organizer or a group with an average of at least 4.5 from at least 3
 * ratings. The average is the rounded one every page shows (`summarizeStars`),
 * so a 4.5 on the profile is a 4.5 here too.
 */
export const WELL_RATED_MIN_AVERAGE = 4.5;
export const WELL_RATED_MIN_COUNT = 3;

export const isWellRated = (summary: RatingSummary | undefined): boolean =>
  summary !== undefined &&
  summary.average !== null &&
  summary.count >= WELL_RATED_MIN_COUNT &&
  summary.average >= WELL_RATED_MIN_AVERAGE;

/**
 * Whose rating an event carries: a group's event the group's (#180), any
 * other the organizer's own.
 */
export const ratingKeyOf = (event: PublicEvent): string =>
  event.group ? `group:${event.group.id}` : `user:${event.organizer.id}`;

/** Center of the page's own locality (a district's, not its city's), for „Kousek od tebe“. */
export type HomeLocalityCenter = { lat: number; lng: number };

/** The signed-in viewer, as far as the landing page needs to know. */
export type HomeViewer = {
  id: string;
  /**
   * Activities from the interests in the profile and of the events the user
   * took part in (B-027). Empty: „Podle tvých zájmů“ is a random pick.
   */
  interestActivityIds: string[];
  /** Events where the user already has a place or a request waiting. */
  joinedEventIds: string[];
};

export type HomeEventsInput = {
  /**
   * Upcoming public published events of the page's area (a district's whole
   * city, `HomeService`), soonest first.
   */
  events: PublicEvent[];
  /** Places and waiting requests per event id (#156, `countInterest`). */
  interest: ReadonlyMap<string, number>;
  /** Rating summaries per `ratingKeyOf`. */
  ratings: ReadonlyMap<string, RatingSummary>;
  /** Null = all of Czechia; there is no „Kousek od tebe“ then. */
  center: HomeLocalityCenter | null;
  /** Null for a visitor. */
  viewer: HomeViewer | null;
  now: Date;
  /** [0, 1), for the random pick; replaceable in tests. */
  random?: () => number;
};

export type HomeEventSection = {
  key: HomeEventSectionKey;
  events: PublicEvent[];
};

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance in km. */
export const distanceKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

/** Soonest first, then by id, so every cut-off is stable. */
const bySoonest = (a: PublicEvent, b: PublicEvent): number =>
  a.startsAt.getTime() - b.startsAt.getTime() ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Fewest people missing to the minimum first: the closest to taking place. */
const byFewestMissing = (a: PublicEvent, b: PublicEvent): number =>
  a.capacity.missingToMin - b.capacity.missingToMin || bySoonest(a, b);

/** The first event of every organizer (or group), in the given order. */
const onePerRatingKey = (events: PublicEvent[]): PublicEvent[] => {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = ratingKeyOf(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Fisher–Yates on a copy. */
const shuffled = <T>(items: readonly T[], random: () => number): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Which events each section shows, in order, at most `HOME_SECTION_LIMIT`
 * each (the panel one). Rules (docs/ux-audit.md › Úvodní stránka, B-027):
 *
 * - An event appears only in the first section it belongs to; the panel is
 *   the first. So a weekend event that misses people is in „Tady chybíš“,
 *   not again in „Tento víkend“.
 * - Only events one can still join: a full event is in no section, and a
 *   signed-in user doesn't get events they organize or already joined or
 *   asked to join („Akce, na které už jdeš, tu nejsou“, Figma A-01pd).
 * - A section with no events is left out.
 *
 * `events` must already be only upcoming, public and published (the
 * repository's `buildPublicEventsWhere`); this function doesn't check it.
 */
export const buildHomeEventSections = (
  input: HomeEventsInput,
): HomeEventSection[] => {
  const { viewer, center, interest, ratings, now } = input;
  const random = input.random ?? Math.random;
  const joined = new Set(viewer?.joinedEventIds ?? []);
  const interests = new Set(viewer?.interestActivityIds ?? []);
  const matchesInterests = (event: PublicEvent): boolean =>
    interests.has(event.activity.id);

  const candidates = input.events.filter(
    (event) =>
      !event.capacity.isFull &&
      !joined.has(event.id) &&
      event.organizer.id !== viewer?.id,
  );

  const weekend = pragueWeekendOf(now);
  const weekendFrom = startOfPragueDay(weekend.dateFrom).getTime();
  const weekendTo = startOfNextPragueDay(weekend.dateTo).getTime();

  type Selector = {
    key: HomeEventSectionKey;
    limit: number;
    /** Gets the events not used yet, returns them chosen and ordered. */
    select: (events: PublicEvent[]) => PublicEvent[];
  };

  const selectors: Selector[] = [
    {
      key: 'highlight',
      limit: HIGHLIGHT_LIMIT,
      // signed in: „Teď chybí jeden · z tvých zájmů“ when there is such an event
      select: (events) =>
        events
          .filter((event) => event.capacity.missingToMin > 0)
          .sort(
            (a, b) =>
              Number(matchesInterests(b)) - Number(matchesInterests(a)) ||
              byFewestMissing(a, b),
          ),
    },
    {
      key: 'missing',
      limit: HOME_SECTION_LIMIT,
      select: (events) =>
        events
          .filter((event) => event.capacity.missingToMin > 0)
          .sort(byFewestMissing),
    },
    {
      key: 'weekend',
      limit: HOME_SECTION_LIMIT,
      select: (events) =>
        events
          .filter((event) => {
            const startsAt = event.startsAt.getTime();
            return startsAt >= weekendFrom && startsAt < weekendTo;
          })
          .sort(bySoonest),
    },
    ...(viewer
      ? [
          {
            key: 'interests' as const,
            limit: HOME_SECTION_LIMIT,
            // B-027: without interests or past events a random pick
            select: (events: PublicEvent[]) =>
              interests.size > 0
                ? events.filter(matchesInterests).sort(bySoonest)
                : shuffled(events, random),
          },
        ]
      : []),
    ...(center
      ? [
          {
            key: 'nearby' as const,
            limit: HOME_SECTION_LIMIT,
            select: (events: PublicEvent[]) =>
              events
                .map((event) => ({ event, km: distanceKm(center, event) }))
                .sort((a, b) => a.km - b.km || bySoonest(a.event, b.event))
                .map(({ event }) => event),
          },
        ]
      : []),
    ...(viewer
      ? []
      : [
          {
            key: 'popular' as const,
            limit: HOME_SECTION_LIMIT,
            // nobody interested is no „O tyhle akce je zájem“
            select: (events: PublicEvent[]) =>
              rankByInterest(
                events.filter((event) => (interest.get(event.id) ?? 0) > 0),
                interest,
              ),
          },
        ]),
    {
      key: 'wellRated',
      limit: HOME_SECTION_LIMIT,
      // the best rated first, then the one rated by more people, then soonest;
      // one event per organizer, the section is about organizers
      select: (events) =>
        onePerRatingKey(
          events
            .filter((event) => isWellRated(ratings.get(ratingKeyOf(event))))
            .sort((a, b) => {
              const ra = ratings.get(ratingKeyOf(a)) as RatingSummary;
              const rb = ratings.get(ratingKeyOf(b)) as RatingSummary;
              return (
                (rb.average as number) - (ra.average as number) ||
                rb.count - ra.count ||
                bySoonest(a, b)
              );
            }),
        ),
    },
  ];

  const used = new Set<string>();
  const sections: HomeEventSection[] = [];
  for (const { key, limit, select } of selectors) {
    const events = select(
      candidates.filter((event) => !used.has(event.id)),
    ).slice(0, limit);
    if (events.length === 0) continue;
    events.forEach((event) => used.add(event.id));
    sections.push({ key, events });
  }
  return sections;
};

/**
 * „Tyhle skupiny rozšiřují partu“ (PO 4. 11., #238): groups whose next event
 * is soonest first, then by name; at most `HOME_GROUPS_LIMIT`. The time of
 * the next event is dropped: it may be a members-only event, whose time a
 * non-member must not learn (B-026).
 */
export const orderRecruitingGroups = (
  groups: readonly RecruitingGroup[],
): GroupSummary[] =>
  [...groups]
    .sort(
      (a, b) =>
        a.nextEventAt.getTime() - b.nextEventAt.getTime() ||
        a.name.localeCompare(b.name, 'cs') ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .slice(0, HOME_GROUPS_LIMIT)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ nextEventAt, ...group }) => group);
