import type { CommunityEventPlan, CommunityUser } from './community-data';
import type { DemoActivitySlug } from './demo-data';
import { stableHash } from './stable-hash';

/**
 * Akce v krajských městech (#181, nález z #167: hledač mimo Prahu nic nenajde).
 *
 * V každém krajském městě má každá běžná aktivita aspoň MIN_EVENTS_PER_ACTIVITY
 * nadcházejících veřejných akcí. Co chybí, doplní buildRegionalPlans ze šablon
 * (aktivita) a míst (město); účastníky pak vybere buildEvents v community-data.ts
 * stejně jako u ručně psaných akcí. Výběr je deterministický (stableHash).
 *
 * Pravidla, která hlídá regional-data.spec.ts:
 * - obsazenost se střídá (chybí lidé / volná místa / plno), ale z dvojice akcí
 *   jednoho města a aktivity nejsou nikdy obě plné,
 * - pražská akce „nechybí lidi“ (živé demo #47 počítá s první kartou filtru
 *   Chybí lidé + Příštích 7 dní),
 * - organizátor je z daného města a nemá dvě akce v jeden den.
 */

/** Běžné aktivity (R5 v plánu #181). */
export const COMMON_ACTIVITIES = [
  'beh',
  'turistika',
  'volejbal',
  'badminton',
  'fotbal',
  'florbal',
  'joga',
  'deskove-hry',
  'stolni-tenis',
  'plavani',
] as const satisfies readonly DemoActivitySlug[];

/** Praha a 12 krajských měst; slug lokality z katalogu. */
export const REGIONAL_CITIES = [
  'praha',
  'brno',
  'ostrava',
  'plzen',
  'olomouc',
  'liberec',
  'hradec-kralove',
  'pardubice',
  'ceske-budejovice',
  'usti-nad-labem',
  'zlin',
  'jihlava',
  'karlovy-vary',
] as const;

export const MIN_EVENTS_PER_ACTIVITY = 2;

/** Termíny doplněných akcí: 1. až 28. den po seedu. */
const DAYS = 28;

type VenueKind =
  | 'park'
  | 'trip'
  | 'hala'
  | 'hriste'
  | 'bazen'
  | 'studio'
  | 'kavarna'
  | 'pingpong';

/** Místo ve městě; `name` jde do názvu akce. Pražská místa mají městskou část. */
type Venue = { name: string; address: string; localitySlug?: string };

const VENUES: Record<
  (typeof REGIONAL_CITIES)[number],
  Partial<Record<VenueKind, Venue>>
> = {
  praha: {
    hriste: {
      name: 'Pankrác',
      address: 'Hřiště s umělou trávou, Na Pankráci, Praha 4',
      localitySlug: 'praha-4',
    },
    pingpong: {
      name: 'Žižkov',
      address: 'Herna stolního tenisu, Koněvova, Praha 3',
      localitySlug: 'praha-3',
    },
  },
  brno: {
    park: { name: 'Lužánky', address: 'Park Lužánky, vchod od Lidické, Brno' },
    trip: {
      name: 'Brněnská přehrada a hrad Veveří',
      address: 'Přístaviště Bystrc, Brno',
    },
    hala: { name: 'hala Vodova', address: 'Sportovní hala Vodova, Brno' },
    hriste: { name: 'Kraví hora', address: 'Hřiště Kraví hora, Brno' },
    bazen: { name: 'Kraví hora', address: 'Bazény Kraví hora, Brno' },
    studio: { name: 'Veveří', address: 'Jógové studio, Veveří, Brno' },
    kavarna: {
      name: 'Josefská',
      address: 'Herní kavárna, Josefská, Brno',
    },
    pingpong: {
      name: 'Žabovřesky',
      address: 'Herna stolního tenisu, Horova, Brno',
    },
  },
  ostrava: {
    park: {
      name: 'Komenského sady',
      address: 'Komenského sady, u Černé louky, Ostrava',
    },
    trip: {
      name: 'Landek a Hlučínské jezero',
      address: 'Sraz u Landek Parku, Ostrava-Petřkovice',
    },
    hala: {
      name: 'hala Varenská',
      address: 'Sportovní hala, Varenská, Ostrava',
    },
    hriste: {
      name: 'Bazaly',
      address: 'Hřiště s umělou trávou u Bazal, Ostrava',
    },
    bazen: { name: 'Sareza', address: 'Krytý bazén Sareza, Ostrava-Poruba' },
    studio: {
      name: 'Stodolní',
      address: 'Jógové studio, Stodolní, Ostrava',
    },
    kavarna: {
      name: 'Masarykovo náměstí',
      address: 'Herní kavárna u Masarykova náměstí, Ostrava',
    },
    pingpong: {
      name: 'Poruba',
      address: 'Herna stolního tenisu, Hlavní třída, Ostrava-Poruba',
    },
  },
  plzen: {
    park: { name: 'Borský park', address: 'Borský park, u Lochotína, Plzeň' },
    trip: {
      name: 'Radyně a Starý Plzenec',
      address: 'Nádraží Plzeň-Jižní Předměstí, Plzeň',
    },
    hala: {
      name: 'hala Lokomotiva',
      address: 'Sportovní hala Lokomotiva, Plzeň',
    },
    hriste: { name: 'Doubravka', address: 'Hřiště TJ Doubravka, Plzeň' },
    bazen: { name: 'Slovany', address: 'Plavecký bazén Slovany, Plzeň' },
    studio: { name: 'Americká', address: 'Jógové studio, Americká, Plzeň' },
    kavarna: {
      name: 'náměstí Republiky',
      address: 'Herní kavárna u náměstí Republiky, Plzeň',
    },
    pingpong: {
      name: 'Bory',
      address: 'Herna stolního tenisu, Klatovská, Plzeň',
    },
  },
  olomouc: {
    park: {
      name: 'Bezručovy sady',
      address: 'Bezručovy sady, u Mlýnského potoka, Olomouc',
    },
    trip: {
      name: 'Svatý Kopeček',
      address: 'Konečná tramvaje Svatý Kopeček, Olomouc',
    },
    hala: {
      name: 'Univerzitní hala',
      address: 'Univerzitní sportovní hala, Olomouc',
    },
    hriste: {
      name: 'Andrův stadion',
      address: 'Hřiště u Androva stadionu, Olomouc',
    },
    bazen: { name: 'Plavecký stadion', address: 'Plavecký stadion, Olomouc' },
    studio: {
      name: 'Horní náměstí',
      address: 'Jógové studio u Horního náměstí, Olomouc',
    },
    kavarna: {
      name: 'Ztracená',
      address: 'Herní kavárna, Ztracená, Olomouc',
    },
    pingpong: {
      name: 'Neředín',
      address: 'Herna stolního tenisu, Neředín, Olomouc',
    },
  },
  liberec: {
    park: {
      name: 'Harcovská přehrada',
      address: 'Hráz Harcovské přehrady, Liberec',
    },
    trip: {
      name: 'Ještěd',
      address: 'Konečná tramvaje Horní Hanychov, Liberec',
    },
    hala: { name: 'hala Dukla', address: 'Sportovní hala Dukla, Liberec' },
    hriste: { name: 'Ruprechtice', address: 'Hřiště v Ruprechticích, Liberec' },
    bazen: {
      name: 'Tržní náměstí',
      address: 'Městský bazén, Tržní náměstí, Liberec',
    },
    studio: {
      name: 'Šaldovo náměstí',
      address: 'Jógové studio, Šaldovo náměstí, Liberec',
    },
    kavarna: {
      name: 'Pražská',
      address: 'Herní kavárna, Pražská, Liberec',
    },
    pingpong: {
      name: 'Vesec',
      address: 'Herna stolního tenisu, Vesec, Liberec',
    },
  },
  'hradec-kralove': {
    park: {
      name: 'Jiráskovy sady',
      address: 'Jiráskovy sady, u soutoku Labe a Orlice, Hradec Králové',
    },
    trip: {
      name: 'Hradecké lesy',
      address: 'Sraz u Stříbrného rybníka, Hradec Králové',
    },
    hala: {
      name: 'hala Třebeš',
      address: 'Sportovní hala Třebeš, Hradec Králové',
    },
    hriste: {
      name: 'Malšovice',
      address: 'Hřiště v Malšovicích, Hradec Králové',
    },
    bazen: {
      name: 'Plavecký areál',
      address: 'Plavecký areál, Eliščino nábřeží, Hradec Králové',
    },
    studio: {
      name: 'Velké náměstí',
      address: 'Jógové studio u Velkého náměstí, Hradec Králové',
    },
    kavarna: {
      name: 'Masarykovo náměstí',
      address: 'Herní kavárna u Masarykova náměstí, Hradec Králové',
    },
    pingpong: {
      name: 'Slezské Předměstí',
      address: 'Herna stolního tenisu, Slezské Předměstí, Hradec Králové',
    },
  },
  pardubice: {
    park: { name: 'Bažantnice', address: 'Park Bažantnice, Pardubice' },
    trip: {
      name: 'Kunětická hora',
      address: 'Sraz u zastávky Ráby, Pardubice',
    },
    hala: {
      name: 'hala Dašická',
      address: 'Sportovní hala, Dašická, Pardubice',
    },
    hriste: { name: 'Polabiny', address: 'Hřiště v Polabinách, Pardubice' },
    bazen: {
      name: 'Aquacentrum',
      address: 'Plavecký bazén, Kotlářská, Pardubice',
    },
    studio: {
      name: 'Pernštýnské náměstí',
      address: 'Jógové studio u Pernštýnského náměstí, Pardubice',
    },
    kavarna: {
      name: 'třída Míru',
      address: 'Herní kavárna, třída Míru, Pardubice',
    },
    pingpong: {
      name: 'Dukla',
      address: 'Herna stolního tenisu, Dukla, Pardubice',
    },
  },
  'ceske-budejovice': {
    park: {
      name: 'Stromovka',
      address: 'Park Stromovka, u Malše, České Budějovice',
    },
    trip: {
      name: 'Hluboká nad Vltavou',
      address: 'Sraz u soutoku Malše a Vltavy, České Budějovice',
    },
    hala: {
      name: 'hala Sokol',
      address: 'Sportovní hala Sokol, České Budějovice',
    },
    hriste: {
      name: 'Suché Vrbné',
      address: 'Hřiště v Suchém Vrbném, České Budějovice',
    },
    bazen: {
      name: 'Plavecký stadion',
      address: 'Plavecký stadion, Sokolský ostrov, České Budějovice',
    },
    studio: {
      name: 'Lannova třída',
      address: 'Jógové studio, Lannova třída, České Budějovice',
    },
    kavarna: {
      name: 'Krajinská',
      address: 'Herní kavárna, Krajinská, České Budějovice',
    },
    pingpong: {
      name: 'Rožnov',
      address: 'Herna stolního tenisu, Rožnov, České Budějovice',
    },
  },
  'usti-nad-labem': {
    park: {
      name: 'Městské sady',
      address: 'Městské sady, u Mírového náměstí, Ústí nad Labem',
    },
    trip: {
      name: 'Střekov a Vrkoč',
      address: 'Sraz u Střekovského mostu, Ústí nad Labem',
    },
    hala: {
      name: 'hala Klíše',
      address: 'Sportovní hala Klíše, Ústí nad Labem',
    },
    hriste: {
      name: 'Severní Terasa',
      address: 'Hřiště na Severní Terase, Ústí nad Labem',
    },
    bazen: { name: 'Klíše', address: 'Plavecký bazén Klíše, Ústí nad Labem' },
    studio: {
      name: 'Mírové náměstí',
      address: 'Jógové studio u Mírového náměstí, Ústí nad Labem',
    },
    kavarna: {
      name: 'Hrnčířská',
      address: 'Herní kavárna, Hrnčířská, Ústí nad Labem',
    },
    pingpong: {
      name: 'Bukov',
      address: 'Herna stolního tenisu, Bukov, Ústí nad Labem',
    },
  },
  zlin: {
    park: { name: 'zámecký park', address: 'Zámecký park, Zlín' },
    trip: {
      name: 'Hostýnské vrchy',
      address: 'Autobusové nádraží Zlín, Zlín',
    },
    hala: {
      name: 'Městská hala',
      address: 'Městská sportovní hala, třída Tomáše Bati, Zlín',
    },
    hriste: { name: 'Vršava', address: 'Hřiště na Vršavě, Zlín' },
    bazen: {
      name: 'Zlín-Jižní Svahy',
      address: 'Krytý bazén, Jižní Svahy, Zlín',
    },
    studio: {
      name: 'náměstí Míru',
      address: 'Jógové studio u náměstí Míru, Zlín',
    },
    kavarna: { name: 'Kvítková', address: 'Herní kavárna, Kvítková, Zlín' },
    pingpong: {
      name: 'Malenovice',
      address: 'Herna stolního tenisu, Malenovice, Zlín',
    },
  },
  jihlava: {
    park: {
      name: 'Heulos',
      address: 'Lesopark Heulos, u zoo, Jihlava',
    },
    trip: {
      name: 'údolí Jihlávky',
      address: 'Sraz u Masarykova náměstí, Jihlava',
    },
    hala: {
      name: 'hala Horácký zimní stadion',
      address: 'Sportovní hala u Horáckého zimního stadionu, Jihlava',
    },
    hriste: {
      name: 'Stadion v Jiráskově',
      address: 'Hřiště u stadionu, Jiráskova, Jihlava',
    },
    bazen: { name: 'Evropská', address: 'Plavecký bazén, Evropská, Jihlava' },
    studio: {
      name: 'Masarykovo náměstí',
      address: 'Jógové studio u Masarykova náměstí, Jihlava',
    },
    kavarna: {
      name: 'Komenského',
      address: 'Herní kavárna, Komenského, Jihlava',
    },
    pingpong: {
      name: 'Horní Kosov',
      address: 'Herna stolního tenisu, Horní Kosov, Jihlava',
    },
  },
  'karlovy-vary': {
    park: {
      name: 'lázeňské lesy',
      address: 'Sraz u lanovky na Dianu, Karlovy Vary',
    },
    trip: {
      name: 'Loket a údolí Ohře',
      address: 'Nádraží Karlovy Vary dolní, Karlovy Vary',
    },
    hala: {
      name: 'KV Arena',
      address: 'Sportovní hala KV Arena, Karlovy Vary',
    },
    hriste: { name: 'Doubí', address: 'Hřiště v Doubí, Karlovy Vary' },
    bazen: {
      name: 'Alžbětiny lázně',
      address: 'Bazén Alžbětiny lázně, Karlovy Vary',
    },
    studio: {
      name: 'Tržiště',
      address: 'Jógové studio, Tržiště, Karlovy Vary',
    },
    kavarna: {
      name: 'Zeyerova',
      address: 'Herní kavárna, Zeyerova, Karlovy Vary',
    },
    pingpong: {
      name: 'Rybáře',
      address: 'Herna stolního tenisu, Rybáře, Karlovy Vary',
    },
  },
};

/** Jedna varianta akce; `title` dostane jméno místa. */
type Variant = {
  title: (venue: string) => string;
  description: string;
  time: string;
  durationMinutes: number;
  min: number;
  max: number;
  price?: number;
  level?: 'beginner' | 'advanced' | 'all';
  equipment?: string;
  approvalMode: 'open' | 'approval';
};

const TEMPLATES: Record<
  (typeof COMMON_ACTIVITIES)[number],
  { venue: VenueKind; variants: [Variant, Variant] }
> = {
  beh: {
    venue: 'park',
    variants: [
      {
        title: (v) => `Ranní běh – ${v}`,
        description:
          'Pohodový okruh kolem 6 km, tempo se přizpůsobí nejpomalejšímu. Na konci protažení, kdo chce.',
        time: '07:00',
        durationMinutes: 60,
        min: 2,
        max: 10,
        level: 'all',
        equipment: 'Běžecké boty',
        approvalMode: 'open',
      },
      {
        title: (v) => `Večerní běžecký trénink – ${v}`,
        description:
          'Intervaly a rovinky pro mírně pokročilé, rozcvičku vedu já. Zdarma, stačí chuť se zapotit.',
        time: '18:00',
        durationMinutes: 75,
        min: 3,
        max: 12,
        level: 'advanced',
        equipment: 'Běžecké boty, pití',
        approvalMode: 'open',
      },
    ],
  },
  turistika: {
    venue: 'trip',
    variants: [
      {
        title: (v) => `Výlet: ${v}`,
        description:
          'Kolem 15 km po značených cestách, tempo pro každého. Svačinu a pití si nese každý sám.',
        time: '09:00',
        durationMinutes: 360,
        min: 3,
        max: 15,
        level: 'all',
        equipment: 'Pevné boty, pláštěnka',
        approvalMode: 'open',
      },
      {
        title: (v) => `Odpolední procházka: ${v}`,
        description:
          'Kratší okruh kolem 8 km, vhodný i pro rodiče s většími dětmi. Cestou se zastavíme na kafe.',
        time: '13:00',
        durationMinutes: 210,
        min: 2,
        max: 12,
        level: 'beginner',
        equipment: 'Pohodlné boty',
        approvalMode: 'open',
      },
    ],
  },
  volejbal: {
    venue: 'hala',
    variants: [
      {
        title: (v) => `Volejbal – ${v}`,
        description:
          'Smíšený volejbal šest na šest, hrajeme na sety. Hala je zamluvená, platí se na místě.',
        time: '19:00',
        durationMinutes: 120,
        min: 6,
        max: 12,
        price: 100,
        level: 'all',
        equipment: 'Sálová obuv',
        approvalMode: 'open',
      },
      {
        title: (v) => `Volejbal pro pokročilé – ${v}`,
        description:
          'Rychlá hra pro ty, kdo zvládnou nahrávku i smeč. Napiš v žádosti, jak dlouho hraješ.',
        time: '20:00',
        durationMinutes: 120,
        min: 6,
        max: 12,
        price: 120,
        level: 'advanced',
        equipment: 'Sálová obuv, chrániče kolen',
        approvalMode: 'approval',
      },
    ],
  },
  badminton: {
    venue: 'hala',
    variants: [
      {
        title: (v) => `Badminton ve čtyřhrách – ${v}`,
        description:
          'Dva kurty, po každém setu mícháme dvojice. Košíčky zajistím, raketu si přines.',
        time: '18:00',
        durationMinutes: 90,
        min: 4,
        max: 8,
        price: 150,
        level: 'all',
        equipment: 'Raketa, sálová obuv',
        approvalMode: 'open',
      },
      {
        title: (v) => `Badminton pro začátečníky – ${v}`,
        description:
          'Naučíme se podání a základní údery, pak hrajeme volně. Rakety lze půjčit.',
        time: '17:00',
        durationMinutes: 60,
        min: 2,
        max: 6,
        price: 120,
        level: 'beginner',
        equipment: 'Sálová obuv',
        approvalMode: 'open',
      },
    ],
  },
  fotbal: {
    venue: 'hriste',
    variants: [
      {
        title: (v) => `Malá kopaná – ${v}`,
        description:
          'Hrajeme na umělé trávě čtyři na čtyři až sedm na sedm, podle toho, kolik nás přijde. Týmy losujeme na místě, rozlišovací dresy mám.',
        time: '18:30',
        durationMinutes: 90,
        min: 6,
        max: 14,
        price: 60,
        level: 'all',
        equipment: 'Kopačky na umělou trávu',
        approvalMode: 'open',
      },
      {
        title: (v) => `Fotbal pro radost – ${v}`,
        description:
          'Bez tabulek a bez hádek, hraje se na dvě malé branky. Vhodné i pro ty, kdo dlouho nehráli.',
        time: '17:30',
        durationMinutes: 90,
        min: 6,
        max: 12,
        price: 50,
        level: 'beginner',
        equipment: 'Sportovní obuv',
        approvalMode: 'open',
      },
    ],
  },
  florbal: {
    venue: 'hala',
    variants: [
      {
        title: (v) => `Florbal – ${v}`,
        description:
          'Smíšený florbal na celé hřiště, při větším počtu střídáme po třech minutách. Hokejky lze půjčit.',
        time: '20:00',
        durationMinutes: 90,
        min: 6,
        max: 14,
        price: 90,
        level: 'all',
        equipment: 'Sálová obuv',
        approvalMode: 'open',
      },
      {
        title: (v) => `Florbal pro pokročilé – ${v}`,
        description:
          'Rychlá hra pro ty, kdo hrají aspoň rok. Vlastní hokejka a sálová obuv nutné.',
        time: '19:00',
        durationMinutes: 90,
        min: 6,
        max: 12,
        price: 100,
        level: 'advanced',
        equipment: 'Hokejka, sálová obuv',
        approvalMode: 'approval',
      },
    ],
  },
  joga: {
    venue: 'studio',
    variants: [
      {
        title: (v) => `Ranní jóga – ${v}`,
        description:
          'Hodina pomalé vinyasy pro probuzení těla. Podložky jsou na místě, stačí pohodlné oblečení.',
        time: '07:30',
        durationMinutes: 60,
        min: 2,
        max: 12,
        price: 150,
        level: 'all',
        approvalMode: 'open',
      },
      {
        title: (v) => `Jóga pro začátečníky – ${v}`,
        description:
          'Základní pozice a dýchání krok za krokem. Žádné zkušenosti nejsou potřeba.',
        time: '18:00',
        durationMinutes: 75,
        min: 3,
        max: 10,
        price: 180,
        level: 'beginner',
        equipment: 'Pohodlné oblečení',
        approvalMode: 'open',
      },
    ],
  },
  'deskove-hry': {
    venue: 'kavarna',
    variants: [
      {
        title: (v) => `Deskovky pro nováčky – ${v}`,
        description:
          'Lehčí hry, které vysvětlíme za pět minut. Přijď sám nebo s kamarády, místo u stolu se najde.',
        time: '18:30',
        durationMinutes: 180,
        min: 3,
        max: 10,
        level: 'beginner',
        approvalMode: 'open',
      },
      {
        title: (v) => `Večer strategických her – ${v}`,
        description:
          'Jedna delší strategická hra na celý večer, pravidla pošlu předem. Pro ty, kdo se nebojí tlustých pravidel.',
        time: '18:00',
        durationMinutes: 240,
        min: 3,
        max: 5,
        level: 'advanced',
        approvalMode: 'approval',
      },
    ],
  },
  'stolni-tenis': {
    venue: 'pingpong',
    variants: [
      {
        title: (v) => `Stolní tenis – ${v}`,
        description:
          'Hrajeme na čtyřech stolech, soupeře střídáme každých patnáct minut. Pálky lze půjčit.',
        time: '18:00',
        durationMinutes: 120,
        min: 2,
        max: 8,
        price: 80,
        level: 'all',
        equipment: 'Sálová obuv',
        approvalMode: 'open',
      },
      {
        title: (v) => `Pingpongový turnaj – ${v}`,
        description:
          'Malý turnaj každý s každým, pak volná hra. Přihlas se, ať víme, kolik stolů zamluvit.',
        time: '17:00',
        durationMinutes: 180,
        min: 4,
        max: 8,
        price: 100,
        level: 'advanced',
        equipment: 'Vlastní pálka',
        approvalMode: 'approval',
      },
    ],
  },
  plavani: {
    venue: 'bazen',
    variants: [
      {
        title: (v) => `Ranní plavání – ${v}`,
        description:
          'Plaveme vlastním tempem, dráha je zamluvená pro nás. Po plavání káva, kdo chce.',
        time: '06:30',
        durationMinutes: 60,
        min: 2,
        max: 8,
        price: 90,
        level: 'all',
        equipment: 'Plavky, brýle',
        approvalMode: 'open',
      },
      {
        title: (v) => `Plavecký trénink – ${v}`,
        description:
          'Technika kraulu a pár sérií podle tréninkového plánu. Pro ty, kdo uplavou kilometr.',
        time: '19:00',
        durationMinutes: 75,
        min: 3,
        max: 8,
        price: 110,
        level: 'advanced',
        equipment: 'Plavky, brýle, ploutve',
        approvalMode: 'approval',
      },
    ],
  },
};

const isPrague = (slug: string): boolean =>
  slug === 'praha' || slug.startsWith('praha-');
const cityOf = (slug: string): string => (isPrague(slug) ? 'praha' : slug);

type Occupancy = 'chybi' | 'volno' | 'plno';

/** Schválení podle obsazenosti: chybí jeden, volno = minimum až o dva víc (pod kapacitou), plno = kapacita. */
const approvedFor = (
  state: Occupancy,
  variant: Variant,
  key: string,
): number =>
  state === 'plno'
    ? variant.max
    : state === 'chybi'
      ? variant.min - 1
      : variant.min +
        (stableHash(key) % Math.min(3, variant.max - variant.min));

/**
 * Plány akcí, které krajským městům chybí do MIN_EVENTS_PER_ACTIVITY u běžných
 * aktivit. `existing` jsou nadcházející veřejné akce, které už v datech jsou
 * (demo i komunita), `organizerDays` dny, kdy už kdo pořádá akci.
 */
export function buildRegionalPlans(
  users: CommunityUser[],
  existing: {
    localitySlug: string;
    activitySlug: string;
    days?: number;
    approved?: number;
  }[],
  organizerDays: Map<string, Set<number>>,
  /** Kraj lokality a kraje, odkud se na akci jezdí (vlastní + sousední). */
  regions: { of: (slug: string) => string; near: (slug: string) => string[] },
): CommunityEventPlan[] {
  const busy = new Map(
    [...organizerDays].map(([key, days]) => [key, new Set(days)]),
  );
  const load = new Map<string, number>();
  const plans: CommunityEventPlan[] = [];
  // kolik lidí kraj který den už potřebuje: nové akce jdou na dny, kdy v kraji
  // a sousedních krajích zbývá z koho brát účastníky
  const demand = new Map<string, number>();
  const regionDay = (region: string, day: number): string => `${region} ${day}`;
  const addDemand = (slug: string, day: number, people: number): void => {
    const k = regionDay(regions.of(slug), day);
    demand.set(k, (demand.get(k) ?? 0) + people);
  };
  const demandNear = (slug: string, day: number): number =>
    regions
      .near(slug)
      .reduce(
        (sum, region) => sum + (demand.get(regionDay(region, day)) ?? 0),
        0,
      );
  for (const e of existing) {
    if (e.days !== undefined)
      addDemand(e.localitySlug, e.days, (e.approved ?? 0) + 1);
  }

  for (const city of REGIONAL_CITIES) {
    const locals = users.filter(
      (u) => u.emailVerified && cityOf(u.homeLocalitySlug) === city,
    );
    for (const activity of COMMON_ACTIVITIES) {
      const have = existing.filter(
        (e) => cityOf(e.localitySlug) === city && e.activitySlug === activity,
      ).length;
      const template = TEMPLATES[activity];
      let previous: Occupancy | undefined;
      for (let i = have; i < MIN_EVENTS_PER_ACTIVITY; i++) {
        const venue = VENUES[city][template.venue];
        if (!venue) throw new Error(`No ${template.venue} venue in ${city}`);
        const variant = template.variants[i % template.variants.length];
        const key = `r-${city}-${activity}-${i}`;

        const states: Occupancy[] = isPrague(city)
          ? ['volno', 'plno']
          : ['volno', 'chybi', 'plno', 'volno'];
        let state = states[stableHash(key) % states.length];
        // plná akce s velkou kapacitou by vyčerpala lidi z kraje
        if (state === 'plno' && (previous === 'plno' || variant.max > 8))
          state = 'volno';
        previous = state;

        const organizer = [...locals].sort(
          (a, b) =>
            Number(b.interestSlugs.includes(activity)) -
              Number(a.interestSlugs.includes(activity)) ||
            (load.get(a.key) ?? 0) - (load.get(b.key) ?? 0) ||
            stableHash(key + a.key) - stableHash(key + b.key),
        )[0];
        if (!organizer) throw new Error(`No organizer in ${city}`);
        const taken = busy.get(organizer.key) ?? new Set<number>();
        const start = stableHash(key) % DAYS;
        const days = Array.from(
          { length: DAYS },
          (_, d) => ((start + d) % DAYS) + 1,
        )
          .filter((day) => !taken.has(day))
          .sort((a, b) => demandNear(city, a) - demandNear(city, b))[0];
        busy.set(organizer.key, taken.add(days));
        load.set(organizer.key, (load.get(organizer.key) ?? 0) + 1);

        const approved = approvedFor(state, variant, key);
        addDemand(city, days, approved + 1);
        plans.push({
          key,
          title: variant.title(venue.name),
          description: variant.description,
          activitySlug: activity,
          localitySlug: venue.localitySlug ?? city,
          address: venue.address,
          days,
          time: variant.time,
          durationMinutes: variant.durationMinutes,
          min: variant.min,
          max: variant.max,
          price: variant.price,
          level: variant.level,
          equipment: variant.equipment,
          approvalMode: variant.approvalMode,
          organizerKey: organizer.key,
          approved,
          pending:
            variant.approvalMode === 'approval' && approved < variant.max
              ? 1
              : undefined,
        });
      }
    }
  }
  return plans;
}
