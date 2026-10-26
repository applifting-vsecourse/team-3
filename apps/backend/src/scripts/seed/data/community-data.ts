import { czechTowns } from './czech-towns';
import {
  DemoActivitySlug,
  DemoEvent,
  DemoGroup,
  demoLocalities,
} from './demo-data';

/**
 * Komunita HobbyHubu: 100 uživatelů po celém Česku, jejich akce a skupiny.
 * Aplikace má vypadat jako produkt, který už lidé používají – ne jako školní
 * ukázka se čtyřmi demo účty. Data #47 (demo-data.ts) zůstávají beze změny;
 * tohle je samostatná vrstva, kterou seed vloží jednou (seed/seed-community.ts).
 *
 * Pravidla, která chrání živé demo (#47) a hlídá community-data.spec.ts:
 * - Komunitní uživatelé se účastní jen komunitních akcí a skupin, nikdy těch z demo-data.ts.
 * - Žádná komunitní akce v Praze nebo pražském obvodu nesmí v prvních 8 dnech po seedu
 *   „chybět lidi“ (méně schválených než minimum): ukázka filtru Chybí lidé + Příštích
 *   7 dní musí jako první kartu ukázat „Volejbal na Pankráci – chybí jeden“.
 *   Pražské akce pod minimem jsou až od 9. dne.
 * - E-maily a uživatelská jména se nekříží s demo účty.
 * - Názvy akcí neobsahují dny v týdnu ani stav obsazenosti – termíny jsou relativní
 *   k okamžiku seedu a stav ukazuje aplikace sama.
 *
 * Účastníci a členové skupin se vybírají deterministicky (bez náhody): nejdřív lidé ze
 * stejného města, pak z kraje, přednost mají ti se zájmem o danou aktivitu. Nikdo nemá
 * dvě akce v jeden den, organizátor se do účastníků nepočítá a neověřené účty (5) se
 * na nic nehlásí.
 */

export type CommunityUser = {
  key: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  bio: string;
  homeLocalitySlug: string;
  interestSlugs: DemoActivitySlug[];
};

export type CommunityEvent = Omit<
  DemoEvent,
  'localitySlug' | 'scenario' | 'demoCase' | 'schedule'
> & {
  localitySlug: string;
  schedule: { daysFromNow: number; time: string };
};

export type CommunityGroup = Omit<DemoGroup, 'localitySlug'> & {
  localitySlug: string;
};

// ---------------------------------------------------------------------------
// Uživatelé
// ---------------------------------------------------------------------------

const ascii = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const person = (
  name: string,
  homeLocalitySlug: string,
  interestSlugs: DemoActivitySlug[],
  bio: string,
  options: { unverified?: boolean } = {},
): CommunityUser => {
  const username = ascii(name).replace(/ /g, '.');
  return {
    key: username,
    name,
    username,
    email: `${username}@example.com`,
    emailVerified: !options.unverified,
    bio,
    homeLocalitySlug,
    interestSlugs,
  };
};

const unverified = { unverified: true };

export const communityUsers: CommunityUser[] = [
  // Praha a obvody (30)
  person(
    'Jana Vávrová',
    'praha-2',
    ['joga', 'beh', 'ctenarsky-klub'],
    'Učím češtinu na gymnáziu na Vinohradech. Po práci jóga, o víkendu dlouhý běh a jednou za měsíc čtenářský klub.',
  ),
  person(
    'Ondřej Kratochvíl',
    'praha-4',
    ['volejbal', 'badminton', 'beh'],
    'Programátor z Nuslí. Volejbal hraju od střední a hledám partu, se kterou se dá hrát pravidelně.',
  ),
  person(
    'Kateřina Bartošová',
    'praha-3',
    ['tanec', 'spolecne-vareni', 'jazykovy-tandem'],
    'Na Žižkově bydlím třetím rokem. Tancuju salsu, ráda vařím pro víc lidí a učím se španělsky.',
  ),
  person(
    'Lukáš Hrubý',
    'praha-10',
    ['florbal', 'fotbal', 'pub-kviz'],
    'Ve Vršovicích dávám dohromady florbal a pub kvízy. Uvítal bych opakované akce – každý týden zakládám tu samou ručně.',
  ),
  person(
    'Michaela Pešková',
    'praha-5',
    ['lezeni', 'turistika', 'fotografie'],
    'Lezu na Smíchově, o víkendech jezdím do Českého ráje. Fotím hlavně skály a lidi na nich.',
  ),
  person(
    'Tomáš Bureš',
    'praha-6',
    ['tenis', 'squash', 'golf'],
    'Pracuju v Dejvicích, tenis hraju od dětství. Hledám spoluhráče na čtyřhru, ideálně na pravidelný termín.',
  ),
  person(
    'Barbora Machová',
    'praha-7',
    ['deskove-hry', 'karetni-hry', 'rpg'],
    'Deskovky jsou můj večerní rituál. Doma v Holešovicích mám přes sto krabic a ráda každou vysvětlím.',
  ),
  person(
    'Jakub Vondráček',
    'praha-8',
    ['beh', 'cyklistika', 'workout'],
    'Do práce jezdím na kole z Libně, ráno běhám Stromovkou. Rád přiberu někoho, kdo s tím začíná.',
  ),
  person(
    'Petra Kalinová',
    'praha-9',
    ['plavani', 'joga', 'sborovy-zpev'],
    'Máma dvou kluků z Vysočan. Když děti spí, chodím plavat, a jednou týdně zpívám ve sboru.',
  ),
  person(
    'Martin Sýkora',
    'praha-6',
    ['basketbal', 'florbal', 'videohry'],
    'Studuju na ČVUT a basket hraju za kolej. Rád si zahraju i se staršími, kteří ještě umí.',
  ),
  person(
    'Adéla Kadlecová',
    'praha-1',
    ['jazykovy-tandem', 'ctenarsky-klub', 'fotografie'],
    'Pracuju v galerii na Starém Městě. Ráda mluvím anglicky a italsky a sbírám tipy na knihy.',
  ),
  person(
    'Vojtěch Matoušek',
    'praha-5',
    ['lezeni', 'cyklistika', 'vodactvi'],
    'Instruktor lezení na Smíchově. Uvítal bych statistiky, kdo z mých lidí chodí pravidelně a kdo jen jednou.',
  ),
  person(
    'Lenka Šindelářová',
    'praha-4',
    ['badminton', 'plavani', 'joga'],
    'Účetní z Krče, badminton je můj ventil. Hraju rekreačně, ale ráda se zlepšuju.',
  ),
  person(
    'Filip Hanák',
    'praha-3',
    ['pub-kviz', 'deskove-hry', 'debatni-klub'],
    'Na Žižkově znám každou hospodu s kvízem. Hledám lidi do týmu, kteří vědí něco o sportu a zeměpisu.',
  ),
  person(
    'Zuzana Staňková',
    'praha-2',
    ['joga', 'tanec', 'kresleni'],
    'Lektorka jógy. Uvítala bych, kdyby šlo za lekce platit předem přes aplikaci – hotovost na místě je otrava.',
  ),
  person(
    'Radek Tichý',
    'praha-11',
    ['beh', 'cyklistika', 'turistika'],
    'Z Chodova to mám kousek do Kunratického lesa. Běhám půlmaratony a o víkendu rád vyrazím na výlet.',
  ),
  person(
    'Simona Vacková',
    'praha-13',
    ['volejbal', 'beh', 'workout'],
    'Ze Stodůlek dojíždím na volejbal přes celou Prahu. Ráda bych našla partu i blíž domovu.',
  ),
  person(
    'Jiří Jireš',
    'praha-7',
    ['fotografie', 'turistika', 'sachy'],
    'Jsem v důchodu a mám konečně čas. Fotím Prahu, chodím na výlety a v knihovně hraju šachy.',
  ),
  person(
    'Eliška Hronková',
    'praha-8',
    ['komunitni-zahrada', 'spolecne-vareni', 'pomoc-v-utulku'],
    'V Karlíně pěstuju rajčata na komunitní zahradě a o víkendech venčím psy z útulku v Troji.',
  ),
  person(
    'Daniel Pavlík',
    'praha-9',
    ['ledni-hokej', 'florbal', 'fotbal'],
    'Hokej hraju od pěti let, teď už jen pro radost. Ve Vysočanech sháním lidi na pravidelný led.',
  ),
  person(
    'Tereza Kubíčková',
    'praha-6',
    ['ultimate', 'beh', 'lezeni'],
    'Studentka medicíny. Ultimate jsem objevila na Erasmu ve Finsku a v Praze hledám tým.',
  ),
  person(
    'Petr Charvát',
    'praha-10',
    ['ledni-hokej', 'tenis', 'golf'],
    'Vedu malou firmu ve Strašnicích. Uvítal bych platbu za led předem přes aplikaci, vybírat od dvaceti lidí je práce navíc.',
  ),
  person(
    'Karolína Sedláčková',
    'praha-12',
    ['brusleni', 'plavani', 'turistika'],
    'Máma tříleté holčičky z Modřan. Hledám rodiny na bruslení a nenáročné výlety s kočárkem.',
  ),
  person(
    'Ondřej Ševčík',
    'praha-4',
    ['squash', 'beh', 'tenis'],
    'Přistěhoval jsem se z Brna kvůli práci a v Praze zatím nikoho neznám. Squash a běh jsou dobrý začátek.',
  ),
  person(
    'Markéta Wagnerová',
    'praha-5',
    ['jazykovy-tandem', 'tanec', 'ctenarsky-klub'],
    'Překladatelka z němčiny. Na tandemech pomáhám s češtinou a sama se učím norsky.',
  ),
  person(
    'Václav Zelenka',
    'praha-3',
    ['uklid-prirody', 'komunitni-zahrada', 'sousedska-pomoc'],
    'Sousedskou pomoc na Žižkově organizuju od covidu. Úklidy a zahrada jsou nejlepší způsob, jak poznat sousedy.',
  ),
  person(
    'Nela Hudcová',
    'praha-14',
    ['tanec', 'workout', 'unikove-hry'],
    'Z Černého Mostu to mám všude daleko, ale za dobrou partou dojedu. Baví mě únikovky a tanec.',
  ),
  person(
    'Josef Řezníček',
    'praha',
    ['sachy', 'ctenarsky-klub', 'turistika'],
    'Bývalý učitel matematiky, šachy hraju přes padesát let. Rád naučím i úplné začátečníky.',
  ),
  person(
    'Hana Bártová',
    'praha-6',
    ['joga', 'turistika', 'sborovy-zpev'],
    'Právě jsem se zaregistrovala, kamarádka mi HobbyHub doporučila kvůli józe.',
    unverified,
  ),
  person(
    'Jan Polák',
    'praha-8',
    ['florbal', 'basketbal', 'pub-kviz'],
    'Nový v Libni, zatím se rozhlížím, kde se co hraje.',
    unverified,
  ),

  // Brno (9)
  person(
    'Pavla Žáková',
    'brno',
    ['volejbal', 'beh', 'jazykovy-tandem'],
    'Brňačka, co se vrátila z Vídně. Volejbal hraju za firemní tým a v neděli běhám kolem přehrady.',
  ),
  person(
    'Tomáš Mareš',
    'brno',
    ['deskove-hry', 'pub-kviz', 'rpg'],
    'Vedu deskoherní večery v Podnebí. Uvítal bych opakované akce a seznam stálých hráčů, ať nepíšu každému zvlášť.',
  ),
  person(
    'Veronika Vojtíšková',
    'brno',
    ['joga', 'plavani', 'ctenarsky-klub'],
    'Fyzioterapeutka ze Žabovřesk. Jógu vedu pro lidi se sedavou prací, ať vědí, co dělat se zády.',
  ),
  person(
    'Michal Sláma',
    'brno',
    ['cyklistika', 'beh', 'turistika'],
    'Na kole jezdím do Moravského krasu skoro každý víkend. Tempo přizpůsobím skupině.',
  ),
  person(
    'Klára Linhartová',
    'brno',
    ['badminton', 'tenis', 'tanec'],
    'Studuju na Masarykově univerzitě. Badminton hraju rekreačně a ráda poznám lidi mimo fakultu.',
  ),
  person(
    'Radim Kuchař',
    'brno',
    ['volejbal', 'florbal', 'fotbal'],
    'Trenér mládeže ve Vodově. Dospělácký volejbal je pro mě odpočinek – tam netrénuju, tam hraju.',
  ),
  person(
    'Aneta Dvorská',
    'brno',
    ['pub-kviz', 'deskove-hry', 'debatni-klub'],
    'Knihovnice, takže na kvízech beru literaturu a historii. Hledám tým, který nebere prohru vážně.',
  ),
  person(
    'Marek Hruška',
    'brno',
    ['beh', 'atletika', 'workout'],
    'Běhám maratony a trénuju v Lužánkách. Uvítal bych statistiky docházky – kolik lidí se přihlásí a kolik opravdu dorazí.',
  ),
  person(
    'Adam Pospíchal',
    'brno',
    ['workout', 'beh', 'bojova-umeni'],
    'V Brně jsem nový, dělám thajský box a hledám, s kým běhat.',
    unverified,
  ),

  // Ostrava (5)
  person(
    'Lucie Kubalová',
    'ostrava',
    ['turistika', 'fotografie', 'uklid-prirody'],
    'Ostravu mám ráda i s haldami. Chodím po Beskydech a fotím industriál.',
  ),
  person(
    'Roman Šebesta',
    'ostrava',
    ['florbal', 'ledni-hokej', 'fotbal'],
    'Pracuju ve Vítkovicích na směny, sport plánuju podle rozpisu. Florbal v Porubě je stálice.',
  ),
  person(
    'Iveta Bílková',
    'ostrava',
    ['jam-session', 'sborovy-zpev', 'tanec'],
    'Hraju na baskytaru a hledám lidi na jam. Dolní oblast Vítkovice je pro to ideální místo.',
  ),
  person(
    'Stanislav Krupa',
    'ostrava',
    ['uklid-prirody', 'sousedska-pomoc', 'turistika'],
    'Senior z Poruby. Úklidy dělám s vnoučaty a rád přivítám každého, kdo přiloží ruku k dílu.',
  ),
  person(
    'Denisa Holišová',
    'ostrava',
    ['florbal', 'volejbal', 'workout'],
    'Studuju na VŠB, florbal hraju od základky. Ráda si zahraju i ve smíšeném týmu.',
  ),

  // Plzeň (4)
  person(
    'Jaroslav Kořínek',
    'plzen',
    ['beh', 'cyklistika', 'turistika'],
    'Běhám kolem Boleveckého rybníka ráno i večer. Hledám někoho, kdo vydrží tempo pod pět minut.',
  ),
  person(
    'Gabriela Fišerová',
    'plzen',
    ['volejbal', 'plavani', 'joga'],
    'Plzeňačka, volejbal hraju za Lokomotivu v krajském přeboru a mimo sezonu ráda rekreačně.',
  ),
  person(
    'Patrik Soukup',
    'plzen',
    ['badminton', 'stolni-tenis', 'videohry'],
    'Ajťák ze Slovan. Badminton jsem začal hrát před rokem a pořád hledám lidi na stejné úrovni.',
  ),
  person(
    'Monika Brabcová',
    'plzen',
    ['volejbal', 'sachy', 'ctenarsky-klub'],
    'Do Plzně jsem se přestěhovala minulý týden a zatím se rozkoukávám.',
    unverified,
  ),

  // Olomouc (4)
  person(
    'Kristýna Paurová',
    'olomouc',
    ['jazykovy-tandem', 'ultimate', 'kresleni'],
    'Studuju anglistiku na Univerzitě Palackého a pořádám tandemy se studenty z Erasmu.',
  ),
  person(
    'Viktor Tomek',
    'olomouc',
    ['ultimate', 'beh', 'cyklistika'],
    'Ultimate hraju šest let a v Bezručových sadech učíme nováčky. Uvítal bych, kdyby šla akce zopakovat každý týden jedním klikem.',
  ),
  person(
    'Dagmar Machalová',
    'olomouc',
    ['stolni-tenis', 'sachy', 'turistika'],
    'V důchodu hraju stolní tenis s bývalými kolegy z nemocnice. Nováčci jsou vítaní.',
  ),
  person(
    'Matyáš Doubrava',
    'olomouc',
    ['ultimate', 'florbal', 'deskove-hry'],
    'Gymnazista z Olomouce, ultimate hraju s bráchou. Hledám spoluhráče i mimo školu.',
  ),

  // Liberec (3)
  person(
    'Šárka Medková',
    'liberec',
    ['turistika', 'zimni-sporty', 'lezeni'],
    'Liberecká rodačka, na Ještěd chodím pěšky i v zimě. Ráda vezmu nováčky do Jizerek.',
  ),
  person(
    'Libor Hampl',
    'liberec',
    ['florbal', 'cyklistika', 'uklid-prirody'],
    'Na technice učím strojaře, po práci florbal. Uvítal bych platby přes aplikaci – halu platím vždycky já a pak to vybírám.',
  ),
  person(
    'Renata Krausová',
    'liberec',
    ['plavani', 'turistika', 'ctenarsky-klub'],
    'Zdravotní sestra na směny. Na výlety chodím, kdy to rozpis dovolí.',
  ),

  // Hradec Králové (3)
  person(
    'Jakub Šafránek',
    'hradec-kralove',
    ['beh', 'volejbal', 'pub-kviz'],
    'Hradecký patriot, běhám kolem Stříbrného rybníka a v létě hraju beach.',
  ),
  person(
    'Alena Fojtíková',
    'hradec-kralove',
    ['volejbal', 'joga', 'plavani'],
    'Učitelka tělocviku. Volejbal je moje srdcovka, ráda poradím i začátečníkům.',
  ),
  person(
    'Miroslav Hofman',
    'hradec-kralove',
    ['pub-kviz', 'sachy', 'fotografie'],
    'Kvízy píšu i moderuju. Uvítal bych přehled, kolik lidí chodí na moje akce opakovaně, ať vím, co funguje.',
  ),

  // Pardubice (3)
  person(
    'Lukáš Kopřiva',
    'pardubice',
    ['ledni-hokej', 'cyklistika', 'fotbal'],
    'Amatérský hokej v enteria areně držíme pohromadě deset let. Brankáře sháníme vždycky.',
  ),
  person(
    'Eva Štěpánková',
    'pardubice',
    ['cyklistika', 'turistika', 'deskove-hry'],
    'Na kole jezdím s dětmi, na Kunětickou horu to zvládne i šestiletý.',
  ),
  person(
    'Martin Pšenička',
    'pardubice',
    ['atletika', 'beh', 'ledni-hokej'],
    'Trénuju atletiku v Pardubicích. Na závodech v Ústí rád pomůžu s měřením časů.',
  ),

  // České Budějovice (3)
  person(
    'Ivana Šimonová',
    'ceske-budejovice',
    ['sborovy-zpev', 'joga', 'ctenarsky-klub'],
    'Sbormistryně z Budějovic. Zpíváme všechno od Rybovky po pop a noty nejsou podmínka.',
  ),
  person(
    'Pavel Brož',
    'ceske-budejovice',
    ['florbal', 'beh', 'fotbal'],
    'Florbal hraju za firmu a v tělocvičně na Jírovcově máme halu. Hledáme stálé hráče.',
  ),
  person(
    'Tereza Hejduková',
    'ceske-budejovice',
    ['beh', 'plavani', 'joga'],
    'Ráno běhám Stromovkou, než otevřu kavárnu. Na tempu nezáleží.',
  ),

  // Ústí nad Labem (2)
  person(
    'Zdeněk Bauer',
    'usti-nad-labem',
    ['sachy', 'turistika', 'deskove-hry'],
    'Šachy učím děti v kroužku a dospělé po večerech. Na Větruši chodím každý týden.',
  ),
  person(
    'Jitka Vaňková',
    'usti-nad-labem',
    ['turistika', 'fotografie', 'joga'],
    'Do Ústí jsem se přestěhovala za prací v nemocnici. Hledám parťáky na výlety po Českém středohoří.',
  ),

  // Pardubický kraj (7)
  person(
    'Petr Hejl',
    'usti-nad-orlici',
    ['atletika', 'beh', 'cyklistika'],
    'Vedu atletický oddíl v Ústí nad Orlicí. Uvítal bych výsledkovou listinu a statistiky přímo u závodu, teď je píšu do tabulky.',
  ),
  person(
    'Marie Kosová',
    'usti-nad-orlici',
    ['atletika', 'beh', 'turistika'],
    'Máma dvou malých atletů. Na závodech dělám rozhodčí a občas si taky zaběhnu.',
  ),
  person(
    'Dominik Pražák',
    'usti-nad-orlici',
    ['stolni-tenis', 'florbal', 'videohry'],
    'Hraju stolní tenis za TJ Jiskra. Rád si zahraju i s lidmi, kteří pálku drží poprvé.',
  ),
  person(
    'Božena Kalousová',
    'usti-nad-orlici',
    ['turistika', 'sborovy-zpev', 'rukodelna-dilna'],
    'Jsem v důchodu, chodím s místními turisty a zpívám v chrámovém sboru.',
  ),
  person(
    'Radka Junková',
    'ceska-trebova',
    ['zimni-sporty', 'beh', 'cyklistika'],
    'Lyžuju na Pekláku od dětství a teď tam trénuju malé lyžaře.',
  ),
  person(
    'Aleš Mikulka',
    'chocen',
    ['cyklistika', 'rybareni', 'turistika'],
    'Z Chocně jezdím na kole podél Orlice. V létě rybařím, na podzim šlapu.',
  ),
  person(
    'Hedvika Rybová',
    'litomysl',
    ['fotografie', 'kresleni', 'turistika'],
    'Fotím architekturu a Litomyšl je k tomu ideální. Ráda poradím s nastavením foťáku.',
  ),

  // Zlínský kraj (5)
  person(
    'Jan Zbořil',
    'zlin',
    ['ledni-hokej', 'beh', 'cyklistika'],
    'Na Luďka Čajky hraju hokej s kamarády z univerzity. Uvítal bych, kdyby šel nájem ledu rozpočítat a vybrat přímo v aplikaci.',
  ),
  person(
    'Andrea Vaculíková',
    'zlin',
    ['deskove-hry', 'karetni-hry', 'ctenarsky-klub'],
    'Knihovnice z Baťova institutu. Deskovky u nás půjčujeme, tak je hrajeme i spolu.',
  ),
  person(
    'Robert Mikeska',
    'zlin',
    ['geocaching', 'turistika', 'fotografie'],
    'Kešky hledám po celých Vizovických vrších. Výlety plánuju tak, aby se cestou dalo něco najít.',
  ),
  person(
    'Ludmila Gajdošová',
    'uherske-hradiste',
    ['spolecne-vareni', 'sborovy-zpev', 'rukodelna-dilna'],
    'Peču koláčky po babičce a ráda to naučím každého, kdo má s těstem trpělivost.',
  ),
  person(
    'Tomáš Klimek',
    'uherske-hradiste',
    ['volejbal', 'vodactvi', 'cyklistika'],
    'Na Baťově kanále jezdím na kánoi a v zimě hraju volejbal. Spoluhráči vítáni.',
  ),

  // Vysočina (3)
  person(
    'Irena Plachá',
    'jihlava',
    ['plavani', 'joga', 'turistika'],
    'Plavu každé ráno před prací. Ve dvou nebo ve třech je to veselejší.',
  ),
  person(
    'Jakub Trnka',
    'jihlava',
    ['florbal', 'fotbal', 'pub-kviz'],
    'Přestěhoval jsem se do Jihlavy za přítelkyní a hledám, kde si zahrát florbal.',
  ),
  person(
    'Miloš Bednář',
    'trebic',
    ['cyklistika', 'turistika', 'rybareni'],
    'Na kole objíždím Vysočinu tam, kudy jezdí málokdo. Trasy mám připravené v mapě.',
  ),

  // Karlovarský kraj (2)
  person(
    'Olga Benediktová',
    'karlovy-vary',
    ['turistika', 'joga', 'ctenarsky-klub'],
    'Lázeňská lékařka, ráda chodím kolem Diany a na Tři kříže.',
  ),
  person(
    'Štěpán Kolínský',
    'karlovy-vary',
    ['badminton', 'squash', 'stolni-tenis'],
    'Badminton hraju v KV Areně a hledám čtyřhru na stejné úrovni.',
  ),

  // Středočeský kraj (5)
  person(
    'Veronika Holá',
    'kolin',
    ['beh', 'pub-kviz', 'tanec'],
    'Kolínská máma, běhám kolem Kmochova ostrova a jednou za měsíc si dám kvíz s kamarádkami.',
  ),
  person(
    'David Toman',
    'kolin',
    ['pub-kviz', 'deskove-hry', 'fotbal'],
    'Zaregistroval jsem se kvůli kvízům v Kolíně.',
    unverified,
  ),
  person(
    'Marcela Pilná',
    'kutna-hora',
    ['fotografie', 'turistika', 'kresleni'],
    'Průvodkyně v chrámu sv. Barbory. Ukážu vám místa, která turisté nevidí.',
  ),
  person(
    'Jaromír Vítek',
    'kladno',
    ['florbal', 'ledni-hokej', 'fotbal'],
    'Kladenský florbal pro dospělé držím při životě už pátý rok.',
  ),
  person(
    'Simona Kuncová',
    'mlada-boleslav',
    ['tanec', 'joga', 'unikove-hry'],
    'Pracuju v Mladé Boleslavi ve vývoji a po směně chodím tančit salsu.',
  ),

  // Jižní Čechy (4)
  person(
    'Karel Kotrba',
    'tabor',
    ['beh', 'sachy', 'turistika'],
    'Táborák od narození, běhám kolem Jordánu a v kavárně hraju šachy.',
  ),
  person(
    'Lucie Švecová',
    'tabor',
    ['beh', 'joga', 'plavani'],
    'Do Tábora jsem se vrátila z Prahy a sháním lidi na běhání.',
  ),
  person(
    'Vladimír Řehoř',
    'pisek',
    ['volejbal', 'turistika', 'rybareni'],
    'Volejbal v Písku hrajeme už dvacet let, teď hledáme mladší krev.',
  ),
  person(
    'Jarmila Kroupová',
    'pisek',
    ['turistika', 'sousedska-pomoc', 'sborovy-zpev'],
    'V důchodu vedu procházky pro seniory podél Otavy. Tempo je pohodové, zastávky časté.',
  ),

  // Sever a východ (5)
  person(
    'Filip Lukeš',
    'trutnov',
    ['turistika', 'zimni-sporty', 'cyklistika'],
    'Horská služba mě naučila, že na hory se nechodí sám. Rád vezmu parťáky.',
  ),
  person(
    'Erik Schovánek',
    'jablonec-nad-nisou',
    ['beh', 'cyklistika', 'workout'],
    'Běhám kolem Mšena, když to jde, tak i v zimě.',
  ),
  person(
    'Věra Šmídová',
    'teplice',
    ['jiny-pohyb', 'turistika', 'ctenarsky-klub'],
    'Nordic walking jsem začala chodit po operaci kolene. Zámecká zahrada je na to ideální.',
  ),
  person(
    'Natálie Coufalová',
    'sumperk',
    ['beh', 'turistika', 'zimni-sporty'],
    'Běhám v Sadech 1. máje a v zimě skialpuju na Pradědu.',
  ),
  person(
    'Bohumil Strnad',
    'sumperk',
    ['turistika', 'rybareni', 'geocaching'],
    'Na Praděd chodím od mládí, letos už podesáté. Rád přiberu společnost.',
  ),

  // Moravskoslezský a Jihomoravský kraj (3)
  person(
    'Zuzana Bednaříková',
    'opava',
    ['uklid-prirody', 'komunitni-zahrada', 'pomoc-v-utulku'],
    'Dobrovolnice z Opavy, úklidy Městských sadů dělám s místní školou.',
  ),
  person(
    'Antonín Kostka',
    'frydek-mistek',
    ['turistika', 'zimni-sporty', 'cyklistika'],
    'Na Lysou horu jsem vystoupal přes tři stovky krát a pořád mě to baví.',
  ),
  person(
    'Lenka Vintrová',
    'znojmo',
    ['turistika', 'spolecne-vareni', 'fotografie'],
    'Vinařka ze Znojma. Procházky vinicemi končí ochutnávkou, kdo chce.',
  ),
];

// ---------------------------------------------------------------------------
// Akce
// ---------------------------------------------------------------------------

/** Plán akce: kolik lidí je schválených, čeká a odhlásilo se; koho přesně, vybere `buildEvents`. */
export type CommunityEventPlan = {
  key: string;
  title: string;
  description: string;
  activitySlug: DemoActivitySlug;
  localitySlug: string;
  address: string;
  /** Za kolik dní po seedu, místní čas. */
  days: number;
  time: string;
  durationMinutes: number;
  min: number;
  max: number;
  price?: number;
  level?: 'beginner' | 'advanced' | 'all';
  equipment?: string;
  approvalMode: 'open' | 'approval';
  organizerKey: string;
  approved: number;
  pending?: number;
  withdrawn?: number;
  /** Akce, na kterou se jezdí z celé republiky (závody); jinak jen z kraje a sousedních krajů. */
  wide?: true;
};

export const communityEventPlans: CommunityEventPlan[] = [
  // Praha – akce v prvních 8 dnech mají vždy aspoň minimum (viz hlavička)
  {
    key: 'k-beh-stromovka',
    title: 'Ranní běh Stromovkou',
    description:
      'Pohodový okruh kolem 7 km tempem 6 min/km, nikoho nenecháme vzadu. Pro každého, kdo uběhne aspoň půl hodiny v kuse. Zdarma, stačí čelovka, pokud bude ještě šero.',
    activitySlug: 'beh',
    localitySlug: 'praha-7',
    address: 'Stromovka, vchod od Výstaviště, Praha 7',
    days: 1,
    time: '07:00',
    durationMinutes: 60,
    min: 2,
    max: 12,
    level: 'all',
    equipment: 'Běžecké boty, čelovka',
    approvalMode: 'open',
    organizerKey: 'jakub.vondracek',
    approved: 6,
  },
  {
    key: 'k-badminton-branik',
    title: 'Badmintonové čtyřhry v Braníku',
    description:
      'Hrajeme čtyřhry na dvou kurtech a po každém setu mícháme dvojice. Pro mírně pokročilé, kteří zvládnou rozehru. Kurt 180 Kč na osobu, míčky zajistím.',
    activitySlug: 'badminton',
    localitySlug: 'praha-4',
    address: 'Hamr Sport Braník, Vltavanů, Praha 4',
    days: 2,
    time: '19:00',
    durationMinutes: 120,
    min: 4,
    max: 8,
    price: 180,
    level: 'advanced',
    equipment: 'Raketa, sálová obuv',
    approvalMode: 'approval',
    organizerKey: 'lenka.sindelarova',
    approved: 8,
    pending: 2,
  },
  {
    key: 'k-deskovky-vnitroblock',
    title: 'Deskovky pro nováčky v Holešovicích',
    description:
      'Přinesu pět lehčích her, které se dají vysvětlit za deset minut – Krycí jména, Carcassonne, Dixit a další. Ideální pro ty, kdo s deskovkami začínají. Vstup zdarma, platí se jen vlastní útrata.',
    activitySlug: 'deskove-hry',
    localitySlug: 'praha-7',
    address: 'Vnitroblock, Tusarova 31, Praha 7',
    // after L1 („Deskovky v Holešovicích – menší stůl“): the demo opens the
    // first card under Hry › Deskové hry in Praha
    days: 9,
    time: '18:30',
    durationMinutes: 180,
    min: 3,
    max: 10,
    level: 'beginner',
    approvalMode: 'open',
    organizerKey: 'barbora.machova',
    approved: 7,
  },
  {
    key: 'k-volejbal-vinohrady',
    title: 'Volejbal v Sokole Vinohrady',
    description:
      'Smíšený volejbal na dvou polovinách, hrajeme na sety do 25. Pro hráče, kteří umí odbít, podat a chtějí si zahrát naplno. Tělocvična 100 Kč na osobu, platí se na místě.',
    activitySlug: 'volejbal',
    localitySlug: 'praha-2',
    address: 'Tělocvična Sokola Vinohrady, Polská, Praha 2',
    days: 4,
    time: '19:30',
    durationMinutes: 120,
    min: 8,
    max: 12,
    price: 100,
    level: 'advanced',
    equipment: 'Sálová obuv',
    approvalMode: 'open',
    organizerKey: 'ondrej.kratochvil',
    approved: 10,
    withdrawn: 1,
  },
  {
    key: 'k-kviz-oko',
    title: 'Pub kvíz U Vystřelenýho oka',
    description:
      'Skládáme šestičlenný tým na pravidelný kvíz – hodí se sport, zeměpis a hudba devadesátek. Startovné 50 Kč na osobu, vítězný tým má útratu zdarma. Stačí dobrá nálada a tužka.',
    activitySlug: 'pub-kviz',
    localitySlug: 'praha-3',
    address: 'U Vystřelenýho oka, U Božích bojovníků 3, Praha 3',
    days: 3,
    time: '19:00',
    durationMinutes: 150,
    min: 4,
    max: 6,
    price: 50,
    level: 'all',
    approvalMode: 'open',
    organizerKey: 'filip.hanak',
    approved: 6,
  },
  {
    key: 'k-lezeni-smichoff',
    title: 'Lezení na Smíchově pro začátečníky',
    description:
      'Naučím vás navázat se, jistit a slanit, pak lezeme jednodušší cesty na laně. Pro úplné začátečníky od 15 let. Vstup a půjčení vybavení 250 Kč, platí se na recepci.',
    activitySlug: 'lezeni',
    localitySlug: 'praha-5',
    address: 'Lezecké centrum SmíchOFF, Radlická, Praha 5',
    days: 5,
    time: '18:00',
    durationMinutes: 120,
    min: 2,
    max: 6,
    price: 250,
    level: 'beginner',
    equipment: 'Pohodlné oblečení, lezečky lze půjčit',
    approvalMode: 'approval',
    organizerKey: 'vojtech.matousek',
    approved: 4,
    pending: 1,
  },
  {
    key: 'k-joga-narodni-dum',
    title: 'Jóga pro ztuhlá záda',
    description:
      'Hodinová lekce pro lidi, kteří celý den sedí u počítače. Žádná akrobacie, hlavně protažení a dech. Lekce 120 Kč, podložku přineste, pár jich mám navíc.',
    activitySlug: 'joga',
    localitySlug: 'praha-2',
    address: 'Národní dům na Vinohradech, náměstí Míru 9, Praha 2',
    days: 6,
    time: '07:30',
    durationMinutes: 60,
    min: 3,
    max: 14,
    price: 120,
    level: 'beginner',
    equipment: 'Podložka, pohodlné oblečení',
    approvalMode: 'open',
    organizerKey: 'zuzana.stankova',
    approved: 9,
  },
  {
    key: 'k-florbal-vrsovice',
    title: 'Florbal ve Vršovicích – smíšené týmy',
    description:
      'Hrajeme pět na pět s brankáři, týmy losujeme na místě. Pro rekreační hráče, kteří už drželi hokejku. Hala 80 Kč na osobu, rozlišovací dresy mám.',
    activitySlug: 'florbal',
    localitySlug: 'praha-10',
    address: 'Tělocvična ZŠ Kodaňská, Kodaňská, Praha 10',
    days: 7,
    time: '20:00',
    durationMinutes: 90,
    min: 10,
    max: 14,
    price: 80,
    level: 'all',
    equipment: 'Hokejka, sálová obuv',
    approvalMode: 'open',
    organizerKey: 'lukas.hruby',
    approved: 12,
  },
  {
    key: 'k-turistika-sarka',
    title: 'Divokou Šárkou do Únětic',
    description:
      'Trasa kolem 12 km údolím Šárky s obědem v Únětickém pivovaru. Zvládne ji každý, kdo běžně chodí pěšky, s dětmi od osmi let. Zdarma, jídlo a pití na cestu s sebou.',
    activitySlug: 'turistika',
    localitySlug: 'praha-6',
    address: 'Konečná tramvaje Divoká Šárka, Evropská, Praha 6',
    days: 8,
    time: '09:30',
    durationMinutes: 300,
    min: 3,
    max: 15,
    level: 'all',
    equipment: 'Pevné boty, svačina',
    approvalMode: 'open',
    organizerKey: 'jiri.jires',
    approved: 8,
    withdrawn: 1,
  },
  {
    key: 'k-sachy-knihovna',
    title: 'Šachy v Městské knihovně',
    description:
      'Volné partie s hodinami i bez nich, začátečníkům rád vysvětlím zahájení. Pro všechny od deseti let. Zdarma, šachovnice jsou na místě.',
    activitySlug: 'sachy',
    localitySlug: 'praha-1',
    address: 'Městská knihovna, Mariánské náměstí 1, Praha 1',
    days: 9,
    time: '17:30',
    durationMinutes: 150,
    min: 4,
    max: 16,
    level: 'all',
    approvalMode: 'open',
    organizerKey: 'josef.reznicek',
    approved: 9,
  },
  {
    key: 'k-brusleni-nikolajka',
    title: 'Rodinné bruslení na Nikolajce',
    description:
      'Veřejné bruslení pro rodiny s dětmi od tří let, domluvíme se na kraji ledu u mantinelu. Vstup 90 Kč, děti do šesti let zdarma. Helmu pro děti doporučuju.',
    activitySlug: 'brusleni',
    localitySlug: 'praha-5',
    address: 'Zimní stadion Nikolajka, U Nikolajky, Praha 5',
    days: 10,
    time: '16:00',
    durationMinutes: 90,
    min: 4,
    max: 20,
    price: 90,
    level: 'beginner',
    equipment: 'Brusle, helma pro děti',
    approvalMode: 'open',
    organizerKey: 'karolina.sedlackova',
    approved: 3,
  },
  {
    key: 'k-tenis-stvanice',
    title: 'Tenisová čtyřhra na Štvanici',
    description:
      'Hrajeme v hale čtyřhru na dva sety. Hledám hráče na úrovni okresní soutěže, kteří zvládnou podání i volej. Kurt 300 Kč na osobu, míče přinesu nové.',
    activitySlug: 'tenis',
    localitySlug: 'praha-7',
    address: 'Tenisový areál Štvanice, ostrov Štvanice, Praha 7',
    days: 11,
    time: '18:00',
    durationMinutes: 120,
    min: 4,
    max: 4,
    price: 300,
    level: 'advanced',
    equipment: 'Raketa, antukové boty',
    approvalMode: 'approval',
    organizerKey: 'tomas.bures',
    approved: 2,
    pending: 2,
  },
  {
    key: 'k-tandem-liberal',
    title: 'Jazykový tandem čeština – angličtina',
    description:
      'Půl hodiny česky, půl hodiny anglicky, pak se střídáme u stolů. Pro cizince, kteří se učí česky, i pro Čechy, kteří chtějí mluvit anglicky. Zdarma, platí se jen káva.',
    activitySlug: 'jazykovy-tandem',
    localitySlug: 'praha-7',
    address: 'Kavárna Liberál, Heřmanova 6, Praha 7',
    days: 12,
    time: '18:30',
    durationMinutes: 120,
    min: 4,
    max: 12,
    level: 'all',
    approvalMode: 'open',
    organizerKey: 'adela.kadlecova',
    approved: 7,
  },
  {
    key: 'k-uklid-hostivar',
    title: 'Úklid břehů Hostivařské přehrady',
    description:
      'Projdeme břeh od hráze k pláži a posbíráme, co tam po létě zůstalo. Pro kohokoli, děti s rodiči vítány. Pytle a rukavice zajistí městská část, zdarma.',
    activitySlug: 'uklid-prirody',
    localitySlug: 'praha-15',
    address: 'Hostivařská přehrada, hráz, Praha 15',
    days: 13,
    time: '10:00',
    durationMinutes: 180,
    min: 5,
    max: 25,
    level: 'all',
    equipment: 'Pevné boty, vlastní rukavice',
    approvalMode: 'open',
    organizerKey: 'vaclav.zelenka',
    approved: 4,
  },
  {
    key: 'k-vareni-indie',
    title: 'Společné vaření: indická kuchyně',
    description:
      'Uvaříme dal, kuřecí tikka masalu a placky čapátí a pak to spolu sníme. Pro každého, kdo umí držet nůž. Suroviny 350 Kč na osobu, zástěru si vezměte.',
    activitySlug: 'spolecne-vareni',
    localitySlug: 'praha-3',
    address: 'Komunitní kuchyně, Seifertova, Praha 3',
    days: 15,
    time: '18:00',
    durationMinutes: 180,
    min: 4,
    max: 8,
    price: 350,
    level: 'all',
    equipment: 'Zástěra, krabička na zbytky',
    approvalMode: 'approval',
    organizerKey: 'katerina.bartosova',
    approved: 8,
    pending: 1,
  },
  {
    key: 'k-basket-ladronka',
    title: 'Basketbal 3×3 na Ladronce',
    description:
      'Streetball na venkovním hřišti, týmy po třech, hrajeme do 21 bodů. Pro kohokoli, kdo zvládne dvojtakt. Zdarma, míč přinesu.',
    activitySlug: 'basketbal',
    localitySlug: 'praha-6',
    address: 'Park Ladronka, Tomanova, Praha 6',
    days: 3,
    time: '17:00',
    durationMinutes: 90,
    min: 6,
    max: 12,
    level: 'all',
    equipment: 'Sportovní obuv',
    approvalMode: 'open',
    organizerKey: 'martin.sykora',
    approved: 6,
  },
  {
    key: 'k-plavani-podoli',
    title: 'Ranní plavání v Podolí',
    description:
      'Plaveme vlastním tempem v padesátimetrovém bazénu, kdo chce, dá si se mnou intervaly. Pro ty, kdo uplavou kilometr bez zastavení. Vstup 180 Kč, platí se na pokladně.',
    activitySlug: 'plavani',
    localitySlug: 'praha-4',
    address: 'Plavecký stadion Podolí, Podolská 74, Praha 4',
    days: 6,
    time: '06:30',
    durationMinutes: 75,
    min: 2,
    max: 8,
    price: 180,
    level: 'advanced',
    equipment: 'Plavky, brýle, čepice',
    approvalMode: 'open',
    organizerKey: 'petra.kalinova',
    approved: 5,
  },
  {
    key: 'k-utulek-troja',
    title: 'Venčení psů z útulku v Troji',
    description:
      'Každý dostane psa na hodinovou procházku Trojou a pak pomůžeme s úklidem kotců. Pro dospělé, kteří se psů nebojí. Zdarma, útulek uvítá i deku nebo granule.',
    activitySlug: 'pomoc-v-utulku',
    localitySlug: 'praha-7',
    address: 'Městský útulek pro zvířata, Trojská 1, Praha 7',
    days: 16,
    time: '09:00',
    durationMinutes: 180,
    min: 3,
    max: 6,
    level: 'all',
    equipment: 'Oblečení, které se může ušpinit',
    approvalMode: 'approval',
    organizerKey: 'eliska.hronkova',
    approved: 2,
    pending: 2,
  },
  {
    key: 'k-hokej-kobra',
    title: 'Amatérský hokej v Braníku',
    description:
      'Hodina ledu pro rekreační hráče, hrajeme bez bodyčeků a bez rozhodčího. Pro ty, kdo zvládnou jízdu vzad a přihrávku. Led 250 Kč na osobu, brankáři zdarma.',
    activitySlug: 'ledni-hokej',
    localitySlug: 'praha-4',
    address: 'Zimní stadion Kobra, Braník, Praha 4',
    days: 18,
    time: '21:00',
    durationMinutes: 75,
    min: 10,
    max: 20,
    price: 250,
    level: 'advanced',
    equipment: 'Kompletní hokejová výstroj',
    approvalMode: 'approval',
    organizerKey: 'petr.charvat',
    approved: 14,
    pending: 3,
  },
  {
    key: 'k-ultimate-letna',
    title: 'Ultimate frisbee na Letné',
    description:
      'Naučíme se základní hody a pak hrajeme sedm na sedm. Pro úplné nováčky i ty, kdo už hráli. Zdarma, disky mám.',
    activitySlug: 'ultimate',
    localitySlug: 'praha-7',
    address: 'Letenská pláň, u kyvadla, Praha 7',
    days: 20,
    time: '14:00',
    durationMinutes: 120,
    min: 8,
    max: 16,
    level: 'all',
    equipment: 'Kopačky nebo běžecké boty',
    approvalMode: 'open',
    organizerKey: 'tereza.kubickova',
    approved: 9,
  },

  // Brno
  {
    key: 'k-volejbal-vodova',
    title: 'Smíšený volejbal ve Vodově',
    description:
      'Hrajeme šest na šest, na každé straně aspoň dvě ženy. Pro mírně pokročilé, kteří zvládnou příjem a nahrávku. Hala 110 Kč na osobu.',
    activitySlug: 'volejbal',
    localitySlug: 'brno',
    address: 'Sportovní centrum Vodova, Vodova 108, Brno',
    days: 2,
    time: '19:00',
    durationMinutes: 120,
    min: 8,
    max: 12,
    price: 110,
    level: 'advanced',
    equipment: 'Sálová obuv',
    approvalMode: 'open',
    organizerKey: 'radim.kuchar',
    approved: 7,
  },
  {
    key: 'k-beh-prehrada',
    title: 'Běh kolem Brněnské přehrady',
    description:
      'Okruh kolem přehrady má 16 km, kdo chce méně, otočí se u Rakovce. Pro běžce, kteří zvládnou aspoň hodinu. Zdarma, občerstvení po doběhu v přístavišti.',
    activitySlug: 'beh',
    localitySlug: 'brno',
    address: 'Přístaviště Bystrc, Brno',
    days: 4,
    time: '09:00',
    durationMinutes: 120,
    min: 2,
    max: 20,
    level: 'advanced',
    equipment: 'Běžecké boty, láhev s pitím',
    approvalMode: 'open',
    organizerKey: 'marek.hruska',
    approved: 9,
  },
  {
    key: 'k-deskovky-podnebi',
    title: 'Deskoherní večer v Podnebí',
    description:
      'Hrajeme středně náročné hry jako Azul, Ticket to Ride nebo Kingdomino a nováčky vždycky naučíme. Pro všechny od patnácti let. Zdarma, platí se jen útrata.',
    activitySlug: 'deskove-hry',
    localitySlug: 'brno',
    address: 'Kavárna Podnebí, Údolní 5, Brno',
    days: 6,
    time: '18:00',
    durationMinutes: 210,
    min: 3,
    max: 8,
    level: 'all',
    approvalMode: 'open',
    organizerKey: 'tomas.mares',
    approved: 8,
  },
  {
    key: 'k-badminton-luzanky',
    title: 'Badminton v Lužánkách',
    description:
      'Dvouhry i čtyřhry podle toho, kolik nás přijde. Pro rekreační hráče, kteří chtějí hrát pravidelně. Kurt 160 Kč na osobu, míčky přinesu.',
    activitySlug: 'badminton',
    localitySlug: 'brno',
    address: 'SVČ Lužánky, Lidická 50, Brno',
    days: 9,
    time: '18:00',
    durationMinutes: 120,
    min: 4,
    max: 8,
    price: 160,
    level: 'all',
    equipment: 'Raketa, sálová obuv',
    approvalMode: 'approval',
    organizerKey: 'klara.linhartova',
    approved: 5,
    pending: 2,
  },
  {
    key: 'k-kviz-bar',
    title: 'Pub kvíz v Baru, který neexistuje',
    description:
      'Do kvízového týmu hledáme dva lidi, kteří vědí něco o filmu a přírodě. Pro kohokoli, kdo nebere prohru vážně. Startovné 60 Kč na osobu.',
    activitySlug: 'pub-kviz',
    localitySlug: 'brno',
    address: 'Bar, který neexistuje, Dvořákova 1, Brno',
    days: 12,
    time: '19:30',
    durationMinutes: 150,
    min: 4,
    max: 6,
    price: 60,
    level: 'all',
    approvalMode: 'open',
    organizerKey: 'aneta.dvorska',
    approved: 6,
  },
  {
    key: 'k-joga-luzanky',
    title: 'Jóga pro sedavou práci',
    description:
      'Lekce vedená fyzioterapeutkou: protažení zad, krku a zápěstí. Pro začátečníky i lidi po zranění, cviky upravím. Lekce 100 Kč.',
    activitySlug: 'joga',
    localitySlug: 'brno',
    address: 'SVČ Lužánky, Lidická 50, Brno',
    days: 22,
    time: '08:00',
    durationMinutes: 75,
    min: 3,
    max: 15,
    price: 100,
    level: 'beginner',
    equipment: 'Podložka',
    approvalMode: 'open',
    organizerKey: 'veronika.vojtiskova',
    approved: 6,
  },
  {
    key: 'k-kolo-kras',
    title: 'Na kole do Moravského krasu',
    description:
      'Z Brna přes Bílovice do Pustého žlebu a zpět, celkem kolem 70 km a 900 m převýšení. Pro zdatné cyklisty na silničce nebo trekovém kole. Zdarma, helma povinná.',
    activitySlug: 'cyklistika',
    localitySlug: 'brno',
    address: 'Mendlovo náměstí, Brno',
    days: 27,
    time: '09:00',
    durationMinutes: 300,
    min: 3,
    max: 10,
    level: 'advanced',
    equipment: 'Kolo v dobrém stavu, helma, náhradní duše',
    approvalMode: 'approval',
    organizerKey: 'michal.slama',
    approved: 4,
    pending: 1,
  },

  // Ostrava
  {
    key: 'k-florbal-poruba',
    title: 'Florbal v Porubě',
    description:
      'Smíšený florbal pět na pět v tělocvičně VŠB. Pro rekreační hráče i studenty, kteří chtějí po zkouškách vypnout. Hala 70 Kč na osobu.',
    activitySlug: 'florbal',
    localitySlug: 'ostrava',
    address: 'Tělocvična VŠB, 17. listopadu, Ostrava-Poruba',
    days: 3,
    time: '19:00',
    durationMinutes: 90,
    min: 10,
    max: 14,
    price: 70,
    level: 'all',
    equipment: 'Hokejka, sálová obuv',
    approvalMode: 'open',
    organizerKey: 'denisa.holisova',
    approved: 8,
  },
  {
    key: 'k-halda-ema',
    title: 'Výšlap na haldu Ema',
    description:
      'Krátký výlet na nejznámější ostravskou haldu s výhledem na Beskydy. Zvládnou ho i děti a senioři. Zdarma, teplé pití s sebou, nahoře fouká.',
    activitySlug: 'turistika',
    localitySlug: 'ostrava',
    address: 'Parkoviště pod haldou Ema, Slezská Ostrava',
    days: 5,
    time: '14:00',
    durationMinutes: 150,
    min: 2,
    max: 15,
    level: 'all',
    equipment: 'Pevné boty, teplé oblečení',
    approvalMode: 'open',
    organizerKey: 'lucie.kubalova',
    approved: 7,
  },
  {
    key: 'k-uklid-komenskeho',
    title: 'Úklid Komenského sadů',
    description:
      'Sbíráme odpadky v parku a kolem Ostravice, po úklidu čaj a buchty. Pro rodiny, školy i jednotlivce. Zdarma, pytle a rukavice zajistím.',
    activitySlug: 'uklid-prirody',
    localitySlug: 'ostrava',
    address: 'Komenského sady, u Nové radnice, Ostrava',
    days: 10,
    time: '10:00',
    durationMinutes: 180,
    min: 5,
    max: 30,
    level: 'all',
    equipment: 'Pracovní oblečení',
    approvalMode: 'open',
    organizerKey: 'stanislav.krupa',
    approved: 7,
  },
  {
    key: 'k-jam-vitkovice',
    title: 'Jam session v Dolní oblasti',
    description:
      'Hrajeme blues, funk a co nás napadne, bicí a aparát na místě. Pro muzikanty, kteří zvládnou držet rytmus a poslouchat ostatní. Zdarma, nástroj si přineste.',
    activitySlug: 'jam-session',
    localitySlug: 'ostrava',
    address: 'Dolní oblast Vítkovice, Ruská, Ostrava',
    days: 14,
    time: '19:00',
    durationMinutes: 180,
    min: 3,
    max: 8,
    level: 'advanced',
    equipment: 'Vlastní nástroj a kabel',
    approvalMode: 'approval',
    organizerKey: 'iveta.bilkova',
    approved: 5,
    pending: 2,
  },

  // Plzeň
  {
    key: 'k-beh-bolevak',
    title: 'Večerní běh kolem Boleváku',
    description:
      'Dvě kola kolem Boleveckého rybníka, dohromady asi 7 km. Pro běžce, kteří chtějí tempo kolem pěti minut na kilometr. Zdarma, reflexní vestu doporučuju.',
    activitySlug: 'beh',
    localitySlug: 'plzen',
    address: 'Bolevecký rybník, u hráze, Plzeň',
    days: 2,
    time: '17:30',
    durationMinutes: 60,
    min: 2,
    max: 15,
    level: 'advanced',
    equipment: 'Reflexní vesta',
    approvalMode: 'open',
    organizerKey: 'jaroslav.korinek',
    approved: 5,
  },
  {
    key: 'k-volejbal-lokomotiva',
    title: 'Volejbal v hale Lokomotivy',
    description:
      'Tréninkový volejbal se hrou na konci, rozcvičku vedu já. Pro hráče, kteří už hráli soutěžně nebo chtějí. Hala 90 Kč na osobu.',
    activitySlug: 'volejbal',
    localitySlug: 'plzen',
    address: 'Sportovní hala Lokomotiva, Úslavská 75, Plzeň',
    days: 11,
    time: '19:00',
    durationMinutes: 120,
    min: 6,
    max: 8,
    price: 90,
    level: 'advanced',
    equipment: 'Sálová obuv, chrániče kolen',
    approvalMode: 'approval',
    organizerKey: 'gabriela.fiserova',
    approved: 8,
    pending: 1,
  },
  {
    key: 'k-badminton-slovany',
    title: 'Badminton pro začátečníky na Slovanech',
    description:
      'Učíme se správný úchop, podání a pohyb po kurtu, pak hrajeme. Pro úplné začátečníky. Kurt 140 Kč na osobu, rakety dvě půjčím.',
    activitySlug: 'badminton',
    localitySlug: 'plzen',
    address: 'Sportovní hala Slovany, Slovanská alej, Plzeň',
    days: 25,
    time: '18:00',
    durationMinutes: 90,
    min: 4,
    max: 8,
    price: 140,
    level: 'beginner',
    equipment: 'Sálová obuv',
    approvalMode: 'open',
    organizerKey: 'patrik.soukup',
    approved: 2,
  },

  // Olomouc
  {
    key: 'k-ultimate-bezrucovy',
    title: 'Ultimate v Bezručových sadech',
    description:
      'Hrajeme na trávě pod hradbami, nováčkům vysvětlíme pravidla za pět minut. Pro všechny od patnácti let. Zdarma, disky máme.',
    activitySlug: 'ultimate',
    localitySlug: 'olomouc',
    address: 'Bezručovy sady, u Mlýnského potoka, Olomouc',
    days: 4,
    time: '15:00',
    durationMinutes: 120,
    min: 8,
    max: 16,
    level: 'all',
    equipment: 'Kopačky nebo běžecké boty',
    approvalMode: 'open',
    organizerKey: 'viktor.tomek',
    approved: 9,
  },
  {
    key: 'k-tandem-olomouc',
    title: 'Tandem se studenty z Erasmu',
    description:
      'Studenti z Erasmu se učí česky a my s nimi mluvíme anglicky, španělsky nebo německy. Pro kohokoli, kdo chce mluvit. Zdarma, kávu si každý platí sám.',
    activitySlug: 'jazykovy-tandem',
    localitySlug: 'olomouc',
    address: 'Café 87, Denisova 47, Olomouc',
    days: 8,
    time: '18:00',
    durationMinutes: 120,
    min: 4,
    max: 14,
    level: 'all',
    approvalMode: 'open',
    organizerKey: 'kristyna.paurova',
    approved: 8,
  },
  {
    key: 'k-pingpong-olomouc',
    title: 'Stolní tenis pro každého',
    description:
      'Tři stoly, hrajeme systémem každý s každým na dva vítězné sety. Pro rekreační hráče všech věků. Pronájem 60 Kč na osobu, pálky půjčím.',
    activitySlug: 'stolni-tenis',
    localitySlug: 'olomouc',
    address: 'Sportovní hala UP, U Sportovní haly 2, Olomouc',
    days: 16,
    time: '18:30',
    durationMinutes: 120,
    min: 4,
    max: 8,
    price: 60,
    level: 'all',
    equipment: 'Sálová obuv',
    approvalMode: 'open',
    organizerKey: 'dagmar.machalova',
    approved: 3,
  },

  // Liberec
  {
    key: 'k-jested',
    title: 'Pěšky na Ještěd',
    description:
      'Z Horního Hanychova vystoupáme na vrchol, nahoře oběd a dolů lanovkou nebo pěšky. Pro zdravé chodce, převýšení 400 m. Zdarma, lanovka dolů 150 Kč.',
    activitySlug: 'turistika',
    localitySlug: 'liberec',
    address: 'Dolní stanice lanovky, Horní Hanychov, Liberec',
    days: 3,
    time: '09:00',
    durationMinutes: 300,
    min: 3,
    max: 12,
    level: 'all',
    equipment: 'Pevné boty, vrstvy oblečení',
    approvalMode: 'open',
    organizerKey: 'sarka.medkova',
    approved: 5,
  },
  {
    key: 'k-florbal-liberec',
    title: 'Florbal pro rekreační hráče',
    description:
      'Hrajeme v hale univerzity pět na pět, týmy losujeme. Pro každého, kdo chce hodinu a půl zapotit. Hala 60 Kč na osobu.',
    activitySlug: 'florbal',
    localitySlug: 'liberec',
    address: 'Sportovní hala TUL, Voroněžská, Liberec',
    days: 9,
    time: '20:00',
    durationMinutes: 90,
    min: 8,
    max: 12,
    price: 60,
    level: 'all',
    equipment: 'Hokejka, sálová obuv',
    approvalMode: 'open',
    organizerKey: 'libor.hampl',
    approved: 8,
  },

  // Hradec Králové
  {
    key: 'k-beh-stribrnak',
    title: 'Běh kolem Stříbrného rybníka',
    description:
      'Lesní okruh kolem 6 km s možností prodloužení. Pro začínající i pokročilé běžce, počkáme na sebe. Zdarma.',
    activitySlug: 'beh',
    localitySlug: 'hradec-kralove',
    address: 'Stříbrný rybník, parkoviště, Hradec Králové',
    days: 2,
    time: '18:00',
    durationMinutes: 60,
    min: 2,
    max: 12,
    level: 'all',
    equipment: 'Čelovka',
    approvalMode: 'open',
    organizerKey: 'jakub.safranek',
    approved: 3,
  },
  {
    key: 'k-volejbal-trebes',
    title: 'Volejbal na Třebši',
    description:
      'Rekreační volejbal pro smíšené družstvo, hraje se na sety do 25. Pro hráče, kteří zvládnou odbití a podání. Hala 100 Kč na osobu.',
    activitySlug: 'volejbal',
    localitySlug: 'hradec-kralove',
    address: 'Sportovní hala Třebeš, Hradec Králové',
    days: 10,
    time: '19:30',
    durationMinutes: 120,
    min: 8,
    max: 12,
    price: 100,
    level: 'all',
    equipment: 'Sálová obuv',
    approvalMode: 'approval',
    organizerKey: 'alena.fojtikova',
    approved: 6,
    pending: 2,
  },
  {
    key: 'k-kviz-hradec',
    title: 'Kvízový večer na Velkém náměstí',
    description:
      'Šest kol po deseti otázkách, témata od historie po popkulturu. Pro týmy do šesti lidí, jednotlivce rád přiřadím. Startovné 40 Kč na osobu.',
    activitySlug: 'pub-kviz',
    localitySlug: 'hradec-kralove',
    address: 'Hospoda Pod Věží, Velké náměstí, Hradec Králové',
    days: 16,
    time: '19:00',
    durationMinutes: 150,
    min: 4,
    max: 6,
    price: 40,
    level: 'all',
    approvalMode: 'open',
    organizerKey: 'miroslav.hofman',
    approved: 5,
  },

  // Pardubice
  {
    key: 'k-kolo-kuneticka',
    title: 'Na kole na Kunětickou horu',
    description:
      'Rovinatá trasa po cyklostezkách kolem 25 km tam i zpět, nahoře hrad a svačina. Pro rodiny s dětmi od šesti let. Zdarma, helma povinná.',
    activitySlug: 'cyklistika',
    localitySlug: 'pardubice',
    address: 'Tyršovy sady, Pardubice',
    days: 4,
    time: '10:00',
    durationMinutes: 180,
    min: 3,
    max: 12,
    level: 'beginner',
    equipment: 'Kolo, helma, svačina',
    approvalMode: 'open',
    organizerKey: 'eva.stepankova',
    approved: 6,
  },
  {
    key: 'k-hokej-enteria',
    title: 'Amatérský hokej v enteria areně',
    description:
      'Hodina na tréninkové ploše, dva týmy a střídání po minutě. Pro hráče, kteří někdy hráli registrovaně nebo aspoň dlouho rekreačně. Led 220 Kč na osobu, brankář zdarma.',
    activitySlug: 'ledni-hokej',
    localitySlug: 'pardubice',
    address: 'enteria arena, Sukova třída 1735, Pardubice',
    days: 13,
    time: '21:15',
    durationMinutes: 75,
    min: 10,
    max: 20,
    price: 220,
    level: 'advanced',
    equipment: 'Kompletní hokejová výstroj',
    approvalMode: 'approval',
    organizerKey: 'lukas.kopriva',
    approved: 12,
    pending: 2,
  },

  // České Budějovice
  {
    key: 'k-beh-stromovka-cb',
    title: 'Ranní běh budějovickou Stromovkou',
    description:
      'Klidných 5 km před prací, po doběhu káva v mé kavárně za poloviční cenu. Pro každého, kdo uběhne pět kilometrů. Zdarma.',
    activitySlug: 'beh',
    localitySlug: 'ceske-budejovice',
    address: 'Park Stromovka, České Budějovice',
    days: 3,
    time: '07:00',
    durationMinutes: 60,
    min: 2,
    max: 10,
    level: 'beginner',
    approvalMode: 'open',
    organizerKey: 'tereza.hejdukova',
    approved: 4,
  },
  {
    key: 'k-florbal-jirovcova',
    title: 'Florbal v tělocvičně na Jírovcově',
    description:
      'Hrajeme pět na pět, na brankáře se střídáme. Pro rekreační hráče od šestnácti let. Pronájem 60 Kč na osobu.',
    activitySlug: 'florbal',
    localitySlug: 'ceske-budejovice',
    address: 'Tělocvična gymnázia, Jírovcova 8, České Budějovice',
    days: 8,
    time: '19:00',
    durationMinutes: 90,
    min: 8,
    max: 12,
    price: 60,
    level: 'all',
    equipment: 'Hokejka, sálová obuv',
    approvalMode: 'open',
    organizerKey: 'pavel.broz',
    approved: 8,
  },
  {
    key: 'k-sbor-metropol',
    title: 'Zkouška adventního sboru',
    description:
      'Připravujeme Rybovu mši a koledy na adventní koncert. Pro zpěváky všech hlasů, noty číst nemusíte. Zdarma, noty dostanete na místě.',
    activitySlug: 'sborovy-zpev',
    localitySlug: 'ceske-budejovice',
    address: 'Dům kultury Metropol, Senovážné náměstí 2, České Budějovice',
    days: 24,
    time: '18:00',
    durationMinutes: 120,
    min: 6,
    max: 30,
    level: 'all',
    equipment: 'Tužka a láhev vody',
    approvalMode: 'approval',
    organizerKey: 'ivana.simonova',
    approved: 9,
    pending: 2,
  },

  // Ústí nad Labem
  {
    key: 'k-vetrus',
    title: 'Na Větruši a Mariánskou skálu',
    description:
      'Lanovkou nebo pěšky nahoru na Větruši, pak hřebenem na vyhlídku nad Labem. Pro rodiny i seniory, kolem 8 km. Zdarma, lanovka podle chuti.',
    activitySlug: 'turistika',
    localitySlug: 'usti-nad-labem',
    address: 'Lanovka na Větruši, dolní stanice u OC Forum, Ústí nad Labem',
    days: 5,
    time: '10:00',
    durationMinutes: 210,
    min: 3,
    max: 15,
    level: 'all',
    equipment: 'Pevné boty',
    approvalMode: 'open',
    organizerKey: 'jitka.vankova',
    approved: 5,
  },
  {
    key: 'k-sachy-knihovna-ul',
    title: 'Šachy pro děti i dospělé',
    description:
      'Simultánka, kde hraju proti všem najednou, a pak volné partie. Pro děti od osmi let a dospělé, kteří znají tahy. Zdarma.',
    activitySlug: 'sachy',
    localitySlug: 'usti-nad-labem',
    address: 'Severočeská vědecká knihovna, Velká Hradební 49, Ústí nad Labem',
    days: 17,
    time: '16:00',
    durationMinutes: 150,
    min: 4,
    max: 16,
    level: 'all',
    approvalMode: 'open',
    organizerKey: 'zdenek.bauer',
    approved: 2,
  },

  // Ústí nad Orlicí a okolí
  {
    key: 'k-atletika-uo',
    title: 'Podzimní atletické závody pro děti a dospělé',
    description:
      'Sprint na 60 m, skok daleký, hod míčkem a běh na 800 m v kategoriích od přípravky po veterány. Pro všechny, kdo si chtějí zazávodit – výsledky vyhlašujeme po každé disciplíně. Startovné 50 Kč, děti do 15 let zdarma.',
    activitySlug: 'atletika',
    localitySlug: 'usti-nad-orlici',
    address: 'Atletický stadion TJ Jiskra, Ústí nad Orlicí',
    days: 12,
    time: '09:30',
    durationMinutes: 300,
    min: 15,
    max: 60,
    price: 50,
    level: 'all',
    equipment: 'Sportovní obuv, tretry kdo má, svačina',
    approvalMode: 'open',
    organizerKey: 'petr.hejl',
    approved: 22,
    withdrawn: 2,
    wide: true,
  },
  {
    key: 'k-beh-andrluv-chlum',
    title: 'Běh na Andrlův chlum',
    description:
      'Z náměstí vyběhneme k rozhledně a zpátky, kolem 8 km s převýšením 200 m. Pro běžce, kteří se nebojí kopce. Zdarma.',
    activitySlug: 'beh',
    localitySlug: 'usti-nad-orlici',
    address: 'Mírové náměstí, Ústí nad Orlicí',
    days: 6,
    time: '17:00',
    durationMinutes: 75,
    min: 2,
    max: 12,
    level: 'advanced',
    equipment: 'Čelovka, trailové boty',
    approvalMode: 'open',
    organizerKey: 'marie.kosova',
    approved: 4,
  },
  {
    key: 'k-pingpong-uo',
    title: 'Stolní tenis s TJ Jiskra',
    description:
      'Dva stoly, hrajeme na čas a střídáme se. Pro začátečníky i ty, kdo hráli kdysi v oddíle. Pronájem 40 Kč na osobu.',
    activitySlug: 'stolni-tenis',
    localitySlug: 'usti-nad-orlici',
    address: 'Tělocvična gymnázia, Heranova 1424, Ústí nad Orlicí',
    days: 19,
    time: '18:00',
    durationMinutes: 120,
    min: 4,
    max: 8,
    price: 40,
    level: 'all',
    equipment: 'Sálová obuv, vlastní pálka kdo má',
    approvalMode: 'open',
    organizerKey: 'dominik.prazak',
    approved: 5,
  },
  {
    key: 'k-peklak',
    title: 'Suchá lyžařská příprava na Pekláku',
    description:
      'Kruhový trénink do kopce pod sjezdovkou, ať jsou nohy na zimu připravené. Pro lyžaře a snowboardisty od dvanácti let. Zdarma.',
    activitySlug: 'zimni-sporty',
    localitySlug: 'ceska-trebova',
    address: 'Skicentrum Peklák, Česká Třebová',
    days: 26,
    time: '10:00',
    durationMinutes: 120,
    min: 4,
    max: 15,
    level: 'all',
    equipment: 'Sportovní oblečení, pití',
    approvalMode: 'open',
    organizerKey: 'radka.junkova',
    approved: 3,
  },
  {
    key: 'k-foto-litomysl',
    title: 'Fotovycházka po zámeckém návrší',
    description:
      'Projdeme zámek, klášterní zahrady a Smetanovo náměstí a ukážu, jak fotit architekturu bez zkreslení. Pro začátečníky s mobilem i foťákem. Zdarma.',
    activitySlug: 'fotografie',
    localitySlug: 'litomysl',
    address: 'Zámecké návrší, u hlavního vstupu do zámku, Litomyšl',
    days: 15,
    time: '14:00',
    durationMinutes: 150,
    min: 3,
    max: 10,
    level: 'beginner',
    equipment: 'Foťák nebo mobil',
    approvalMode: 'open',
    organizerKey: 'hedvika.rybova',
    approved: 4,
  },
  {
    key: 'k-kolo-orlice',
    title: 'Na kole údolím Tiché Orlice',
    description:
      'Z Chocně po cyklostezce do Ústí nad Orlicí a zpátky, kolem 40 km bez velkých kopců. Pro rekreační cyklisty. Zdarma, oběd v Brandýse nad Orlicí.',
    activitySlug: 'cyklistika',
    localitySlug: 'chocen',
    address: 'Vlakové nádraží Choceň',
    days: 9,
    time: '09:30',
    durationMinutes: 240,
    min: 3,
    max: 10,
    level: 'all',
    equipment: 'Kolo, helma',
    approvalMode: 'open',
    organizerKey: 'ales.mikulka',
    approved: 5,
  },

  // Zlínský kraj
  {
    key: 'k-hokej-zlin',
    title: 'Hokej pro rekreační hráče',
    description:
      'Hodina a čtvrt ledu, dvě lajny v každém týmu. Pro bývalé registrované hráče i zkušené rekreanty. Led 200 Kč na osobu, brankář zdarma.',
    activitySlug: 'ledni-hokej',
    localitySlug: 'zlin',
    address: 'Zimní stadion Luďka Čajky, Hřbitovní 4511, Zlín',
    days: 6,
    time: '20:45',
    durationMinutes: 75,
    min: 10,
    max: 20,
    price: 200,
    level: 'advanced',
    equipment: 'Kompletní hokejová výstroj',
    approvalMode: 'approval',
    organizerKey: 'jan.zboril',
    approved: 10,
    pending: 2,
  },
  {
    key: 'k-deskovky-zlin',
    title: 'Deskovky v Baťově institutu',
    description:
      'Hry si půjčíme přímo z knihovny, vybereme podle toho, kolik nás bude. Pro rodiny s dětmi od osmi let i dospělé. Zdarma.',
    activitySlug: 'deskove-hry',
    localitySlug: 'zlin',
    address: 'Krajská knihovna Františka Bartoše, Vavrečkova 7040, Zlín',
    days: 11,
    time: '16:30',
    durationMinutes: 180,
    min: 3,
    max: 12,
    level: 'all',
    approvalMode: 'open',
    organizerKey: 'andrea.vaculikova',
    approved: 6,
  },
  {
    key: 'k-kesky-zlin',
    title: 'Za keškami na Tlustou horu',
    description:
      'Okruh kolem 10 km lesem nad Zlínem, cestou šest keší. Pro začínající kačery i rodiny s dětmi. Zdarma, stačí mobil s aplikací.',
    activitySlug: 'geocaching',
    localitySlug: 'zlin',
    address: 'Náměstí Míru, Zlín',
    days: 23,
    time: '09:30',
    durationMinutes: 240,
    min: 3,
    max: 15,
    level: 'beginner',
    equipment: 'Mobil s aplikací, pevné boty',
    approvalMode: 'open',
    organizerKey: 'robert.mikeska',
    approved: 2,
  },
  {
    key: 'k-volejbal-uh',
    title: 'Volejbal v Uherském Hradišti',
    description:
      'Smíšený volejbal šest na šest, hrajeme na sety. Pro rekreační hráče, kteří zvládnou přijmout podání. Hala 80 Kč na osobu.',
    activitySlug: 'volejbal',
    localitySlug: 'uherske-hradiste',
    address: 'Tělocvična gymnázia, Velehradská třída 218, Uherské Hradiště',
    days: 7,
    time: '19:00',
    durationMinutes: 120,
    min: 8,
    max: 12,
    price: 80,
    level: 'all',
    equipment: 'Sálová obuv',
    approvalMode: 'open',
    organizerKey: 'tomas.klimek',
    approved: 8,
  },
  {
    key: 'k-kolacky-uh',
    title: 'Pečeme slovácké koláčky',
    description:
      'Upečeme tvarohové, povidlové a ořechové koláčky podle babiččina receptu, každý si odnese plnou krabici. Pro začátečníky i zkušené pekaře. Suroviny 150 Kč.',
    activitySlug: 'spolecne-vareni',
    localitySlug: 'uherske-hradiste',
    address: 'Klub kultury, Mariánské náměstí, Uherské Hradiště',
    days: 18,
    time: '15:00',
    durationMinutes: 180,
    min: 4,
    max: 8,
    price: 150,
    level: 'beginner',
    equipment: 'Zástěra, krabice na koláčky',
    approvalMode: 'approval',
    organizerKey: 'ludmila.gajdosova',
    approved: 8,
    pending: 2,
  },

  // Vysočina
  {
    key: 'k-plavani-jihlava',
    title: 'Ranní plavání v Jihlavě',
    description:
      'Hodina v bazénu před prací, každý svým tempem. Pro plavce, kteří uplavou aspoň 500 m. Vstup 90 Kč.',
    activitySlug: 'plavani',
    localitySlug: 'jihlava',
    address: 'Krytý bazén Evžena Rošického, Tolstého, Jihlava',
    days: 4,
    time: '06:30',
    durationMinutes: 60,
    min: 2,
    max: 8,
    price: 90,
    level: 'all',
    equipment: 'Plavky, brýle',
    approvalMode: 'open',
    organizerKey: 'irena.placha',
    approved: 3,
  },
  {
    key: 'k-florbal-jihlava',
    title: 'Florbal pro nováčky v Jihlavě',
    description:
      'Hrajeme rekreačně, pět na pět, bez brankářů na malé branky. Pro kohokoli, kdo se chce hýbat a nebojí se hokejky. Hala 70 Kč na osobu, hokejku půjčím.',
    activitySlug: 'florbal',
    localitySlug: 'jihlava',
    address: 'Tělocvična gymnázia, Jana Masaryka 1, Jihlava',
    days: 13,
    time: '19:30',
    durationMinutes: 90,
    min: 10,
    max: 14,
    price: 70,
    level: 'beginner',
    equipment: 'Sálová obuv',
    approvalMode: 'open',
    organizerKey: 'jakub.trnka',
    approved: 6,
  },
  {
    key: 'k-kolo-trebic',
    title: 'Na kole podél Jihlavy',
    description:
      'Z Třebíče údolím řeky k Vladislavi a zpět, kolem 35 km. Pro rekreační cyklisty, pár kopců to má. Zdarma, svačina s sebou.',
    activitySlug: 'cyklistika',
    localitySlug: 'trebic',
    address: 'Karlovo náměstí, Třebíč',
    days: 8,
    time: '10:00',
    durationMinutes: 210,
    min: 3,
    max: 10,
    level: 'all',
    equipment: 'Kolo, helma',
    approvalMode: 'open',
    organizerKey: 'milos.bednar',
    approved: 4,
  },

  // Karlovarský kraj
  {
    key: 'k-diana',
    title: 'Výšlap k rozhledně Diana',
    description:
      'Lesem od Grandhotelu Pupp k rozhledně, nahoře výhled na celé Vary, dolů lanovkou nebo pěšky. Pro každého, kolem 6 km. Zdarma.',
    activitySlug: 'turistika',
    localitySlug: 'karlovy-vary',
    address: 'Lanovka Diana, dolní stanice, Mariánská, Karlovy Vary',
    days: 5,
    time: '10:00',
    durationMinutes: 180,
    min: 3,
    max: 12,
    level: 'all',
    equipment: 'Pevné boty',
    approvalMode: 'open',
    organizerKey: 'olga.benediktova',
    approved: 4,
  },
  {
    key: 'k-badminton-kv',
    title: 'Badmintonová čtyřhra v KV Areně',
    description:
      'Hrajeme čtyřhry na dvou kurtech a střídáme dvojice. Pro mírně pokročilé. Kurt 150 Kč na osobu.',
    activitySlug: 'badminton',
    localitySlug: 'karlovy-vary',
    address: 'KV Arena, Západní 1812/73, Karlovy Vary',
    days: 20,
    time: '18:00',
    durationMinutes: 120,
    min: 4,
    max: 8,
    price: 150,
    level: 'advanced',
    equipment: 'Raketa, sálová obuv',
    approvalMode: 'open',
    organizerKey: 'stepan.kolinsky',
    approved: 3,
  },

  // Středočeský kraj
  {
    key: 'k-beh-kmochuv-ostrov',
    title: 'Běh kolem Kmochova ostrova',
    description:
      'Dva okruhy podél Labe, celkem kolem 6 km. Pro začínající běžce a maminky, které si chtějí vyběhnout. Zdarma, kočárky vítány.',
    activitySlug: 'beh',
    localitySlug: 'kolin',
    address: 'Kmochův ostrov, Kolín',
    days: 2,
    time: '18:00',
    durationMinutes: 60,
    min: 2,
    max: 10,
    level: 'beginner',
    approvalMode: 'open',
    organizerKey: 'veronika.hola',
    approved: 3,
  },
  {
    key: 'k-foto-barbora',
    title: 'Fotovycházka kolem chrámu sv. Barbory',
    description:
      'Projdeme Barborskou ulici, Vlašský dvůr a zákoutí, kam turisté nechodí. Pro fotografy s foťákem i mobilem. Zdarma, vstup do chrámu si platí každý sám.',
    activitySlug: 'fotografie',
    localitySlug: 'kutna-hora',
    address: 'Chrám sv. Barbory, Barborská, Kutná Hora',
    days: 10,
    time: '14:30',
    durationMinutes: 150,
    min: 3,
    max: 10,
    level: 'all',
    equipment: 'Foťák nebo mobil',
    approvalMode: 'open',
    organizerKey: 'marcela.pilna',
    approved: 5,
  },
  {
    key: 'k-florbal-kladno',
    title: 'Florbal na Sletišti',
    description:
      'Rekreační florbal pro dospělé, hrajeme pět na pět s brankáři. Pro hráče všech úrovní. Hala 70 Kč na osobu.',
    activitySlug: 'florbal',
    localitySlug: 'kladno',
    address: 'Sportovní hala Sletiště, Kladno',
    days: 15,
    time: '19:00',
    durationMinutes: 90,
    min: 10,
    max: 14,
    price: 70,
    level: 'all',
    equipment: 'Hokejka, sálová obuv',
    approvalMode: 'open',
    organizerKey: 'jaromir.vitek',
    approved: 7,
  },
  {
    key: 'k-salsa-mb',
    title: 'Salsa pro začátečníky',
    description:
      'Základní kroky, otočky a první figury ve dvojici. Pro úplné začátečníky, partnera mít nemusíte. Lekce 120 Kč.',
    activitySlug: 'tanec',
    localitySlug: 'mlada-boleslav',
    address: 'Dům kultury, Mladá Boleslav',
    days: 14,
    time: '19:00',
    durationMinutes: 90,
    min: 6,
    max: 16,
    price: 120,
    level: 'beginner',
    equipment: 'Pohodlné boty s hladkou podrážkou',
    approvalMode: 'open',
    organizerKey: 'simona.kuncova',
    approved: 7,
  },

  // Jižní Čechy
  {
    key: 'k-beh-jordan',
    title: 'Běh kolem Jordánu',
    description:
      'Okruh kolem nejstarší přehrady ve střední Evropě, kolem 5 km. Pro začátečníky i pokročilé. Zdarma.',
    activitySlug: 'beh',
    localitySlug: 'tabor',
    address: 'Rybník Jordán, u hráze, Tábor',
    days: 3,
    time: '17:30',
    durationMinutes: 60,
    min: 2,
    max: 10,
    level: 'all',
    approvalMode: 'open',
    organizerKey: 'lucie.svecova',
    approved: 3,
  },
  {
    key: 'k-volejbal-pisek',
    title: 'Volejbal v Písku',
    description:
      'Pánský i smíšený volejbal, hrajeme na tři sety. Pro hráče, kteří chtějí hrát pravidelně a soutěživě. Hala 70 Kč na osobu.',
    activitySlug: 'volejbal',
    localitySlug: 'pisek',
    address: 'Tělocvična gymnázia, Komenského 89, Písek',
    days: 9,
    time: '19:00',
    durationMinutes: 120,
    min: 8,
    max: 12,
    price: 70,
    level: 'advanced',
    equipment: 'Sálová obuv',
    approvalMode: 'open',
    organizerKey: 'vladimir.rehor',
    approved: 8,
  },
  {
    key: 'k-prochazka-otava',
    title: 'Procházka podél Otavy pro seniory',
    description:
      'Pomalá procházka od Kamenného mostu k Václavským mlýnům a zpět, cestou lavičky a kavárna. Pro seniory a všechny, kdo chtějí klidné tempo. Zdarma.',
    activitySlug: 'turistika',
    localitySlug: 'pisek',
    address: 'Kamenný most, Písek',
    days: 16,
    time: '10:00',
    durationMinutes: 120,
    min: 3,
    max: 15,
    level: 'beginner',
    equipment: 'Pohodlné boty, hůlky kdo používá',
    approvalMode: 'open',
    organizerKey: 'jarmila.kroupova',
    approved: 6,
  },

  // Sever, východ a Morava
  {
    key: 'k-krkonose-trutnov',
    title: 'Podzimní výlet do podhůří Krkonoš',
    description:
      'Z Trutnova přes Hádek na Žacléřskou chatu, kolem 18 km a 600 m převýšení. Pro zdatné turisty. Zdarma, zpátky autobusem.',
    activitySlug: 'turistika',
    localitySlug: 'trutnov',
    address: 'Krakonošovo náměstí, Trutnov',
    days: 11,
    time: '08:30',
    durationMinutes: 360,
    min: 3,
    max: 12,
    level: 'advanced',
    equipment: 'Turistické boty, nepromokavá bunda, jídlo',
    approvalMode: 'open',
    organizerKey: 'filip.lukes',
    approved: 4,
  },
  {
    key: 'k-beh-msneno',
    title: 'Běh kolem přehrady Mšeno',
    description:
      'Okruh kolem přehrady a lesem nad ní, asi 6 km. Pro běžce všech úrovní. Zdarma.',
    activitySlug: 'beh',
    localitySlug: 'jablonec-nad-nisou',
    address: 'Přehrada Mšeno, u hráze, Jablonec nad Nisou',
    days: 6,
    time: '17:00',
    durationMinutes: 60,
    min: 2,
    max: 10,
    level: 'all',
    equipment: 'Čelovka',
    approvalMode: 'open',
    organizerKey: 'erik.schovanek',
    approved: 2,
  },
  {
    key: 'k-nordic-teplice',
    title: 'Nordic walking v Zámecké zahradě',
    description:
      'Naučím vás správnou techniku chůze s holemi a projdeme zahradu i park. Pro seniory a lidi po zranění. Zdarma, hole dvě půjčím.',
    activitySlug: 'jiny-pohyb',
    localitySlug: 'teplice',
    address: 'Zámecká zahrada, Teplice',
    days: 4,
    time: '09:00',
    durationMinutes: 90,
    min: 3,
    max: 12,
    level: 'beginner',
    equipment: 'Hole na nordic walking',
    approvalMode: 'open',
    organizerKey: 'vera.smidova',
    approved: 4,
  },
  {
    key: 'k-beh-sumperk',
    title: 'Běžecký trénink v Šumperku',
    description:
      'Rozběhání, rovinky a posilování v parku. Pro běžce, kteří se chystají na jarní závody. Zdarma.',
    activitySlug: 'beh',
    localitySlug: 'sumperk',
    address: 'Sady 1. máje, Šumperk',
    days: 5,
    time: '17:30',
    durationMinutes: 75,
    min: 2,
    max: 12,
    level: 'all',
    equipment: 'Běžecké boty',
    approvalMode: 'open',
    organizerKey: 'natalie.coufalova',
    approved: 5,
  },
  {
    key: 'k-praded',
    title: 'Na Praděd z Karlovy Studánky',
    description:
      'Výstup kolem 10 km a 800 m převýšení, nahoře může ležet sníh. Pro zdatné turisty. Zdarma, odjezd vlakem a autobusem ze Šumperku.',
    activitySlug: 'turistika',
    localitySlug: 'sumperk',
    address: 'Vlakové nádraží Šumperk',
    days: 26,
    time: '07:30',
    durationMinutes: 480,
    min: 3,
    max: 10,
    level: 'advanced',
    equipment: 'Zimní boty, návleky, teplé vrstvy',
    approvalMode: 'approval',
    organizerKey: 'bohumil.strnad',
    approved: 4,
    pending: 2,
  },
  {
    key: 'k-uklid-opava',
    title: 'Úklid Městských sadů',
    description:
      'Uklízíme listí a odpadky v Městských sadech spolu s místní školou. Pro rodiny, seniory i studenty. Zdarma, hrabla a pytle zajistí město.',
    activitySlug: 'uklid-prirody',
    localitySlug: 'opava',
    address: 'Městské sady, u Slezského divadla, Opava',
    days: 12,
    time: '09:00',
    durationMinutes: 180,
    min: 4,
    max: 20,
    level: 'all',
    equipment: 'Pracovní rukavice',
    approvalMode: 'open',
    organizerKey: 'zuzana.bednarikova',
    approved: 6,
  },
  {
    key: 'k-lysa-hora',
    title: 'Výstup na Lysou horu',
    description:
      'Z Ostravice po červené na vrchol a zpátky přes Butořanku, kolem 16 km. Pro zdatné turisty. Zdarma, odjezd vlakem z Frýdku-Místku.',
    activitySlug: 'turistika',
    localitySlug: 'frydek-mistek',
    address: 'Vlakové nádraží Frýdek-Místek',
    days: 7,
    time: '07:30',
    durationMinutes: 480,
    min: 3,
    max: 12,
    level: 'advanced',
    equipment: 'Turistické boty, jídlo, teplé vrstvy',
    approvalMode: 'open',
    organizerKey: 'antonin.kostka',
    approved: 6,
  },
  {
    key: 'k-vinice-znojmo',
    title: 'Procházka vinicemi nad Dyjí',
    description:
      'Od hradu přes Gránické údolí k vinicím, na konci ochutnávka ve sklepě. Pro dospělé, kolem 9 km. Ochutnávka 150 Kč, procházka zdarma.',
    activitySlug: 'turistika',
    localitySlug: 'znojmo',
    address: 'Znojemský hrad, Hradní, Znojmo',
    days: 10,
    time: '13:00',
    durationMinutes: 210,
    min: 3,
    max: 14,
    price: 150,
    level: 'all',
    equipment: 'Pevné boty',
    approvalMode: 'open',
    organizerKey: 'lenka.vintrova',
    approved: 5,
  },
];

// ---------------------------------------------------------------------------
// Skupiny
// ---------------------------------------------------------------------------

/** Plán skupiny: správci jmenovitě, členy a žádosti vybere `buildGroups`. */
export type CommunityGroupPlan = {
  key: string;
  name: string;
  description: string;
  activitySlug: DemoActivitySlug;
  localitySlug: string;
  type: 'public' | 'closed';
  adminKeys: string[];
  members: number;
  /** Čekající žádosti – jen u neveřejné skupiny, do veřejné se vstupuje hned. */
  pending?: number;
};

export const communityGroupPlans: CommunityGroupPlan[] = [
  {
    key: 'kg-bezci-stromovka',
    name: 'Běžci ze Stromovky',
    description:
      'Běháme v úterý a ve čtvrtek v 7:00 od vchodu do Stromovky u Výstaviště. Tempo kolem 6 min/km, okruh 7 km, nikoho nenecháme vzadu.',
    activitySlug: 'beh',
    localitySlug: 'praha-7',
    type: 'public',
    adminKeys: ['jakub.vondracek'],
    members: 11,
  },
  {
    key: 'kg-deskovky-vinohrady',
    name: 'Deskoherní večery Vinohrady a Holešovice',
    description:
      'Scházíme se každou středu od 18:30 ve Vnitroblocku a jednou za měsíc u někoho doma. Hrajeme od rodinných her po těžká eura, nováčky vždycky naučíme.',
    activitySlug: 'deskove-hry',
    localitySlug: 'praha-7',
    type: 'closed',
    adminKeys: ['barbora.machova'],
    members: 9,
    pending: 2,
  },
  {
    key: 'kg-volejbal-sokol',
    name: 'Volejbal Sokol Vinohrady',
    description:
      'Stálá parta na smíšený volejbal, hrajeme každý čtvrtek od 19:30 v tělocvičně Sokola Vinohrady na Polské. Hledáme hlavně hráče na střed sítě.',
    activitySlug: 'volejbal',
    localitySlug: 'praha-2',
    type: 'closed',
    adminKeys: ['ondrej.kratochvil', 'simona.vackova'],
    members: 10,
    pending: 2,
  },
  {
    key: 'kg-lezci-smichov',
    name: 'Lezci ze Smíchova',
    description:
      'V zimě lezeme na SmíchOFFu v pondělí a ve středu od 18:00, od jara jezdíme o víkendech na skály do Českého ráje a na Labák. Začátečníky naučíme jistit.',
    activitySlug: 'lezeni',
    localitySlug: 'praha-5',
    type: 'closed',
    adminKeys: ['vojtech.matousek'],
    members: 6,
    pending: 2,
  },
  {
    key: 'kg-hokej-praha',
    name: 'Amatérský hokej Praha',
    description:
      'Led máme každý druhý čtvrtek od 21:00 na Kobře v Braníku. Hrajeme bez bodyčeků, nájem ledu se dělí mezi hráče, brankáři hrají zdarma.',
    activitySlug: 'ledni-hokej',
    localitySlug: 'praha-4',
    type: 'closed',
    adminKeys: ['petr.charvat', 'daniel.pavlik'],
    members: 12,
    pending: 1,
  },
  {
    key: 'kg-volejbal-brno',
    name: 'Brněnští volejbalisti',
    description:
      'Hrajeme každé úterý od 19:00 ve Vodově a v létě beach na Kraví hoře. Úroveň od mírně pokročilých výš, rádi vezmeme i nováčky na zkoušku.',
    activitySlug: 'volejbal',
    localitySlug: 'brno',
    type: 'public',
    adminKeys: ['radim.kuchar'],
    members: 8,
  },
  {
    key: 'kg-kviz-brno',
    name: 'Kvízový tým Brno',
    description:
      'Na kvízy chodíme jednou týdně, nejčastěji do Baru, který neexistuje na Dvořákově. Tým má šest míst, hledáme lidi na sport a přírodní vědy.',
    activitySlug: 'pub-kviz',
    localitySlug: 'brno',
    type: 'closed',
    adminKeys: ['aneta.dvorska'],
    members: 5,
    pending: 1,
  },
  {
    key: 'kg-turiste-ostrava',
    name: 'Ostravští turisté',
    description:
      'Každou druhou neděli vyrážíme do Beskyd nebo po ostravských haldách, sraz v 8:00 na hlavním nádraží. Tempo pohodové, děti a psi vítáni.',
    activitySlug: 'turistika',
    localitySlug: 'ostrava',
    type: 'public',
    adminKeys: ['lucie.kubalova'],
    members: 7,
  },
  {
    key: 'kg-bezci-plzen',
    name: 'Běžci od Boleváku',
    description:
      'Běháme v pondělí a ve čtvrtek v 17:30 od hráze Boleveckého rybníka. Dvě skupiny podle tempa, v zimě s čelovkami.',
    activitySlug: 'beh',
    localitySlug: 'plzen',
    type: 'public',
    adminKeys: ['jaroslav.korinek'],
    members: 5,
  },
  {
    key: 'kg-atletika-uo',
    name: 'Atletika Ústí nad Orlicí a okolí',
    description:
      'Trénujeme na stadionu TJ Jiskra v úterý a ve čtvrtek od 17:00, děti i dospělí. Pořádáme podzimní a jarní závody pro veřejnost.',
    activitySlug: 'atletika',
    localitySlug: 'usti-nad-orlici',
    type: 'public',
    adminKeys: ['petr.hejl', 'marie.kosova'],
    members: 8,
  },
  {
    key: 'kg-hokej-pardubice',
    name: 'Hokejisti z Pardubic',
    description:
      'Amatérský hokej každý čtvrtek od 21:15 v enteria areně. Do skupiny bereme hráče s vlastní výstrojí, brankáře vždycky.',
    activitySlug: 'ledni-hokej',
    localitySlug: 'pardubice',
    type: 'closed',
    adminKeys: ['lukas.kopriva'],
    members: 10,
    pending: 2,
  },
  {
    key: 'kg-horalove-liberec',
    name: 'Liberečtí horalové',
    description:
      'Jezdíme na Ještěd, do Jizerek a v zimě na běžky. Výlety plánujeme ve skupině, sraz obvykle v 8:30 u dolní stanice lanovky v Hanychově.',
    activitySlug: 'turistika',
    localitySlug: 'liberec',
    type: 'public',
    adminKeys: ['sarka.medkova'],
    members: 5,
  },
  {
    key: 'kg-tandem-olomouc',
    name: 'Olomoucký jazykový tandem',
    description:
      'Každý čtvrtek od 18:00 v Café 87 na Denisově. Střídáme češtinu, angličtinu a španělštinu, chodí studenti z Erasmu i místní.',
    activitySlug: 'jazykovy-tandem',
    localitySlug: 'olomouc',
    type: 'public',
    adminKeys: ['kristyna.paurova'],
    members: 8,
  },
  {
    key: 'kg-deskovky-zlin',
    name: 'Zlínští deskovkáři',
    description:
      'Hrajeme každou druhou sobotu od 16:30 v knihovně v Baťově institutu. Hry půjčuje knihovna, vlastní přineste klidně taky.',
    activitySlug: 'deskove-hry',
    localitySlug: 'zlin',
    type: 'public',
    adminKeys: ['andrea.vaculikova'],
    members: 5,
  },
  {
    key: 'kg-florbal-cb',
    name: 'Florbal Budějovice',
    description:
      'Hrajeme v pondělí a ve čtvrtek od 19:00 v tělocvičně na Jírovcově. Hala se platí na pololetí, proto nové hráče bereme po domluvě.',
    activitySlug: 'florbal',
    localitySlug: 'ceske-budejovice',
    type: 'closed',
    adminKeys: ['pavel.broz'],
    members: 8,
    pending: 1,
  },
  {
    key: 'kg-sachy-usti',
    name: 'Šachisti z Ústí nad Labem',
    description:
      'Scházíme se každou středu od 16:00 ve Severočeské vědecké knihovně na Velké Hradební. Děti i dospělí, turnaje jednou za měsíc.',
    activitySlug: 'sachy',
    localitySlug: 'usti-nad-labem',
    type: 'public',
    adminKeys: ['zdenek.bauer'],
    members: 4,
  },
];

// ---------------------------------------------------------------------------
// Výběr účastníků a členů (deterministický)
// ---------------------------------------------------------------------------

/** Kraj každého města s komunitními daty; Praha a obvody tvoří jeden „kraj“. */
const REGION: Record<string, string> = {
  brno: 'jm',
  znojmo: 'jm',
  ostrava: 'ms',
  opava: 'ms',
  'frydek-mistek': 'ms',
  plzen: 'pl',
  olomouc: 'ol',
  sumperk: 'ol',
  liberec: 'lb',
  'jablonec-nad-nisou': 'lb',
  'hradec-kralove': 'hk',
  trutnov: 'hk',
  pardubice: 'pa',
  'usti-nad-orlici': 'pa',
  'ceska-trebova': 'pa',
  chocen: 'pa',
  litomysl: 'pa',
  'ceske-budejovice': 'jc',
  tabor: 'jc',
  pisek: 'jc',
  'usti-nad-labem': 'ul',
  teplice: 'ul',
  zlin: 'zl',
  'uherske-hradiste': 'zl',
  jihlava: 'vy',
  trebic: 'vy',
  'karlovy-vary': 'kv',
  kolin: 'sc',
  'kutna-hora': 'sc',
  kladno: 'sc',
  'mlada-boleslav': 'sc',
};

/** Sousední kraje: na pravidelné hraní se nejezdí přes půl republiky. */
const NEIGHBOURS: Record<string, string[]> = {
  praha: ['sc'],
  sc: ['praha', 'jc', 'pl', 'ul', 'lb', 'hk', 'pa', 'vy'],
  jc: ['sc', 'pl', 'vy', 'jm'],
  pl: ['kv', 'ul', 'sc', 'jc'],
  kv: ['pl', 'ul'],
  ul: ['kv', 'pl', 'sc', 'lb'],
  lb: ['ul', 'sc', 'hk'],
  hk: ['lb', 'sc', 'pa'],
  pa: ['hk', 'sc', 'vy', 'ol', 'jm'],
  vy: ['jc', 'sc', 'pa', 'jm'],
  jm: ['vy', 'jc', 'pa', 'ol', 'zl'],
  ol: ['pa', 'jm', 'zl', 'ms'],
  zl: ['jm', 'ol', 'ms'],
  ms: ['ol', 'zl'],
};

/** Praha a pražské obvody (praha, praha-1 … praha-22). */
export const isPrague = (localitySlug: string): boolean =>
  localitySlug === 'praha' || localitySlug.startsWith('praha-');

const cityOf = (slug: string): string => (isPrague(slug) ? 'praha' : slug);
const regionOf = (slug: string): string =>
  isPrague(slug) ? 'praha' : (REGION[slug] ?? slug);

/** FNV-1a: stabilní „náhodné“ pořadí bez generátoru náhody. */
const hash = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const verifiedUsers = communityUsers.filter((user) => user.emailVerified);

/**
 * Kandidáti seřazení podle blízkosti a zájmu: město > kraj > sousední kraj, se zájmem
 * o aktivitu napřed. Lidé ze vzdálených krajů jen u akcí `wide` (závody).
 */
const rankCandidates = (
  place: {
    key: string;
    localitySlug: string;
    activitySlug: string;
    wide?: true;
  },
  exclude: (userKey: string) => boolean,
): CommunityUser[] =>
  verifiedUsers
    .filter((user) => !exclude(user.key))
    .map((user) => {
      const home = regionOf(user.homeLocalitySlug);
      const region = regionOf(place.localitySlug);
      const near =
        cityOf(user.homeLocalitySlug) === cityOf(place.localitySlug)
          ? 6
          : home === region
            ? 4
            : NEIGHBOURS[region]?.includes(home)
              ? 2
              : 0;
      const interested = user.interestSlugs.includes(
        place.activitySlug as DemoActivitySlug,
      )
        ? 1
        : 0;
      return {
        user,
        near,
        score: near + interested,
        tie: hash(place.key + user.key),
      };
    })
    .filter(({ near }) => near > 0 || place.wide)
    .sort((a, b) => b.score - a.score || a.tie - b.tie)
    .map(({ user }) => user);

const requestMessages = [
  'Ahoj, můžu se přidat? Bydlím kousek a termín mi přesně vychází.',
  'Dobrý den, úroveň mi sedí a vybavení mám vlastní.',
  'Ahoj, budu tu poprvé. Klidně přijdu dřív a pomůžu s přípravou.',
  'Mám čas i chuť. Kdyby bylo plno, nevadí, zkusím to příště.',
  undefined,
];

const groupRequestMessages = [
  'Ahoj, hledám pravidelnou partu a tohle vypadá přesně podle mých představ.',
  'Dobrý den, bydlím nově v okolí a hledám lidi na pravidelné hraní.',
  'Zdravím, chodím na vaše akce už měsíc, můžu do skupiny?',
  undefined,
];

const pickMessage = <T>(pool: T[], seed: string): T =>
  pool[hash(seed) % pool.length];

/** Souřadnice měst z katalogu (krajská města a Praha z demo-data.ts, ostatní z czech-towns.ts). */
const townCoordinates = new Map<string, { lat: number; lng: number }>(
  [...demoLocalities, ...czechTowns].map((l) => [
    l.slug,
    { lat: l.lat, lng: l.lng },
  ]),
);

/** Souřadnice místa akce: střed města z katalogu ± do ~1 km, stabilně podle klíče. */
const nearTown = (
  localitySlug: string,
  key: string,
): { lat: number; lng: number } => {
  const town = townCoordinates.get(localitySlug);
  if (!town) return { lat: 0, lng: 0 }; // spec to odhalí: lokalita mimo katalog
  const h = hash(key);
  const round = (value: number): number => Math.round(value * 10_000) / 10_000;
  return {
    lat: round(town.lat + ((h % 1000) / 1000 - 0.5) * 0.016),
    lng: round(town.lng + ((Math.floor(h / 1000) % 1000) / 1000 - 0.5) * 0.024),
  };
};

const buildEvents = (plans: CommunityEventPlan[]): CommunityEvent[] => {
  // kdo má který den (dny od seedu) už akci – nikdo nemá dvě akce v jeden den
  const busy = new Map<string, Set<number>>();
  const isBusy = (userKey: string, day: number): boolean =>
    busy.get(userKey)?.has(day) ?? false;
  const markBusy = (userKey: string, day: number): void => {
    busy.set(userKey, (busy.get(userKey) ?? new Set()).add(day));
  };

  // organizátoři mají svůj den obsazený dřív, než se kohokoli začne vybírat
  plans.forEach((plan) => markBusy(plan.organizerKey, plan.days));

  return plans.map((plan) => {
    const candidates = rankCandidates(
      plan,
      (userKey) => userKey === plan.organizerKey || isBusy(userKey, plan.days),
    );
    const approved = candidates.slice(0, plan.approved);
    const pending = candidates.slice(
      plan.approved,
      plan.approved + (plan.pending ?? 0),
    );
    const withdrawn = candidates.slice(
      plan.approved + (plan.pending ?? 0),
      plan.approved + (plan.pending ?? 0) + (plan.withdrawn ?? 0),
    );
    [...approved, ...pending].forEach((user) => markBusy(user.key, plan.days));

    return {
      key: plan.key,
      title: plan.title,
      description: plan.description,
      activitySlug: plan.activitySlug,
      schedule: { daysFromNow: plan.days, time: plan.time },
      durationMinutes: plan.durationMinutes,
      address: plan.address,
      localitySlug: plan.localitySlug,
      ...nearTown(plan.localitySlug, plan.key),
      minParticipants: plan.min,
      maxParticipants: plan.max,
      price: plan.price,
      level: plan.level,
      equipment: plan.equipment,
      approvalMode: plan.approvalMode,
      visibility: 'public',
      organizerKey: plan.organizerKey,
      status: 'published',
      participations: [
        ...approved.map((user) => ({
          userKey: user.key,
          status: 'approved' as const,
        })),
        ...pending.map((user) => ({
          userKey: user.key,
          status: 'pending' as const,
          message: pickMessage(requestMessages, plan.key + user.key),
        })),
        ...withdrawn.map((user) => ({
          userKey: user.key,
          status: 'withdrawn' as const,
        })),
      ],
    };
  });
};

const buildGroups = (plans: CommunityGroupPlan[]): CommunityGroup[] =>
  plans.map((plan) => {
    const admins = new Set(plan.adminKeys);
    const candidates = rankCandidates(plan, (userKey) => admins.has(userKey));
    const members = candidates.slice(0, plan.members);
    const pending = candidates.slice(
      plan.members,
      plan.members + (plan.pending ?? 0),
    );
    return {
      key: plan.key,
      name: plan.name,
      description: plan.description,
      activitySlug: plan.activitySlug,
      localitySlug: plan.localitySlug,
      type: plan.type,
      status: 'active',
      members: [
        ...plan.adminKeys.map((userKey) => ({
          userKey,
          role: 'admin' as const,
          status: 'active' as const,
        })),
        ...members.map((user) => ({
          userKey: user.key,
          role: 'member' as const,
          status: 'active' as const,
        })),
        ...pending.map((user) => ({
          userKey: user.key,
          role: 'member' as const,
          status: 'pending' as const,
          message: pickMessage(groupRequestMessages, plan.key + user.key),
        })),
      ],
    };
  });

export const communityEvents: CommunityEvent[] =
  buildEvents(communityEventPlans);
export const communityGroups: CommunityGroup[] =
  buildGroups(communityGroupPlans);
