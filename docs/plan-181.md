# Plán #181: testovací data v2

Plán k [#181](https://github.com/applifting-vsecourse/team-3/issues/181), nálezy k datům v [#167](https://github.com/applifting-vsecourse/team-3/issues/167). Otázky z návrhu jsou rozhodnuté, odpovědi jsou na konci (R1–R6) a plán na ně odkazuje.

## Výchozí stav

- Seed má tři vrstvy, každou se svou značkou „už vloženo“:
  - demo data #47 ([seed-demo.ts](../apps/backend/src/scripts/seed/seed/seed-demo.ts)) jen do databáze **bez akcí a skupin**,
  - komunita #150 ([seed-community.ts](../apps/backend/src/scripts/seed/seed/seed-community.ts)), když chybí **akce komunitního uživatele**,
  - proběhlé akce s hodnocením #180 ([seed-ratings.ts](../apps/backend/src/scripts/seed/seed/seed-ratings.ts)), když chybí **jakékoli `ParticipantRating`**.
- Žádná vrstva nemá verzi. Změnu dat (třeba oprava padelu) staging nedostane, dokud někdo ručně nevyčistí databázi. To je první AK.
- `ensureUser` nastaví profil jen při založení účtu, opakovaný seed ho nepřepíše.
- Mimo Prahu: 80 komunitních akcí, krajská města mají **celkem** 2–7 akcí (Brno 7, Plzeň 3, Liberec 2). Filtr město + aktivita je skoro vždy prázdný (#167, 28×).
- Proběhlé akce: 4, jen demo účty v Praze. Akce skupin (`Event.groupId`): žádné.
- Komunitní uživatelé na krajské město: Brno 9, Ostrava 5, Plzeň a Olomouc 4, ostatní 2–3.

## 1. Verze dat a reseed

### Kde je verze

```prisma
/// Verze testovacích dat, která je v databázi (#181). Jeden řádek na sadu dat (`key` = "demo").
/// Seed porovná `version` s SEED_DATA_VERSION v kódu a při rozdílu data vymění.
model SeedState {
  key       String   @id
  version   Int
  appliedAt DateTime @default(now())

  @@map("seed_state")
}
```

V kódu `SEED_DATA_VERSION` v [seed-content.ts](../apps/backend/src/scripts/seed/seed/seed-content.ts). Nová verze dat = PR, který změní data **a** zvedne číslo. Po merge do main ji staging dostane při startu kontejneru, bez ručního zásahu.

### Co seed udělá

1. Katalog a superadmin jako dnes.
2. Účty demo i komunity přes `ensureUser`, jako dnes (zakládá jen chybějící).
3. V **jedné transakci pod jedním advisory lockem**:
   - přečte `SeedState`; když `version == SEED_DATA_VERSION`, skončí,
   - smaže obsah seedu (níž), nastaví profily seedových účtů podle dat, vloží všechno znovu s čerstvými termíny,
   - zapíše novou verzi.

Databáze bez řádku `SeedState` (dnešní staging, lokální databáze, nová databáze) má verzi 0, takže dostane v2 hned při prvním startu. Tři dnešní značky „už vloženo“ zmizí, nahradí je jedna verze.

### Co je „obsah seedu“ (R1)

Seedové účty = e-maily z `demoUsers` a `communityUsers` (superadmin ne). Smaže se:

- **akce, které organizuje seedový účet**; kaskádou s nimi účasti, obě hodnocení, zprávy a záznamy upozornění (u plateb se `eventId` vynuluje),
- **skupiny, kde je správcem seedový účet**, kaskádou členství; akce v těchto skupinách i od testerů (jinak by smazání skupiny zablokoval `onDelete: Restrict`).

Zůstane: účty a akce testerů, katalog, superadmin, hesla seedových účtů. Přihlášky testerů na seedové akce a jejich členství v seedových skupinách zmizí s nimi, protože ty akce a skupiny se vkládají znovu.

**Profily seedových účtů** (jméno, bio, domovská lokalita, zájmy, ověřený e-mail) se při změně verze nastaví podle dat. Tester mohl demo účet v aplikaci přepsat a PO pak ukazuje jiný profil, než popisuje README. Heslo seed nemění (R4).

### Výkon

Dnes se akce vkládají po jedné (`event.create` s vnořenými účastmi). V2 bude mít kolem 450 akcí, takže seed si ID vygeneruje sám (`randomUUID()`) a vloží všechno po tabulkách přes `createMany`: skupiny, členství, akce, účasti, hodnocení, hodnocení účastníků. Šest dotazů místo stovek, transakce se vejde do limitu i na stagingu.

## 2. Krajská města (AK 2, R2)

**Běžné aktivity** (`COMMON_ACTIVITIES`, 10): běh, turistika, volejbal, badminton, fotbal, florbal, jóga, deskové hry, stolní tenis, plavání. Vybrané podle zájmů komunity a nálezů z #167; seznam jde snadno upravit (R5).

**Krajská města** (12 + Praha): Brno, Ostrava, Plzeň, Olomouc, Liberec, Hradec Králové, Pardubice, České Budějovice, Ústí nad Labem, Zlín, Jihlava, Karlovy Vary.

- V každém krajském městě má každá běžná aktivita **aspoň 2 nadcházející veřejné akce**. Chybějící doplní nový soubor `data/regional-data.ts`: ~200 akcí.
- Akce se generují ze **šablon** (aktivita → 3–4 varianty názvu, popisu, délky, kapacity a ceny) a **míst ve městě** (město → park, hala, bazén, kavárna, hospoda se skutečnými adresami, ~5 na město). Výběr je deterministický (stejný `hash` jako v komunitě), termíny 1–28 dní od seedu.
- Účastníky vybírá existující `rankCandidates` (město → kraj → sousední kraj, zájem napřed). Aby měli organizátoři a účastníci z čeho brát, přibude kolem 30 komunitních uživatelů, aspoň 6 ověřených na krajské město.
- Obsazenost se střídá: chybí lidé / volná místa / plno, ale **žádná aktivita v žádném městě nemá jen plné akce**.
- Kromě běžných aktivit pár akcí u aktivit z repra #167 (šipky a bowling, kulečník, bruslení, rybaření) ve větších městech.

**Testy** (`regional-data.spec.ts`): každé krajské město × běžná aktivita ≥ 2 nadcházející veřejné akce; každá aktivita, která má nadcházející akci, má aspoň jednu neplnou (celá data, ne jen krajská); počet akcí na kraj ≥ minimum; souřadnice v katalogu města; nikdo dvě akce v jeden den.

Pravidlo živého dema zůstává: pražská akce v prvních 8 dnech nesmí „chybět lidi“ (první karta Chybí lidé + Příštích 7 dní je „Volejbal na Pankráci – chybí jeden“).

## 3. Proběhlé akce a hodnocení (AK 3, AK 4)

Nový generátor proběhlých akcí v `data/past-data.ts` (dnešní `rating-data.ts` zůstane, jeho 4 akce jsou ručně připravené případy pro profil Petry a Jakuba):

- **~80 proběhlých akcí** za posledních 60 dní: v Praze i krajských městech, organizátoři z demo i komunity, pár zrušených. Historie v profilu (#178), proběhlé akce skupin (#70) a filtr Proběhlé (#61) tak mají co ukázat.
- **Hodnocení akce a organizátora** (`Rating`) od většiny schválených účastníků, část s komentářem; **hodnocení účastníků** (`ParticipantRating`) od organizátora u většiny účastí. Rozložení hvězdiček realistické (většina 4–5, občas 2–3), pár organizátorů s výrazně horším průměrem pro sekci „od dobře hodnocených organizátorů“ (#182).
- Pravidla #180 hlídá test přes `decideParticipantRating`: jen `approved` účast, akce proběhla, organizátor nehodnotí sám sebe.

## 4. Akce skupin (AK 4, R3)

Nový `data/group-events-data.ts`. Každá aktivní skupina (demo 10 + komunita 16):

- 1–2 **nadcházející akce**: část veřejných, část jen pro členy (`visibility: members`),
- 1–3 **proběhlé akce** s hodnocením,
- organizátor je správce skupiny, účastníci jsou její aktivní členové.

Dokud #70 není v main, akce jen pro členy se v seznamu neukážou a veřejné vypadají jako běžné akce. #70 pak data rovnou má. Hodnocení organizátora u akcí skupin se počítá ke skupině (`organizerRatingSummary` je vynechává), test to ověří.

## 5. Opravy z #167 a profily (AK 4, AK 5)

- **Duplicitní „Běžci ze Stromovky“**: komunitní skupinu `kg-bezci-stromovka` přejmenovat (např. „Holešovičtí běžci“, popis zůstane). Nový test: název skupiny je unikátní v rámci lokality napříč demo i komunitou.
- **Padel s kapacitou 3**: „Padel na Chodově – čtyřhra“ min i max 4, scénář „chybí lidé“ zůstává. Stejnou chybu měl „Badminton v Nuslích – čtyřhra“ (organizátor se do kapacity nepočítá, Q12), opravený stejně; test hlídá, že každá čtyřhra má místo pro čtyři.
- **Zájmy a domovské lokality**: test, že je má každý seedový účet (demo i komunita) a že zájmy jsou z katalogu.

## 6. Kód, dokumentace, pořadí

| Soubor                                                                 | Změna                                                                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma` + migrace                                       | model `SeedState`                                                                               |
| `seed/seed-database.ts`                                                | místo tří vrstev volá `seedContent`                                                             |
| `seed/seed-content.ts` (nový)                                          | smazání obsahu seedu, profily, vložení všeho po tabulkách, zápis verze; místo tří vrstev        |
| `seed/seed-demo.ts`, `seed-community.ts`, `seed-ratings.ts`            | smazané, nahradí je `seed-content.ts` (verze, reseed) a `content-rows.ts` (řádky, čistá funkce) |
| `data/regional-data.ts`, `past-data.ts`, `group-events-data.ts` (nové) | generátory + spec                                                                               |
| `data/community-data.ts`                                               | ~30 uživatelů, přejmenovaná skupina                                                             |
| `data/demo-data.ts`                                                    | padel                                                                                           |
| `README.md`                                                            | „Seeded users“ a „Deployment“: verze dat, jak vydat novou verzi, co reseed smaže                |
| `docs/datovy-model.md`                                                 | `SeedState`                                                                                     |

**Dvě PR, ať mechanismus verze dorazí na staging dřív:**

1. **Verze dat + opravy** (sekce 1 a 5): `SeedState`, reseed, `createMany`, padel, Stromovka, test profilů. `SEED_DATA_VERSION = 2`. Na stagingu se ověří, že se data vyměnila a akce testerů zůstaly.
2. **Obsah v2** (sekce 2–4): krajská města, proběhlé akce, akce skupin. `SEED_DATA_VERSION = 3`. Zároveň první ostré použití postupu z README.

## Rozhodnutí

- **R1** Reseed při změně verze maže jen obsah seedových účtů, ne akce a účty testerů; verze v tabulce `SeedState`.
- **R2** „2–3 akce u běžných aktivit“ = aspoň 2 akce **na každou běžnou aktivitu** v každém krajském městě.
- **R3** Akce skupin jsou v datech už v2, nečeká se na #70.
- **R4** Heslo seedových účtů seed při reseedu nemění; README radí reset přes „Zapomenuté heslo“.
- **R5** Běžných aktivit je 10: běh, turistika, volejbal, badminton, fotbal, florbal, jóga, deskové hry, stolní tenis, plavání.
- **R6** Že první `pnpm dev` po merge vymění i lokální data (včetně akcí založených pod demo účty), stačí napsat do README.
