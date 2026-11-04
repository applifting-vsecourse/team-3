import {
  DemoActivitySlug,
  DemoLocalitySlug,
  fromPragueLocal,
  pragueDate,
} from './demo-data';

const MINUTE_IN_MS = 60 * 1000;
const DAY_IN_MS = 24 * 60 * MINUTE_IN_MS;
/** A past event is over at least this long before the seed. */
const MIN_PAST_MS = 60 * MINUTE_IN_MS;

/**
 * Proběhlé akce a jejich hodnocení (#180), aby měl profil (#178, #179) co
 * ukázat: průměr jako organizátor a jako účastník. Demo data #47 proběhlou akci
 * nemají, seed každý jejich termín posouvá do budoucna.
 *
 * Co z dat vyjde (hlídá rating-data.spec.ts):
 * - Petra (organizator) jako organizátorka 4,5 ze 6 hodnocení; sedmé, 1 hvězda,
 *   je smazané superadminem a nepočítá se.
 * - Jakub (uzivatel) jako účastník 4,3 ze 4 hodnocení (17 / 4, zaokrouhleno
 *   nahoru); jako organizátor zatím bez hodnocení.
 * - Petra jako účastnice 5,0 z florbalu, který pořádal Tomáš (spravce).
 *
 * Další proběhlé akce, i akce skupin, generuje past-data.ts (#181); Petře
 * a Jakubovi tam hodnocení nepřibudou. Že se akce skupin osobě nepočítají,
 * hlídají testy rating-summary.spec.ts.
 */
export interface PastEvent {
  key: string;
  title: string;
  description?: string;
  activitySlug: DemoActivitySlug;
  /** Před kolika dny (pražský kalendářní den) akce začala, v `time`. */
  daysAgo: number;
  time: string;
  durationMinutes: number;
  address: string;
  localitySlug: DemoLocalitySlug;
  lat: number;
  lng: number;
  minParticipants: number;
  maxParticipants: number;
  organizerKey: string;
  /** Schválení účastníci (`approved`), v pořadí schválení. */
  participantKeys: string[];
  /** Co účastníci dali akci a organizátorovi (`Rating`). */
  ratings: {
    userKey: string;
    eventStars: number;
    organizerStars: number;
    comment?: string;
    /** Smazané superadminem (B-063): do průměru se nepočítá. */
    deleted?: true;
  }[];
  /** Co organizátor dal účastníkům (`ParticipantRating`). */
  participantRatings: { userKey: string; stars: number; deleted?: true }[];
}

export const pastEvents: PastEvent[] = [
  {
    key: 'p01',
    title: 'Volejbal na Letné',
    description:
      'Smíšený volejbal 6 na 6 na antukovém kurtu, hrajeme na dva sety.',
    activitySlug: 'volejbal',
    daysAgo: 3,
    time: '18:00',
    durationMinutes: 120,
    address: 'Sportovní areál Letná, Milady Horákové, Praha 7',
    localitySlug: 'praha-7',
    lat: 50.0997,
    lng: 14.4205,
    minParticipants: 4,
    maxParticipants: 12,
    organizerKey: 'organizator',
    participantKeys: ['uzivatel', 'u04', 'u05', 'u06', 'u14'],
    ratings: [
      {
        userKey: 'uzivatel',
        eventStars: 5,
        organizerStars: 5,
        comment: 'Skvělá parta, příště zase.',
      },
      { userKey: 'u04', eventStars: 4, organizerStars: 5 },
      { userKey: 'u05', eventStars: 5, organizerStars: 4 },
      { userKey: 'u06', eventStars: 4, organizerStars: 4 },
      {
        userKey: 'u14',
        eventStars: 1,
        organizerStars: 1,
        comment: 'Reklama na cizí akci.',
        deleted: true,
      },
    ],
    participantRatings: [
      { userKey: 'uzivatel', stars: 5 },
      { userKey: 'u04', stars: 4 },
      { userKey: 'u05', stars: 5 },
      { userKey: 'u06', stars: 3 },
    ],
  },
  {
    key: 'p02',
    title: 'Deskovky v Holešovicích – Ark Nova',
    description: 'Jedna delší hra na celý večer, pravidla vysvětlím na místě.',
    activitySlug: 'deskove-hry',
    daysAgo: 9,
    time: '18:30',
    durationMinutes: 180,
    address: 'Kavárna Vnitroblock, Tusarova 31, Praha 7',
    localitySlug: 'praha-7',
    lat: 50.1013,
    lng: 14.4474,
    minParticipants: 3,
    maxParticipants: 4,
    organizerKey: 'organizator',
    participantKeys: ['uzivatel', 'u05', 'u07'],
    ratings: [
      { userKey: 'uzivatel', eventStars: 5, organizerStars: 4 },
      {
        userKey: 'u07',
        eventStars: 4,
        organizerStars: 5,
        comment: 'Pravidla vysvětlená za deset minut, super.',
      },
    ],
    participantRatings: [
      { userKey: 'uzivatel', stars: 4 },
      { userKey: 'u05', stars: 5 },
      { userKey: 'u07', stars: 2, deleted: true },
    ],
  },
  {
    key: 'p03',
    title: 'Florbal v hale Podvinný mlýn',
    activitySlug: 'florbal',
    daysAgo: 5,
    time: '19:00',
    durationMinutes: 90,
    address: 'Hala Podvinný mlýn, Prosecká 1, Praha 9',
    localitySlug: 'praha-9',
    lat: 50.1045,
    lng: 14.4936,
    minParticipants: 4,
    maxParticipants: 12,
    organizerKey: 'spravce',
    participantKeys: ['organizator', 'uzivatel', 'u08', 'u09'],
    ratings: [
      { userKey: 'organizator', eventStars: 4, organizerStars: 4 },
      { userKey: 'u08', eventStars: 5, organizerStars: 5 },
    ],
    participantRatings: [
      { userKey: 'organizator', stars: 5 },
      { userKey: 'uzivatel', stars: 5 },
      { userKey: 'u08', stars: 4 },
    ],
  },
  {
    key: 'p04',
    title: 'Pub kvíz v Karlíně',
    activitySlug: 'pub-kviz',
    daysAgo: 12,
    time: '19:00',
    durationMinutes: 150,
    address: 'Hospoda U Mostu, Sokolovská 76, Praha 8',
    localitySlug: 'praha-8',
    lat: 50.0927,
    lng: 14.4521,
    minParticipants: 3,
    maxParticipants: 6,
    organizerKey: 'u04',
    participantKeys: ['uzivatel', 'u10', 'u11'],
    ratings: [
      { userKey: 'uzivatel', eventStars: 4, organizerStars: 5 },
      { userKey: 'u10', eventStars: 3, organizerStars: 3 },
    ],
    participantRatings: [
      { userKey: 'uzivatel', stars: 3 },
      { userKey: 'u10', stars: 4 },
    ],
  },
];

/**
 * When a past event started: `daysAgo` Prague calendar days before `now`, at
 * `time`. Moved a day further back while it would not be over at least an
 * hour before `now`, so it never ends after the seed.
 */
export const resolvePastStartsAt = (
  event: Pick<PastEvent, 'daysAgo' | 'time' | 'durationMinutes'>,
  now: Date,
): Date => {
  const [hh, mm] = event.time.split(':').map(Number);
  const today = pragueDate(now);
  let shift = event.daysAgo;
  let start = fromPragueLocal(today.y, today.m, today.d - shift, hh, mm);
  while (
    start.getTime() + event.durationMinutes * MINUTE_IN_MS >
    now.getTime() - MIN_PAST_MS
  ) {
    shift += 1;
    start = fromPragueLocal(today.y, today.m, today.d - shift, hh, mm);
  }
  return start;
};

/**
 * Proběhlá akce z rating-data.ts nebo vygenerovaná (past-data.ts, #181): ta leží
 * i mimo krajská města, může patřit skupině a může být zrušená.
 */
export type PastEventSource = Omit<PastEvent, 'localitySlug'> & {
  localitySlug: string;
  /** Akce skupiny: klíč skupiny z dat. */
  groupKey?: string;
  visibility?: 'public' | 'members';
  /** Zrušená akce: důvod; hodnocení nemá. */
  cancelReason?: string;
};

export type PastEventRow = Omit<
  PastEventSource,
  'daysAgo' | 'time' | 'durationMinutes' | 'participantKeys'
> & {
  startsAt: Date;
  endsAt: Date;
  /** Approved two days before the event, a minute apart in the given order. */
  participations: { userKey: string; approvedAt: Date }[];
};

/** A past event as rows for the database, without Prisma, so it can be tested. */
export const toPastEventRow = (
  event: PastEventSource,
  now: Date,
): PastEventRow => {
  const startsAt = resolvePastStartsAt(event, now);
  return {
    key: event.key,
    title: event.title,
    description: event.description,
    activitySlug: event.activitySlug,
    address: event.address,
    localitySlug: event.localitySlug,
    lat: event.lat,
    lng: event.lng,
    minParticipants: event.minParticipants,
    maxParticipants: event.maxParticipants,
    organizerKey: event.organizerKey,
    groupKey: event.groupKey,
    visibility: event.visibility,
    cancelReason: event.cancelReason,
    ratings: event.ratings,
    participantRatings: event.participantRatings,
    startsAt,
    endsAt: new Date(startsAt.getTime() + event.durationMinutes * MINUTE_IN_MS),
    participations: event.participantKeys.map((userKey, index) => ({
      userKey,
      approvedAt: new Date(
        startsAt.getTime() - 2 * DAY_IN_MS + index * MINUTE_IN_MS,
      ),
    })),
  };
};
