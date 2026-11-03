import {
  CommunityEvent,
  communityEvents,
  communityGroups,
  nearTown,
} from './community-data';
import { DemoEvent, demoEvents, demoGroups, pragueDate } from './demo-data';
import { EventSource, GroupSource, toEventRow } from './demo-rows';
import { stableHash } from './stable-hash';

/**
 * Akce skupin (#181, model B-055, zobrazení #70). Každá aktivní skupina má
 * nadcházející veřejnou akci a akci jen pro členy (`visibility: members`)
 * a dvě proběhlé (past-data.ts). Pořádá je první správce, účastní se jich
 * aktivní členové. Dokud #70 není hotové, akce jen pro členy se v seznamu
 * neukážou a veřejné vypadají jako běžné akce.
 *
 * Pravidla, která hlídá group-events-data.spec.ts:
 * - nadcházející akce jsou až od 9. dne po seedu: pražské akce v prvních 8
 *   dnech nesmí chybět lidi a deskovky v Praze musí být až po 8 dnech (#47 demo),
 * - nikdo, ani demo účet, nemá ten den jinou akci (kontrola pro seed v kterýkoli
 *   den a hodinu týdne, SEED_MOMENTS).
 */

/** Recept na akce jedné skupiny: 2 nadcházející a 2 proběhlé názvy, místo a kapacita. */
export type GroupRecipe = {
  groupKey: string;
  address: string;
  /** [nadcházející veřejná, nadcházející pro členy, proběhlá veřejná, proběhlá pro členy] */
  titles: [string, string, string, string];
  description: string;
  time: string;
  durationMinutes: number;
  min: number;
  max: number;
  price?: number;
  level?: 'beginner' | 'advanced' | 'all';
  equipment?: string;
};

export const groupRecipes: GroupRecipe[] = [
  // demo skupiny #47 (Praha)
  {
    groupKey: 'g-florbal',
    address: 'Sportovní hala Prosek, Praha 9',
    titles: [
      'Florbal skupiny – smíšené týmy',
      'Florbal jen pro členy – trénink střelby',
      'Florbal skupiny – zápas s Vysočany',
      'Florbal jen pro členy – přihrávky a nájezdy',
    ],
    description:
      'Hrajeme na celé hřiště, týmy losujeme na místě. Hokejky lze půjčit, platí se za halu.',
    time: '19:30',
    durationMinutes: 90,
    min: 6,
    max: 14,
    price: 90,
    level: 'all',
    equipment: 'Sálová obuv',
  },
  {
    groupKey: 'g-florbal-pokrocili',
    address: 'Sportovní hala Prosek, Praha 9',
    titles: [
      'Florbal pokročilých – otevřený trénink',
      'Florbal pokročilých – herní systémy',
      'Florbal pokročilých – přátelák',
      'Florbal pokročilých – přesilovky',
    ],
    description:
      'Rychlá hra pro ty, kdo hrají aspoň dva roky. Rozcvičku a herní cvičení vede Tomáš.',
    time: '20:30',
    durationMinutes: 90,
    min: 4,
    max: 12,
    price: 100,
    level: 'advanced',
    equipment: 'Vlastní hokejka, sálová obuv',
  },
  {
    groupKey: 'g-badminton',
    address: 'Badmintonová hala Letňany, Praha 9',
    titles: [
      'Badminton skupiny – čtyřhry',
      'Badminton jen pro členy – turnaj dvojic',
      'Badminton skupiny – míchané dvojice',
      'Badminton jen pro členy – trénink podání',
    ],
    description:
      'Máme zamluvené dva kurty, dvojice se mění po každém setu. Košíčky jsou v ceně.',
    time: '18:00',
    durationMinutes: 90,
    min: 2,
    max: 8,
    price: 150,
    level: 'all',
    equipment: 'Raketa, sálová obuv',
  },
  {
    groupKey: 'g-volejbal',
    address: 'Sportovní areál Letná, Milady Horákové, Praha 7',
    titles: [
      'Volejbal na Letné – otevřená hra',
      'Volejbal jen pro členy – nácvik nahrávky',
      'Volejbal na Letné – smíšené šestky',
      'Volejbal jen pro členy – hra na body',
    ],
    description:
      'Antukový kurt na Letné, hrajeme na dva vítězné sety. Míče přinese Petra.',
    time: '18:00',
    durationMinutes: 120,
    min: 4,
    max: 12,
    level: 'all',
    equipment: 'Sportovní obuv',
  },
  {
    groupKey: 'g-deskovky',
    address: 'Deskoherní kavárna, Korunní, Praha 2',
    titles: [
      'Deskovky skupiny – otevřený večer',
      'Deskovky jen pro členy – kampaň Gloomhaven',
      'Deskovky skupiny – večer párty her',
      'Deskovky jen pro členy – Twilight Imperium',
    ],
    description:
      'Hry vybíráme podle toho, kdo přijde, pravidla vždycky někdo vysvětlí. Stůl je zamluvený od šesti.',
    time: '18:00',
    durationMinutes: 240,
    min: 2,
    max: 8,
    level: 'all',
  },
  {
    groupKey: 'g-beh',
    address: 'Stromovka, hlavní vstup od Výstaviště, Praha 7',
    titles: [
      'Skupinový běh Stromovkou',
      'Běh jen pro členy – dlouhý okruh přes Trojský most',
      'Skupinový běh Stromovkou a Letnou',
      'Běh jen pro členy – rovinky na Letné',
    ],
    description:
      'Tempo se přizpůsobí nejpomalejšímu, nikoho nenecháme vzadu. Po běhu protažení u Planetária.',
    time: '07:00',
    durationMinutes: 60,
    min: 2,
    max: 12,
    level: 'all',
    equipment: 'Běžecké boty',
  },
  {
    groupKey: 'g-turistika',
    address: 'Nádraží Praha-Smíchov, Praha 5',
    titles: [
      'Výlet skupiny: Prokopské údolí',
      'Výlet jen pro členy: Karlštejn a Svatý Jan pod Skalou',
      'Výlet skupiny: Divoká Šárka',
      'Výlet jen pro členy: Český kras',
    ],
    description:
      'Kolem 15 km po značených cestách, sraz u pokladen. Svačinu si nese každý sám.',
    time: '09:00',
    durationMinutes: 360,
    min: 2,
    max: 15,
    level: 'all',
    equipment: 'Pevné boty, pláštěnka',
  },
  {
    groupKey: 'g-jazyky',
    address: 'Kavárna v Libni, Zenklova, Praha 8',
    titles: [
      'Jazykový tandem skupiny – angličtina a čeština',
      'Tandem jen pro členy – španělština',
      'Jazykový tandem skupiny – němčina',
      'Tandem jen pro členy – konverzace o cestování',
    ],
    description:
      'Půl hodiny jeden jazyk, půl hodiny druhý, pak se páry promíchají. Úroveň nehraje roli.',
    time: '18:30',
    durationMinutes: 120,
    min: 2,
    max: 10,
    level: 'all',
  },
  {
    groupKey: 'g-uklid',
    address: 'Divoká Šárka, u Džbánu, Praha 6',
    titles: [
      'Úklid Divoké Šárky',
      'Úklid jen pro členy – břehy Šáreckého potoka',
      'Úklid Hvězdy a okolí',
      'Úklid jen pro členy – Džbán',
    ],
    description:
      'Rukavice a pytle zajistíme, odvoz domluvený s Prahou 6. Na konci společný oběd z vlastních zásob.',
    time: '10:00',
    durationMinutes: 180,
    min: 2,
    max: 15,
    level: 'all',
    equipment: 'Pevné boty',
  },
  // komunitní skupiny #150
  {
    groupKey: 'kg-bezci-stromovka',
    address: 'Stromovka, vchod od Výstaviště, Praha 7',
    titles: [
      'Holešovičtí běžci – ranní okruh',
      'Holešovičtí běžci jen pro členy – tempový běh',
      'Holešovičtí běžci – okruh kolem Výstaviště',
      'Holešovičtí běžci jen pro členy – kopce v Troji',
    ],
    description:
      'Okruh 7 km tempem kolem 6 min/km, nikoho nenecháme vzadu. Sraz u vchodu od Výstaviště.',
    time: '07:00',
    durationMinutes: 60,
    min: 2,
    max: 12,
    level: 'all',
    equipment: 'Běžecké boty',
  },
  {
    groupKey: 'kg-deskovky-vinohrady',
    address: 'Vnitroblock, Tusarova, Praha 7',
    titles: [
      'Deskoherní večer – rodinné hry',
      'Deskoherní večer jen pro členy – těžká eura',
      'Deskoherní večer – kooperativní hry',
      'Deskoherní večer jen pro členy – legacy kampaň',
    ],
    description:
      'Hrajeme od rodinných her po těžká eura, nováčky vždycky naučíme. Stoly máme zamluvené.',
    time: '18:30',
    durationMinutes: 240,
    min: 2,
    max: 8,
    level: 'all',
  },
  {
    groupKey: 'kg-volejbal-sokol',
    address: 'Sokol Vinohrady, Polská, Praha 2',
    titles: [
      'Volejbal v Sokole – otevřený trénink',
      'Volejbal v Sokole jen pro členy – nácvik bloku',
      'Volejbal v Sokole – přátelský zápas',
      'Volejbal v Sokole jen pro členy – hra na body',
    ],
    description:
      'Tělocvična Sokola, hrajeme šest na šest. Hala je zamluvená, platí se na místě.',
    time: '19:00',
    durationMinutes: 120,
    min: 6,
    max: 12,
    price: 110,
    level: 'advanced',
    equipment: 'Sálová obuv',
  },
  {
    groupKey: 'kg-lezci-smichov',
    address: 'Lezecká stěna, Smíchov, Praha 5',
    titles: [
      'Lezení na Smíchově – boulder pro nové',
      'Lezení jen pro členy – lano a jištění',
      'Lezení na Smíchově – společný boulder',
      'Lezení jen pro členy – trénink převisů',
    ],
    description:
      'Boulder i lano, jistí zkušení členové. Vybavení lze půjčit na pokladně.',
    time: '18:00',
    durationMinutes: 150,
    min: 2,
    max: 8,
    price: 220,
    level: 'all',
    equipment: 'Lezečky, sedák',
  },
  {
    groupKey: 'kg-hokej-praha',
    address: 'Zimní stadion Nusle, Praha 4',
    titles: [
      'Hokej na Nuslích – volné bruslení a hra',
      'Hokej jen pro členy – zápas na celé hřiště',
      'Hokej na Nuslích – ranní led',
      'Hokej jen pro členy – trénink přihrávek',
    ],
    description:
      'Led máme na hodinu a půl, týmy se losují v šatně. Plná výstroj je nutná.',
    time: '21:00',
    durationMinutes: 90,
    min: 6,
    max: 16,
    price: 250,
    level: 'advanced',
    equipment: 'Kompletní hokejová výstroj',
  },
  {
    groupKey: 'kg-volejbal-brno',
    address: 'Sportovní hala Vodova, Brno',
    titles: [
      'Brněnský volejbal – otevřená hra',
      'Brněnský volejbal jen pro členy – nácvik útoku',
      'Brněnský volejbal – smíšené šestky',
      'Brněnský volejbal jen pro členy – turnaj trojic',
    ],
    description:
      'Hrajeme smíšený volejbal, týmy mícháme po každém setu. Halu platíme společně.',
    time: '19:00',
    durationMinutes: 120,
    min: 4,
    max: 12,
    price: 100,
    level: 'all',
    equipment: 'Sálová obuv',
  },
  {
    groupKey: 'kg-kviz-brno',
    address: 'Hospoda na Veveří, Brno',
    titles: [
      'Pub kvíz – otevřený večer',
      'Pub kvíz jen pro členy – tematický večer o filmu',
      'Pub kvíz – historie a zeměpis',
      'Pub kvíz jen pro členy – hudební kolo',
    ],
    description:
      'Šest kol po deseti otázkách, týmy po čtyřech. Kdo přijde sám, dostane se do týmu.',
    time: '19:00',
    durationMinutes: 150,
    min: 2,
    max: 8,
    level: 'all',
  },
  {
    groupKey: 'kg-turiste-ostrava',
    address: 'Sraz u Landek Parku, Ostrava-Petřkovice',
    titles: [
      'Výlet ostravských turistů: Landek a Hlučínské jezero',
      'Výlet jen pro členy: Lysá hora',
      'Výlet ostravských turistů: Poodří',
      'Výlet jen pro členy: Radhošť',
    ],
    description:
      'Kolem 18 km, tempo pro každého. Zpátky jedeme vlakem, jízdenku si kupuje každý sám.',
    time: '08:30',
    durationMinutes: 420,
    min: 2,
    max: 15,
    level: 'all',
    equipment: 'Pevné boty',
  },
  {
    groupKey: 'kg-bezci-plzen',
    address: 'Borský park, Plzeň',
    titles: [
      'Plzeňští běžci – okruh Borským parkem',
      'Plzeňští běžci jen pro členy – kolem Boleveckých rybníků',
      'Plzeňští běžci – podél Radbuzy',
      'Plzeňští běžci jen pro členy – intervaly na dráze',
    ],
    description:
      'Okruh 8 km, tempo se domluví na místě. Po běhu protažení, kdo chce.',
    time: '18:00',
    durationMinutes: 60,
    min: 2,
    max: 10,
    level: 'all',
    equipment: 'Běžecké boty',
  },
  {
    groupKey: 'kg-atletika-uo',
    address: 'Atletický stadion, Ústí nad Orlicí',
    titles: [
      'Atletika v Ústí – otevřený trénink',
      'Atletika jen pro členy – technika skoku dalekého',
      'Atletika v Ústí – sprinty a štafety',
      'Atletika jen pro členy – vrh koulí',
    ],
    description:
      'Rozcvička, technika a pár sprintů na dráze. Vhodné pro každého, kdo chce zkusit atletiku.',
    time: '17:30',
    durationMinutes: 90,
    min: 2,
    max: 12,
    level: 'all',
    equipment: 'Tretry nebo běžecké boty',
  },
  {
    groupKey: 'kg-hokej-pardubice',
    address: 'Zimní stadion, Pardubice',
    titles: [
      'Hokej v Pardubicích – otevřený led',
      'Hokej jen pro členy – zápas',
      'Hokej v Pardubicích – ranní led',
      'Hokej jen pro členy – trénink bruslení',
    ],
    description:
      'Led na hodinu a půl, týmy losujeme. Plná výstroj je nutná, led se platí na místě.',
    time: '21:30',
    durationMinutes: 90,
    min: 6,
    max: 16,
    price: 230,
    level: 'advanced',
    equipment: 'Kompletní hokejová výstroj',
  },
  {
    groupKey: 'kg-horalove-liberec',
    address: 'Konečná tramvaje Horní Hanychov, Liberec',
    titles: [
      'Liberečtí horalové: výstup na Ještěd',
      'Výlet jen pro členy: Jizerské hory',
      'Liberečtí horalové: hřebenovka Ještědského hřbetu',
      'Výlet jen pro členy: Smědava a Jizera',
    ],
    description:
      'Kolem 14 km s převýšením přes 500 metrů. Svačinu a pití si nese každý sám.',
    time: '09:00',
    durationMinutes: 360,
    min: 2,
    max: 12,
    level: 'all',
    equipment: 'Pevné boty, pláštěnka',
  },
  {
    groupKey: 'kg-tandem-olomouc',
    address: 'Kavárna u Horního náměstí, Olomouc',
    titles: [
      'Olomoucký tandem – angličtina a čeština',
      'Tandem jen pro členy – francouzština',
      'Olomoucký tandem – němčina',
      'Tandem jen pro členy – konverzace o filmech',
    ],
    description:
      'Studenti z Erasmu a místní, půl hodiny každý jazyk. Pak se páry promíchají.',
    time: '18:00',
    durationMinutes: 120,
    min: 2,
    max: 12,
    level: 'all',
  },
  {
    groupKey: 'kg-deskovky-zlin',
    address: 'Herní kavárna, Kvítková, Zlín',
    titles: [
      'Zlínské deskovky – otevřený večer',
      'Zlínské deskovky jen pro členy – strategický večer',
      'Zlínské deskovky – párty hry',
      'Zlínské deskovky jen pro členy – turnaj v Carcassonne',
    ],
    description:
      'Hry vybereme podle toho, kdo přijde, pravidla vysvětlíme. Nováčci jsou vítaní.',
    time: '18:30',
    durationMinutes: 210,
    min: 2,
    max: 8,
    level: 'all',
  },
  {
    groupKey: 'kg-florbal-cb',
    address: 'Sportovní hala Sokol, České Budějovice',
    titles: [
      'Budějovický florbal – otevřený trénink',
      'Budějovický florbal jen pro členy – zápas',
      'Budějovický florbal – smíšené týmy',
      'Budějovický florbal jen pro členy – trénink střelby',
    ],
    description:
      'Hrajeme na celé hřiště, při větším počtu střídáme po třech minutách. Hala se platí na místě.',
    time: '20:00',
    durationMinutes: 90,
    min: 4,
    max: 14,
    price: 90,
    level: 'advanced',
    equipment: 'Hokejka, sálová obuv',
  },
  {
    groupKey: 'kg-sachy-usti',
    address: 'Kavárna u Mírového náměstí, Ústí nad Labem',
    titles: [
      'Šachy v Ústí – volné partie',
      'Šachy jen pro členy – rapid turnaj',
      'Šachy v Ústí – simultánka',
      'Šachy jen pro členy – rozbor partií',
    ],
    description:
      'Hrajeme volné partie i bleskovky, šachovnice a hodiny máme. Přijít může každý, kdo zná pravidla.',
    time: '18:00',
    durationMinutes: 180,
    min: 2,
    max: 10,
    level: 'all',
  },
];

/** Všechny skupiny demo i komunity (klíč, lokalita, typ, aktivita, členové). */
export const allGroups: GroupSource[] = [...demoGroups, ...communityGroups];

/** Okamžiky seedu, pro které nikdo nesmí mít dvě akce v jeden den: týden v 0:30, 12:00 a 23:30. */
export const SEED_MOMENTS: Date[] = [
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

const dayKey = (date: Date): string => {
  const { y, m, d } = pragueDate(date);
  return `${y}-${m}-${d}`;
};

/** Dny akcí po jednotlivých okamžicích seedu: `index okamžiku|datum`. */
const eventDays = (event: EventSource): string[] =>
  SEED_MOMENTS.map(
    (now, i) => `${i}|${dayKey(toEventRow(event, now).startsAt)}`,
  );

/** Kdo má kdy akci (organizátor a kdo se neodhlásil), v podobě z `eventDays`. */
export const busyDays = (events: EventSource[]): Map<string, Set<string>> => {
  const busy = new Map<string, Set<string>>();
  for (const event of events) {
    const days = eventDays(event);
    const attendees = [
      event.organizerKey,
      ...event.participations
        .filter((p) => p.status !== 'withdrawn')
        .map((p) => p.userKey),
    ];
    for (const key of attendees) {
      const set = busy.get(key) ?? new Set<string>();
      days.forEach((day) => set.add(day));
      busy.set(key, set);
    }
  }
  return busy;
};

/** Termíny akcí skupin: 9. až 30. den po seedu. */
const FIRST_DAY = 9;
const LAST_DAY = 30;

export type GroupEvent = Omit<CommunityEvent, 'schedule'> & {
  schedule: { daysFromNow: number; time: string };
  groupKey: string;
};

const buildGroupEvents = (): GroupEvent[] => {
  const busy = busyDays([...(demoEvents as DemoEvent[]), ...communityEvents]);
  const events: GroupEvent[] = [];
  for (const recipe of groupRecipes) {
    const group = allGroups.find((g) => g.key === recipe.groupKey);
    if (!group || group.status !== 'active') {
      throw new Error(`No active group ${recipe.groupKey}`);
    }
    const organizerKey = group.members.find(
      (m) => m.role === 'admin' && m.status === 'active',
    )!.userKey;
    const members = group.members
      .filter((m) => m.status === 'active' && m.userKey !== organizerKey)
      .map((m) => m.userKey);

    for (const index of [0, 1]) {
      const key = `ge-${recipe.groupKey}-${index}`;
      const visibility = index === 0 ? 'public' : 'members';
      const span = LAST_DAY - FIRST_DAY + 1;
      const free = (userKey: string, days: string[]): boolean =>
        days.every((day) => !busy.get(userKey)?.has(day));

      // první den od „náhodného“ startu, kdy má organizátor volno
      const start = stableHash(key) % span;
      let schedule = { daysFromNow: FIRST_DAY, time: recipe.time };
      let days: string[] = [];
      for (let d = 0; d < span; d++) {
        schedule = {
          daysFromNow: FIRST_DAY + ((start + d) % span),
          time: recipe.time,
        };
        days = eventDays({ ...probe, schedule });
        if (free(organizerKey, days)) break;
      }

      // kolik členů přijde: od minima výš, nikdy přes kapacitu
      const wanted = Math.min(
        recipe.max,
        recipe.min + (stableHash(`${key}-count`) % 4),
      );
      const going = members.filter((m) => free(m, days)).slice(0, wanted);
      [organizerKey, ...going].forEach((userKey) => {
        const set = busy.get(userKey) ?? new Set<string>();
        days.forEach((day) => set.add(day));
        busy.set(userKey, set);
      });

      events.push({
        key,
        groupKey: recipe.groupKey,
        title: recipe.titles[index],
        description: recipe.description,
        activitySlug: group.activitySlug as GroupEvent['activitySlug'],
        schedule,
        durationMinutes: recipe.durationMinutes,
        address: recipe.address,
        localitySlug: group.localitySlug,
        ...nearTown(group.localitySlug, key),
        minParticipants: recipe.min,
        maxParticipants: recipe.max,
        price: recipe.price,
        level: recipe.level,
        equipment: recipe.equipment,
        approvalMode: 'open',
        visibility,
        organizerKey,
        status: 'published',
        participations: going.map((userKey) => ({
          userKey,
          status: 'approved' as const,
        })),
      });
    }
  }
  return events;
};

/** Jen termín je potřeba, aby šly spočítat dny akce (`eventDays`). */
const probe: EventSource = {
  key: 'probe',
  title: '',
  activitySlug: 'beh',
  schedule: { daysFromNow: 1, time: '12:00' },
  durationMinutes: 60,
  address: '',
  localitySlug: 'praha',
  lat: 0,
  lng: 0,
  minParticipants: 1,
  maxParticipants: 1,
  approvalMode: 'open',
  visibility: 'public',
  organizerKey: '',
  status: 'published',
  participations: [],
};

export const groupEvents: GroupEvent[] = buildGroupEvents();
