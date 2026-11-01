# Plán #180: hodnocení účastníka v datovém modelu

Plán k [#180](https://github.com/applifting-vsecourse/team-3/issues/180), zadání [BACKLOG.md › B-060](../BACKLOG.md#b-060-hodnocení-akce-organizátora-a-účastníka), model [datovy-model.md](datovy-model.md). Otázky z návrhu jsou rozhodnuté, odpovědi jsou na konci (R1–R10) a plán na ně odkazuje.

## Výchozí stav

- `Rating` (PR #111) je hodnocení **od účastníka**: `eventStars` a `organizerStars` 1–5, `comment?`, `deletedAt`, unikátní `eventId + userId`. Hvězdičky hlídá jen aplikace, databáze ne (žádný `CHECK`).
- Hodnocení **účastníka organizátorem** v modelu chybí. To je #180.
- V backendu zatím žádný kód hodnocení nečte ani nepíše. Dávání hodnocení je #66 (sprint 4), zobrazení průměrů #178 a #179.
- Testovací data nemají **žádnou proběhlou akci**: seed posouvá každý termín do budoucna ([demo-data.ts](../apps/backend/src/scripts/seed/data/demo-data.ts), `DemoSchedule`). Nemají ani žádné `Rating`.
- Pojem „proběhlá akce“ v backendu zatím nikde není, akce se filtrují jen podle `startsAt > now`.

## 1. Datový model

### Varianty

|                                          | A: samostatný model                                       | B: sloupec v `Participation`                                  | C: samostatný model navázaný na `Participation`                                               |
| ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Tvar                                     | `ParticipantRating` s `eventId`, `participantId`, `stars` | `Participation.organizerStars`, `ratedAt`, `ratingDeletedAt`  | Jako A, navíc složený cizí klíč `(eventId, participantId)` → `Participation(eventId, userId)` |
| „Jedno na účastníka a akci“              | `@@unique([eventId, participantId])`                      | samo z sebe (účast je unikátní)                               | `@@unique([eventId, participantId])`                                                          |
| Hodnocený na akci opravdu byl přihlášený | jen aplikace                                              | samo z sebe                                                   | **databáze** (cizí klíč)                                                                      |
| Soft delete pro B-063                    | vlastní `deletedAt`                                       | další sloupec v účasti, míchá dvě věci                        | vlastní `deletedAt`                                                                           |
| Dopad na existující kód                  | žádný                                                     | mění tabulku, kterou čte a zapisuje celé přihlašování (B-031) | žádný                                                                                         |
| Shoda s `Rating`                         | ano                                                       | ne                                                            | ano                                                                                           |

**Volba: C.** Je to stejný tvar jako `Rating`, takže #66 a B-063 pracují s oběma hodnoceními stejně. Účast se nemění, takže nehrozí kolize s přihlašováním. A složený cizí klíč dává databázovou záruku, že hodnocený se na akci aspoň přihlásil, a to zadarmo: `Participation` už unikátní dvojici `eventId + userId` má. Varianta B je kompaktní, ale do účasti by přidala tři sloupce s jiným životním cyklem (hodnocení se smaže a vrátí nezávisle na účasti).

### Schéma

```prisma
/// Hodnocení účastníka organizátorem akce (#180, B-060), hvězdičky 1–5. Jedno na účastníka
/// a akci, jen po skončení akce a jen u `approved` účasti (hlídá aplikace,
/// decideParticipantRating). `stars` 1–5 hlídá i databáze: CHECK v migraci, Prisma ho ve
/// schématu neumí zapsat. `deletedAt` = smazáno superadminem (jde vrátit, B-063).
model ParticipantRating {
  id            String        @id @default(cuid())
  eventId       String
  event         Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  participantId String
  participation Participation @relation(fields: [eventId, participantId], references: [eventId, userId], onDelete: Cascade)
  stars         Int
  deletedAt     DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @default(now()) @updatedAt

  @@unique([eventId, participantId])
  @@index([participantId])
  @@map("participant_rating")
}
```

Zpětné relace: `Event.participantRatings ParticipantRating[]` a `Participation.rating ParticipantRating?` (1:1, protože obě strany jsou unikátní na `eventId + userId`).

- **Proč i `participantId`, když vede přes účast:** dotaz „všechna hodnocení uživatele X“ pro profil (#178, #179) jde přímo přes `participantId` a index, bez joinu na účast.
- **Bez `raterId`:** hodnotí jen organizátor akce (R3), takže hodnotitel je vždy `event.organizerUserId`. Uložený zvlášť by jen mohl nesouhlasit s akcí.
- **Indexy:** unikátní `(eventId, participantId)` slouží i pro „hodnocení účastníků této akce“ (#66, správa akce). `participantId` je pro průměr v profilu.
- **Mazání:** s akcí i s účastí kaskádou, stejně jako `Rating`. Akce se fyzicky nemaže (Q11) a účet se při B-080 anonymizuje, takže v praxi se nic nesmaže.
- **Bez komentáře:** jen hvězdičky (R5).

## 2. Co hlídá databáze a co čistá funkce

| Pravidlo                                     | Kde                      | Jak                                                                               |
| -------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| Hvězdičky 1–5                                | **databáze** + DTO v #66 | `CHECK (stars BETWEEN 1 AND 5)` v SQL migrace                                     |
| Jedno hodnocení na účastníka a akci          | **databáze**             | `@@unique([eventId, participantId])`                                              |
| Hodnocený se na akci přihlásil               | **databáze**             | složený cizí klíč na `Participation(eventId, userId)`                             |
| Účast je `approved`                          | čistá funkce             | stav účasti se mění, cizí klíč na něj nedosáhne                                   |
| Akce proběhla (a je `published`, ne zrušená) | čistá funkce             | záleží na čase, to databáze hlídat nemá                                           |
| Hodnotí organizátor akce, nikdo jiný (R3)    | čistá funkce             |                                                                                   |
| Organizátor nehodnotí sám sebe               | čistá funkce             | organizátor se na svou akci může přihlásit (Q12), takže může mít `approved` účast |

**CHECK v migraci:** Prisma `CHECK` ve schématu zapsat neumí, proto se přidá ručně do SQL migrace:

```sql
ALTER TABLE "participant_rating"
  ADD CONSTRAINT "participant_rating_stars_check" CHECK ("stars" BETWEEN 1 AND 5);
```

Prisma ho při dalších migracích nechá být (neumí ho přečíst, takže ho ani nesmaže). Po migraci to ověřím přes `prisma migrate diff`, který musí hlásit, že se schéma s databází shoduje. `Rating` zatím `CHECK` nedostane, zůstává to na navazující úkol (R6).

Pravidla „proběhlá akce“ a „approved“ by šla vynutit triggerem. Nedoporučuji to: logika by se rozdělila mezi SQL a TypeScript, CI nemá databázi, takže by ji netestovalo, a pro #66 stejně potřebujeme srozumitelný kód odmítnutí (409) z aplikace.

## 3. Soft delete

`deletedAt` funguje stejně jako u `Rating`. Smazání superadminem nastaví čas, vrácení (B-063) ho nastaví zpět na `null`. Smazané hodnocení se nepočítá do průměru a nikde se nezobrazuje.

Unikátní dvojice platí **i pro smazaná hodnocení**, takže po smazání nejde vytvořit nové, jen vrátit to staré (R7), stejně jako u `Rating`.

Enumy `ReportTargetType` a `ModerationActionType` (dnes `rating` / `delete_rating`) se o hodnocení účastníka rozšíří až v B-061 a B-063 (R8).

## 4. Čisté funkce a testy

Všechno v `apps/backend/src/modules/rating/domain/`, každý soubor se spec vedle sebe, ve stylu `event/domain/participation.ts` (`decideJoin`). Funkce nezávisí na Prisma klientovi: typy si definují samy a berou jen pole, která potřebují.

### `rating-summary.ts`: průměry

```ts
export type RatingSummary = { average: number | null; count: number };

/** Průměr hvězdiček zaokrouhlený na jedno desetinné místo; bez hodnocení { average: null, count: 0 }. */
export function summarizeStars(stars: number[]): RatingSummary;

/** Jako organizátor (z Rating.organizerStars): bez smazaných a bez akcí skupin (B-060). */
export function organizerRatingSummary(
  ratings: {
    organizerStars: number;
    deletedAt: Date | null;
    event: { groupId: string | null };
  }[],
): RatingSummary;

/** Jako účastník (z ParticipantRating.stars): bez smazaných. */
export function participantRatingSummary(
  ratings: { stars: number; deletedAt: Date | null }[],
): RatingSummary;
```

- **Bez hodnocení** vrací `{ average: null, count: 0 }`, ne `0`. Nula by vypadala jako špatné hodnocení. UI pak ukáže „Zatím bez hodnocení“.
- **`count`** se vrací vždy a UI ho ukazuje vždy spolu s průměrem, i u jediného hodnocení: „4,3 (12 hodnocení)“ (R4).
- **Zaokrouhlení** na jedno desetinné místo dělá funkce, takže #178 i #179 ukážou totéž číslo (R1).
- **Akce skupin** se do průměru osoby jako organizátora nepočítají (B-060). Průměr skupiny tento úkol nepočítá (R2).
- Repository v #178 a #179 načte řádky jednoduchým `findMany` s `select` jen potřebných polí. U profilu jde o desítky až stovky řádků. Kdyby jich bylo moc, dá se později přejít na `aggregate` v SQL, aniž by se změnila pravidla.

Testy (`rating-summary.spec.ts`):

- prázdný seznam → `{ average: null, count: 0 }`
- jedno hodnocení, více hodnocení, zaokrouhlení (např. 4, 4, 5 → 4,3)
- smazaná hodnocení se nepočítají; když jsou smazaná všechna → `null`
- `organizerRatingSummary` vynechá akce skupin
- `participantRatingSummary` vynechá smazaná

### `participant-rating.ts`: kdo smí hodnotit

```ts
export type ParticipantRatingRefusal =
  | 'EVENT_NOT_ENDED' | 'EVENT_NOT_PUBLISHED' | 'NOT_ORGANIZER' | 'NOT_APPROVED' | 'SELF_RATING'

export function hasEventEnded(event: { startsAt: Date; endsAt: Date | null }, now: Date): boolean
export function decideParticipantRating(state: { … }, now: Date):
  { ok: true } | { ok: false; refusal: ParticipantRatingRefusal }
```

Akce proběhla, když uplynul `endsAt`, a když chybí, `startsAt` (R9). Dávání hodnocení je až #66, ale pravidla „jen u proběhlé akce a `approved` účastníka“ jsou v akceptačních kritériích #180. Jako čistá funkce s testy jsou ověřitelná hned. Využije je seed (kontrola demo dat) i #66.

Testy (`participant-rating.spec.ts`): akce před koncem a po konci (s `endsAt` i bez něj), zrušená a skrytá akce, účast `pending`, `withdrawn`, `removed`, hodnotitel, který není organizátor, organizátor hodnotí sám sebe, platný případ.

## 5. Kde to najdou #178 a #179

- Martin si v profilu (#178, #179) načte řádky ve své repository a zavolá `organizerRatingSummary` a `participantRatingSummary` z `@/modules/rating/domain/rating-summary`. Importy mezi moduly už backend používá (`group` → `event`).
- Modul `rating` bude zatím jen `domain/`, bez controlleru a služby. Ty přidá #66.
- Výstup API pro profil navrhuji jako `{ asOrganizer: RatingSummary, asParticipant: RatingSummary }`, tvar ale závisí na #179. Domluvit s Martinem před mergem.
- Na frontendu se průměr nepočítá. Přijde hotový z API.

## 6. Testovací data

Demo data dnes nemají žádnou proběhlou akci, takže hodnocení není k čemu přidat.

1. **Proběhlé akce:** do `DemoSchedule` přidat `{ daysAgo: n; time }`. Posun do budoucna, který seed dělá u ostatních termínů, se na něj nevztahuje. Stačí 4–5 akcí v posledních dvou týdnech, z toho jedna akce skupiny, s `approved` účastmi.
2. **`Rating`:** účastníci hodnotí akci a organizátora, aby měl profil co ukázat. Aspoň jeden demo účet bude mít víc hodnocení jako organizátor a jeden jako účastník. Přidám i jedno smazané (`deletedAt`), na kterém je vidět, že se nepočítá, a hodnocení akce skupiny, které se osobě nepočítá.
3. **`ParticipantRating`:** organizátoři hodnotí některé `approved` účastníky.
4. **Kontrola v `demo-data.spec.ts`:** hvězdičky 1–5, jedno hodnocení na dvojici, hodnotí jen `approved` účastník proběhlé akce a účastníka jen organizátor (přes `decideParticipantRating`), organizátor nehodnotí sám sebe.
5. **Staging (R10):** demo akce se dnes vkládají jen do databáze bez akcí, takže na staging by se nové proběhlé akce ani hodnocení nedostaly. Proto samostatný krok seedu „proběhlé akce a hodnocení“: proběhne, když v databázi ještě žádné hodnocení účastníka není, v jedné transakci. Na stagingu tak hvězdičky budou k vidění na sprint review.

Pozor na viditelnost: proběhlé akce nesmí vyskočit v `/akce`, v „Nejbližších akcích“ ani v Moje akce › Přihlášen. Všechny tyto dotazy dnes filtrují `startsAt > now`, takže by se neměly objevit, ale ověřím to.

## 7. Změny v dokumentaci

**docs/datovy-model.md**

- přehled tabulek: nový řádek `ParticipantRating` / `participant_rating` / „Hodnocení účastníka organizátorem“ / B-060, #180
- `Rating`: popis upřesnit na „Hodnocení akce a organizátora **od účastníka**“
- ER diagram „Důvěra a peníze“: `ParticipantRating` s vazbami na `Event` a `Participation`
- „Pravidla, která hlídá aplikace, ne databáze“:
  - první věta už nebude platit úplně („jen cizí klíče, unikátnost a enumy“), přibude `CHECK` na hvězdičky
  - pravidlo o hodnocení rozšířit o hodnocení účastníka (jen organizátor akce, jen `approved`, jen po skončení, ne sám sebe) a odkázat na `decideParticipantRating`
  - průměry: „bez smazaných, akce skupin se osobě nepočítají“, odkaz na `rating-summary.ts`
- „Co se seeduje“: proběhlé akce a hodnocení, i na stagingu
- „Rozhodnutí nad rámec backlogu“: složený cizí klíč na účast, `CHECK` v migraci

**BACKLOG.md › B-060**

- bod o modelu: kromě `Rating` i `ParticipantRating` (`stars` 1–5, `deletedAt`), jedno na účastníka a akci, hodnotí jen organizátor akce
- průměry: názvy funkcí a místo (`modules/rating/domain/rating-summary.ts`); zaokrouhlení na desetiny; bez hodnocení `null` + počet; smazané se nepočítají
- „Hotovo, když“: testy průměrů a oprávnění pro #180 odškrtnout; komentáře, stránka `/akce/:id/hodnoceni` a API zůstávají na #66

## 8. Pořadí

1. **Čisté funkce + testy** (`rating-summary.ts`, `participant-rating.ts`). Nezávisí na schématu, takže Martin je může začít volat hned, s mockovanými řádky.
2. **Schéma + migrace** (`ParticipantRating`, `CHECK`), `prisma migrate diff` bez rozdílu, migrace nad databází se stávajícími daty.
3. **Seed**: `daysAgo`, proběhlé akce, `Rating` a `ParticipantRating`, kontroly v `demo-data.spec.ts`, samostatný krok i pro staging.
4. **Dokumentace**: `datovy-model.md`, BACKLOG › B-060.
5. `pnpm check-all`, `/review-branch`, PR s `Refs #180`.

## Rozhodnutí

- **R1 Zaokrouhlení:** na jedno desetinné místo ve funkci, aby #178 a #179 ukázaly stejné číslo.
- **R2 Průměr skupiny:** v tomto PR ne, jen průměry osoby. Akce skupin se osobě nepočítají.
- **R3 Kdo hodnotí účastníky:** jen organizátor akce, i u akce skupiny.
- **R4 Minimum hodnocení:** průměr se ukazuje už od jednoho hodnocení, vždy spolu s počtem. Otázka pro PO zůstává otevřená v PR.
- **R5 Komentář:** jen hvězdičky.
- **R6 `CHECK` pro `Rating`:** ne v tomto PR. V PR zmínit jako možné navazující vylepšení.
- **R7 Po smazání superadminem:** jen vrácení, nové hodnocení ne, stejně jako `Rating`.
- **R8 Nahlášení a zásahy:** enumy až v B-061 a B-063.
- **R9 Kdy akce proběhla:** `endsAt`, a když chybí, `startsAt`.
- **R10 Staging:** stejný seed i pro staging, aby byly hvězdičky vidět na sprint review.
