# HobbyHub – Backlog pro agenta (MVP)

Zdroj: `HobbyHub_User_Stories_MVP.md` (US-01 až US-19, odvozené z Feature breakdownu v3.4 po FB1 s PO) a technické features z epicu _Technický základ_ (F-59 až F-67). Backlog rozkládá user stories na úkoly velikosti jednoho pull requestu, seřazené tak, aby agent mohl brát jeden po druhém shora.

---

## Jak s backlogem pracuje agent

1. **Ber úkoly v pořadí.** Úkol začni, jen když jsou hotové všechny úkoly v řádku _Závisí na_.
2. **Jeden úkol = jeden PR.** Název PR: `B-0XX: <název úkolu>`. Do popisu dej odkaz na US.
3. **Před prací přečti** `CLAUDE.md` a `DESIGN.md`. DESIGN.md je závazný (tokeny, žádné vnořené karty, tři stavy seznamu).
4. **Kopíruj vzor feature akcí (`event`, #38):** Prisma model → seed → repository → service → controller s DTO → zod schéma na FE → TanStack Query → stránka. Backend v `apps/backend/src/modules/<feature>/`, frontend v `apps/frontend/src/features/<feature>/`.
5. **UI ovládací prvky jen z kitu** (`pnpm dlx shadcn@latest add <name>`), bez stínů na kartách a inputech.
6. **Validace vždy na FE i BE.** Oprávnění kontroluj na backendu (organizátor smí jen svou akci, správce jen svou skupinu, admin jen role `admin`).
7. **Testy jsou součást úkolu.** Každý BE úkol má unit testy service vrstvy (vzor `events.service.spec.ts`), pravidla kapacity, stavů a oprávnění pokrytá testem. Před PR projdi `pnpm check-all`.
8. **Po změně schématu** vytvoř migraci `pnpm backend prisma:migrations:run` a rozšiř seed.
9. **Narazíš na otevřenou otázku** (sekce na konci)? Nevymýšlej řešení, použij výchozí volbu z tabulky a zapiš to do PR.
10. **Mimo rozsah znamená mimo rozsah.** Co v úkolu není, nedělej (chat, Google přihlášení, QR docházka, GPS, reklamy…).

**Velikost:** S = do půl dne, M = cca den, L = víc dní (zvaž rozdělení).
**Vrstva:** BE = backend, FE = frontend, FS = obojí.

---

## Přehled a pořadí

| ID                             | Úkol                                                          | US / F              | Vrstva | Vel. | Závisí na           |
| ------------------------------ | ------------------------------------------------------------- | ------------------- | ------ | ---- | ------------------- |
| **Fáze 0 – Základ**            |                                                               |                     |        |      |                     |
| B-001                          | Přejmenování na HobbyHub a navigace                           | F-67                | FE     | S    | –                   |
| B-002                          | Číselník aktivit a lokalit                                    | US-02, US-05        | BE     | S    | –                   |
| B-003                          | Rozšíření modelu uživatele                                    | US-04, US-05        | BE     | S    | –                   |
| B-004                          | Mapová komponenta                                             | US-02, US-11        | FE     | M    | –                   |
| **Fáze 1 – Účet**              |                                                               |                     |        |      |                     |
| B-010                          | Registrace e-mailem a heslem                                  | US-04               | FS     | S    | B-003               |
| B-011                          | Ověření e-mailu a guard ověřeného uživatele                   | US-04               | BE     | S    | B-010               |
| B-012                          | Přihlášení, zapomenuté heslo, návrat na akci                  | US-04               | FE     | S    | B-010               |
| B-013                          | Profil uživatele (data + stránka)                             | US-05               | FS     | M    | B-002, B-003        |
| B-014                          | Viditelnost údajů v profilu                                   | US-05               | FS     | S    | B-013               |
| B-015                          | Změna hesla a e-mailu                                         | US-05               | FE     | S    | B-012               |
| B-016                          | Potvrzení věku 18+ a souhlasy při registraci                  | US-04, F-65         | FS     | S    | B-010, B-081        |
| **Fáze 2 – Akce a objevování** |                                                               |                     |        |      |                     |
| B-020                          | Model akce                                                    | US-11               | BE     | M    | B-002, B-003        |
| B-021                          | Založení akce – API                                           | US-11               | BE     | M    | B-020, B-011        |
| B-022                          | Založení akce – formulář                                      | US-11               | FE     | M    | B-021, B-004        |
| B-023                          | Veřejný výpis akcí – API s filtry                             | US-02               | BE     | M    | B-020               |
| B-024                          | Seznam akcí s filtry                                          | US-02               | FE     | M    | B-023               |
| B-025                          | Mapový pohled akcí                                            | US-02               | FE     | M    | B-024, B-004        |
| B-026                          | Detail akce a sdílený odkaz                                   | US-03               | FS     | M    | B-023               |
| B-027                          | Úvodní stránka s lokalitou podle IP                           | US-01               | FS     | M    | B-023, B-026        |
| B-028                          | Úprava a zrušení akce                                         | US-13               | FS     | M    | B-022, B-026        |
| B-029                          | Interaktivní mapa a hledání podle názvu                       | US-02               | FE     | M    | B-025               |
| **Fáze 3 – Účast**             |                                                               |                     |        |      |                     |
| B-030                          | Model účasti                                                  | US-06               | BE     | S    | B-020               |
| B-031                          | Přihlášení, žádost a odhlášení – API                          | US-06               | BE     | M    | B-030, B-011        |
| B-032                          | Přihlášení na akci – UI v detailu                             | US-06, US-04        | FE     | M    | B-031, B-026, B-012 |
| B-033                          | Správa účastníků – API                                        | US-12               | BE     | M    | B-031               |
| B-034                          | Stránka správy akce                                           | US-12, US-13        | FE     | M    | B-033, B-028        |
| B-035                          | Moje akce                                                     | US-07               | FS     | M    | B-031               |
| **Fáze 4 – E-maily**           |                                                               |                     |        |      |                     |
| B-040                          | Jednotná e-mailová šablona a notifikační služba               | US-08               | BE     | M    | –                   |
| B-041                          | E-maily při změnách účasti a akce                             | US-08, US-12, US-13 | BE     | M    | B-040, B-033, B-028 |
| B-042                          | Zpráva všem schváleným účastníkům                             | US-12               | FS     | S    | B-040, B-034        |
| B-043                          | Plánované e-maily (připomínka, chybí lidé, výzva k hodnocení) | US-08, US-09        | BE     | M    | B-041               |
| **Fáze 5 – Skupiny**           |                                                               |                     |        |      |                     |
| B-050                          | Model skupiny a členství                                      | US-16, US-17        | BE     | S    | B-002, B-003        |
| B-051                          | Založení, úprava a deaktivace skupiny                         | US-16               | FS     | M    | B-050, B-011        |
| B-052                          | Stránka skupiny a hledání skupin                              | US-16               | FS     | M    | B-051               |
| B-053                          | Členství ve veřejné a neveřejné skupině                       | US-17               | FS     | M    | B-052               |
| B-054                          | Jmenování správců                                             | US-16               | FS     | S    | B-053               |
| B-055                          | Akce skupiny                                                  | US-18               | FS     | M    | B-053, B-022, B-034 |
| B-056                          | Moje skupiny                                                  | US-17               | FS     | S    | B-053               |
| **Fáze 6 – Důvěra**            |                                                               |                     |        |      |                     |
| B-060                          | Hodnocení akce a organizátora                                 | US-09               | FS     | M    | B-031, B-043        |
| B-061                          | Nahlášení uživatele, akce, skupiny, hodnocení                 | US-10               | FS     | S    | B-060, B-052        |
| B-062                          | Administrace – přístup a fronta nahlášení                     | US-19               | FS     | M    | B-061               |
| B-063                          | Zásahy superadmina a jejich historie                          | US-19               | FS     | M    | B-062               |
| **Fáze 7 – Monetizace**        |                                                               |                     |        |      |                     |
| B-070                          | Simulovaná platba a potvrzení adminem                         | US-14, US-15        | FS     | M    | B-062               |
| B-071                          | Předplatné organizátora                                       | US-14               | FS     | M    | B-070               |
| B-072                          | Evidence docházky                                             | US-14               | FS     | M    | B-071, B-034        |
| B-073                          | Topování akce                                                 | US-15               | FS     | M    | B-070, B-025        |
| **Fáze 8 – Dokončení**         |                                                               |                     |        |      |                     |
| B-080                          | Export dat a smazání účtu                                     | US-05               | FS     | M    | B-060, B-055        |
| B-081                          | Právní stránky a souhlasy                                     | F-65                | FE     | S    | B-010               |
| B-082                          | Ukázková data pro demo                                        | F-64                | BE     | M    | B-073, B-063        |
| B-083                          | Smoke test klíčových scénářů                                  | F-61                | FS     | M    | B-073               |
| B-084                          | Monitoring, logy a zálohy                                     | F-62, F-63          | BE     | S    | –                   |
| B-085                          | Odstranění vzorové quack feature                              | –                   | FS     | S    | B-024               |

Staging a CI/CD (F-59, F-60) už v repu jsou (`.github/workflows/ci.yml`, `deploy.yml`). Pokud agent změní build, nesmí je rozbít.

---

# Fáze 0 – Základ

### B-001 Přejmenování na HobbyHub a navigace

`F-67` · FE · S · závisí na: –

**Cíl:** Aplikace se jmenuje HobbyHub a hlavička vede na hlavní části.

- V hlavičce, `<title>`, `Seo` a logu nahraď „Quacker“ za „HobbyHub“.
- Navigace v hlavičce: **Akce**, **Skupiny**, **Moje akce** (jen přihlášený), **Administrace** (jen role `admin`). Zatím neexistující cesty vrací stránku „Připravujeme“, ne 404.
- Na mobilu spodní navigace podle designu: návštěvník **Akce**, **Skupiny**, **Přihlásit**; přihlášený **Akce**, **Skupiny**, **Moje akce**, **Profil**. Mapa není samostatná položka, je součástí `/akce` (B-025).

**Hotovo, když:**

- [ ] Slovo „Quacker“ se v UI nikde nezobrazuje.
- [ ] Odkazy v hlavičce odpovídají roli přihlášeného.

---

### B-002 Číselník aktivit a lokalit

`US-02, US-05, US-11, US-16` · BE · S · závisí na: –

**Cíl:** Aktivity a lokality jsou jednotné pro akce, skupiny, profil i filtry.

- Aktivity mají **dvě úrovně: kategorie › aktivita** (víc úrovní ne, na mobilu se špatně prochází). Prisma model `ActivityCategory` (`id`, `slug`, `name`, `icon`, `sortOrder`) a `Activity` (`id`, `slug`, `name`, `categoryId`, `sortOrder`, `keywords` – pole synonym pro hledání). Akce, skupina i zájem v profilu se vždy váže na aktivitu, ne na kategorii.
- Jen aktivity, kde se skládá parta (HobbyHub není katalog koncertů, trhů ani kulturních akcí). Kategorie jsou vyvážené (8 kategorií po 5–6 aktivitách), aby se daly projít na mobilu. Seznam navrhl tým 20. 10., s PO ho konzultujeme na standupu 23. 10. Seed:
  - **Týmové sporty:** fotbal a malá kopaná, florbal, volejbal, basketbal, nohejbal, ultimate frisbee
  - **Raketové sporty:** tenis, badminton, squash, stolní tenis, padel
  - **Pohyb a tanec:** běh, jóga, workout, tanec, plavání, bruslení (in-line i led)
  - **Outdoor:** turistika, cyklistika, lezení a bouldering, vodáctví, zimní sporty, geocaching
  - **Hry:** deskové hry, karetní hry, šachy, RPG (D&D apod.), videohry a LAN, únikové hry
  - **Kvízy a jazyky:** pub kvíz, jazykový tandem, čtenářský klub, debatní klub, coding a hackathony
  - **Tvoření a hudba:** jam session, sborový zpěv, kreslení a malování, fotografie, rukodělná dílna, improvizace a divadlo
  - **Komunita:** úklid přírody, komunitní zahrada, pomoc v útulku, společné vaření, sousedská pomoc
- Poslední aktivita v každé kategorii je **„Jiné“** (např. „Jiný týmový sport“), aby organizátor akci zařadil i tehdy, když svou aktivitu v seznamu nenajde. Filtr podle kategorie takové akce najde.
- `keywords` obsahují synonyma a hovorové názvy („pinčes“, „fotbálek“, „D&D“, „boulder“). Seed je plní už teď, hledání v aktivitách i akcích je využije ve sprintu 3 (#57).
- Ikona kategorie odpovídá variantě komponenty `Activity tile` ve Figmě (karta akce ukazuje ikonu kategorie).
- Prisma model `Locality` (`id`, `name`, `parent` – město / městská část, `lat`, `lng`) a seed: Praha + městské části Praha 1–22, Brno, Ostrava, Plzeň, Olomouc, Pardubice, Hradec Králové, Liberec, České Budějovice, Ústí n. L.
- `GET /api/activities` (strom kategorie › aktivity) a `GET /api/localities?query=` (našeptávač) – veřejné.

**Hotovo, když:**

- [ ] Endpointy vrací seedovaná data bez přihlášení.
- [ ] `GET /api/activities` vrací kategorie seřazené podle `sortOrder` a v každé její aktivity.
- [ ] `GET /api/localities?query=pra` vrátí Prahu a její části.

**Mimo rozsah:** Google Places našeptávač (viz otevřené otázky).

---

### B-003 Rozšíření modelu uživatele

`US-04, US-05, US-19` · BE · S · závisí na: –

**Cíl:** Model `User` unese profil, souhlasy a blokaci.

- Přidej pole: `bio`, `homeLocalityId`, `ageConfirmedAt`, `termsAcceptedAt`, `blockedAt`, `blockedReason`, `deletedAt`; vazba M:N `interests` na `Activity`.
- Role: existující enum `UserRole.admin` = **superadmin**. Nový enum nevytvářej.
- Seed: jeden uživatel s rolí `admin` (e-mail a heslo zapiš do tabulky seedovaných uživatelů v README).

**Hotovo, když:**

- [ ] Migrace proběhne nad stávajícími daty bez chyby.
- [ ] Seed vytvoří admina a stávající demo uživatele.

---

### B-004 Mapová komponenta

`US-02, US-03, US-11` · FE · M · závisí na: –

**Cíl:** Jedna znovupoužitelná mapa pro výpis, detail a výběr místa.

- Leaflet + OpenStreetMap dlaždice (výchozí volba, viz otevřené otázky). Komponenta v `src/components/map/`.
- Režimy: **zobrazení špendlíků** (seznam bodů, klik = callback), **jeden bod** (detail), **výběr bodu** (klik do mapy nastaví lat/lng).
- Barvy špendlíků z tokenů (žádný hardcode). Funguje na mobilu (touch, pinch zoom).

**Hotovo, když:**

- [ ] Komponenta má test renderu a její tři režimy jdou použít z jiné stránky.

**Mimo rozsah:** GPS / poloha zařízení (F-08 je Nice to have).

---

# Fáze 1 – Účet

### B-010 Registrace e-mailem a heslem

`US-04` · FS · S · závisí na: B-003

**Cíl:** Registrace odpovídá US-04 v rozsahu sprintu 2.

- Formulář: jméno, e-mail, heslo.
- Silné heslo: min. 10 znaků, písmeno a číslice. Validace v zod schématu na FE **i** na BE (BetterAuth hook / validace před vytvořením účtu).

**Hotovo, když:**

- [ ] Slabé heslo odmítne FE i přímé volání API.

**Mimo rozsah:** potvrzení věku 18+ a souhlasy (B-016, změna 19. 10.), přihlášení přes Google.

---

### B-011 Ověření e-mailu a guard ověřeného uživatele

`US-04` · BE · S · závisí na: B-010

**Cíl:** Bez ověřeného e-mailu se nejde hlásit na akce ani zakládat akce a skupiny.

- BetterAuth: ověřovací odkaz s platností 24 h (šablona `verify-email.tsx` už existuje).
- Nový guard `VerifiedUserGuard` (vedle `authenticated-user.guard.ts`): 403 s kódem `EMAIL_NOT_VERIFIED`, když `emailVerified = false`. Guard zároveň odmítne zablokovaného uživatele (`blockedAt`).
- FE: přihlášený neověřený uživatel vidí pruh „Ověřte e-mail“ s tlačítkem pro nové odeslání odkazu.

**Hotovo, když:**

- [ ] Test guardu: neověřený → 403, zablokovaný → 403, ověřený → projde.

---

### B-012 Přihlášení, zapomenuté heslo, návrat na akci

`US-04` · FE · S · závisí na: B-010

**Cíl:** Uživatel se po přihlášení vrátí tam, odkud přišel.

- Přihlášení e-mailem a heslem; „Zapomenuté heslo“ pošle odkaz (BetterAuth, šablona `reset-password.tsx`) a stránka pro nastavení nového hesla.
- Parametr `redirect` v URL (využij `features/auth/lib/redirect.ts`): po přihlášení i po registraci a ověření se vrátí na původní stránku. Povol jen relativní cesty.

**Hotovo, když:**

- [ ] `/login?redirect=/akce/abc` po přihlášení vede na `/akce/abc`.
- [ ] `redirect=https://evil.com` se ignoruje.

---

### B-013 Profil uživatele

`US-05` · FS · M · závisí na: B-002, B-003

**Cíl:** Uživatel vyplní profil, domovská lokalita je výchozí ve filtrech.

- `GET/PATCH /api/me/profile`: jméno, fotka (URL, viz otevřené otázky), bio (max 500 znaků), zájmy (aktivity), domovská lokalita.
- `GET /api/users/:id` – veřejný profil (respektuje B-014).
- FE: stránka `/profil` (úprava) a `/uzivatele/:id` (zobrazení). Po prvním přihlášení se nevyplněný profil nabídne (onboarding: zájmy + lokalita, jde přeskočit).

**Hotovo, když:**

- [ ] Uložená domovská lokalita se předvyplní ve filtru výpisu akcí (až bude B-024).
- [ ] Testy validace (délka bia, neexistující aktivita).

---

### B-014 Viditelnost údajů v profilu

`US-05` · FS · S · závisí na: B-013

**Cíl:** Uživatel rozhoduje, kdo vidí fotku, bio a navštívené akce.

- U každého z polí `photo`, `bio`, `pastEvents` volba: `everyone` / `organizers` (jen organizátoři akcí, na které se hlásím) / `nobody`. Výchozí `everyone`.
- Filtrování dělá **backend** v `GET /api/users/:id`. Jméno vidí organizátor akce, na kterou se uživatel hlásí, vždy.

**Hotovo, když:**

- [ ] Testy: cizí návštěvník nevidí pole s `organizers`; organizátor akce s přihláškou ho vidí.

---

### B-016 Potvrzení věku 18+ a souhlasy při registraci

`US-04, F-65` · FS · S · závisí na: B-010, B-081

**Cíl:** Registrace má potvrzení věku a souhlasy podle US-04. Ve sprintu 2 není (PO 19. 10.).

- Do registrace přidej zaškrtnutí „Je mi 18 let“ a souhlas s podmínkami a zpracováním údajů (odkazy na stránky z B-081).
- Bez zaškrtnutí registrace neprojde (FE i BE); uloží se `ageConfirmedAt` a `termsAcceptedAt` (pole z B-003).
- Účty založené před touto změnou dostanou při dalším přihlášení výzvu k potvrzení.

**Hotovo, když:**

- [ ] Test: registrace bez souhlasu selže i přímým voláním API.

---

### B-015 Změna hesla a e-mailu

`US-05` · FE · S · závisí na: B-012

- Na stránce profilu sekce „Účet“: změna hesla (staré + nové, stejná pravidla síly) a změna e-mailu (nový platí až po ověření) přes BetterAuth API.

**Hotovo, když:**

- [ ] Po změně e-mailu přijde ověřovací odkaz na nový e-mail a do ověření platí starý.

---

# Fáze 2 – Akce a objevování

### B-020 Model akce

`US-11, US-13, US-15, US-18` · BE · M · závisí na: B-002, B-003

**Cíl:** Jeden model akce pro akce jednotlivců i skupin.

Prisma model `Event`:

- `title`, `description?`, `activityId`, `startsAt`, `endsAt?`, `lat`, `lng`, `address`, `localityId`
- `minParticipants`, `maxParticipants`, `price?` (Kč, celé číslo), `level?` (začátečník / pokročilý / všichni), `equipment?`
- `approvalMode` (`open` výchozí / `approval`), `visibility` (`public` / `private` / `members`)
- `organizerUserId` (zakladatel), `groupId?` (akce skupiny – doplní B-055)
- `status` (`published` / `cancelled` / `hidden` / `deleted`), `cancelReason?`, `cancelledAt?`
- `promotedUntil?` (topování, B-073)

Doménová logika (čistá funkce + testy): `approvedCount`, `missingToMin = max(0, min - approved)`, `freeSpots = max - approved`, `isFull`, `isPast`.

**Hotovo, když:**

- [ ] Unit testy výpočtů kapacity včetně hraničních hodnot (0 schválených, plno, nad minimem).

---

### B-021 Založení akce – API

`US-11` · BE · M · závisí na: B-020, B-011

- `POST /api/events` za `VerifiedUserGuard`. Organizátor = přihlášený uživatel (ze session, ne z těla požadavku).
- Validace DTO: povinné název, aktivita, místo, začátek, min, max, způsob přihlašování; `min ≥ 1`, `max ≥ min`, `startsAt` v budoucnosti.
- Počet aktivních akcí není omezený.
- Odpověď obsahuje `shareUrl` (absolutní URL detailu na FE).

**Hotovo, když:**

- [ ] Testy validací (min 0, max < min, datum v minulosti) a toho, že organizátor se nedá podvrhnout.

---

### B-022 Založení akce – formulář

`US-11` · FE · M · závisí na: B-021, B-004

- Stránka `/akce/nova`: povinná a nepovinná pole podle US-11, výběr místa mapou (B-004, režim výběru) + textová adresa, volba způsobu přihlašování (výchozí „Bez schválení“) a viditelnosti s krátkým vysvětlením.
- Klientská validace stejná jako na BE, chyby pod polem, tlačítko s pending stavem (DESIGN.md › Forms).
- Po zveřejnění přesměruj na detail a nabídni „Sdílet odkaz“ (kopírování do schránky + Web Share API na mobilu).
- Neověřený uživatel vidí místo formuláře výzvu k ověření e-mailu.

**Hotovo, když:**

- [ ] Formulář jde celý vyplnit na mobilu (375 px) včetně výběru místa.

---

### B-023 Veřejný výpis akcí – API s filtry

`US-02` · BE · M · závisí na: B-020

- `GET /api/events` bez přihlášení. Parametry: `q` (název), `localityId` nebo `lat,lng,radiusKm` nebo `bbox` (výřez mapy – „Hledat v této oblasti“), `dateFrom`, `dateTo` (rozsah, oba včetně), `activityId[]`, `categoryId[]` (celá kategorie = všechny její aktivity, i nově přidané), `capacity` (obsazenost: `free` = jen akce, které nejsou plné, `missing` = jen akce s `missingToMin > 0`; změna 23. 10. z `missingOnly`), `sort` (`date` výchozí / `distance`), stránkování. `activityId[]` a `categoryId[]` se sčítají (OR).
- `GET /api/events/facets` – stejné filtry kromě typu aktivity, vrací počty akcí po kategoriích a aktivitách pro výběr typu aktivity. Pokud se nevejde do sprintu, FE počty skryje.
- Vrací jen `status = published`, `visibility = public`, `startsAt > now`. Nevrací soukromé a „jen pro členy“.
- Každá položka: aktivita, název, termín, místo (lat/lng + adresa), `missingToMin`, `freeSpots`, `isFull`, organizátor (osoba nebo skupina), `isPromoted`.
- `GET /api/events/map` – stejné filtry, odlehčené body pro mapu (bez stránkování, limit 500).

**Hotovo, když:**

- [ ] Testy, že proběhlé, zrušené, soukromé a members-only akce se ve výpisu neobjeví.
- [ ] Řazení podle vzdálenosti funguje vůči zadanému bodu.
- [ ] Test, že `categoryId` vrátí akce všech aktivit kategorie a `capacity=free` jen akce, které nejsou plné, `capacity=missing` jen akce, kterým chybí lidé.

---

### B-024 Seznam akcí s filtry

`US-02` · FE · M · závisí na: B-023

- Stránka `/akce`: seznam (karty jsou tu správně – položky seznamu), filtry, řazení. Design: Figma, stránka „Seznam akcí“, obrazovky A-02, A-02a–c (filtry) a A-02d; wireframy se stejnými čísly.
- Filtry jako čipy, čip ukazuje hodnotu (např. „Praha 4“, „20.–26. 10.“). Desktop: lišta přes celou šířku nad seznamem a mapou, klik otevře popover. Mobil: čipy plovou nahoře přes mapu, klepnutí otevře spodní panel.
  - **Lokalita** – výběr z číselníku (B-002).
  - **Termín** – rozsah od–do s kalendářem a rychlými volbami Dnes / Zítra / Tento víkend / Příštích 7 dní. Minulost nejde vybrat.
  - **Typ aktivity** – dvě úrovně (kategorie › aktivita), zaškrtnutí kategorie vybere celou, pole „Hledat aktivitu“ hledá v aktivitách. U položek počty akcí (`/api/events/facets`).
  - **Obsazenost** – jedna volba Všechny / Volná místa (jen akce, které nejsou plné) / Chybí lidé (jen akce, kterým chybí do minima; podmnožina volných míst). Původně přepínač „Chybí lidé“ (návrh týmu 20. 10.), 23. 10. rozšířen o volná místa, aby šly skrýt plné akce. Potvrdí PO (Q9).
  - **Zrušit vše** – jen když je aktivní filtr.
  - Čip **Další** (cena, úroveň) je Nice to have – dokud není hotový, nezobrazuje se.
- Stav filtrů v URL (`?q=&lokalita=&od=&do=&kategorie=&aktivita=&obsazenost=volna|chybi`), aby šel sdílet.
- Přihlášenému se předvyplní domovská lokalita a v typu aktivity „Moje zájmy“ z profilu; obojí jde změnit.
- Tři stavy seznamu: načítání (skeleton), prázdno (jedna věta), chyba s možností zkusit znovu.

**Hotovo, když:**

- [ ] Test komponenty pro všechny tři stavy (vzor `QuackList.test.tsx`).
- [ ] Výběr celé kategorie a jednotlivých aktivit se propíše do URL a po obnovení stránky drží.

---

### B-025 Mapový pohled akcí

`US-02` · FE · M · závisí na: B-024, B-004

- Mapa je součást `/akce`, žádná samostatná cesta ani položka navigace. Filtry z B-024 platí pro seznam i mapu.
- **Desktop:** seznam vlevo, mapa vpravo (A-02d). Najetí na kartu zvýrazní špendlík.
- **Mobil:** jedna obrazovka (A-02). Mapa přes celou výšku, dole vysouvací panel se seznamem: výchozí stav ukazuje počet akcí a první kartu, vytažený panel je seznam, tlačítko „Mapa“ ho stáhne.
- Akce jako špendlíky, zvýrazněné = chybí lidé.
- Topované akce (až bude B-073) mají odlišený špendlík.

**Hotovo, když:**

- [ ] Vytažení a stažení panelu na mobilu zachová filtry i pozici mapy.

**Mimo rozsah:** náhled po klepnutí na špendlík, shluky a „Hledat v této oblasti“ (B-029).

---

### B-029 Interaktivní mapa a hledání podle názvu

`US-02` · FE · M · závisí na: B-025

**Cíl:** Doplňky stránky `/akce`, které nejsou ve sprintu 2 (sprint 3).

- Klepnutí na špendlík otevře náhled (název, termín, kolik chybí) s proklikem na detail (A-03a).
- Blízké akce se shlukují do bubliny s počtem (klepnutí přiblíží), např. Leaflet.markercluster.
- Po posunu mapy tlačítko „Hledat v této oblasti“ (parametr `bbox`).
- Hledání podle názvu (`q`) není hlavní prvek: desktop vpravo v liště filtrů, mobil lupa v hlavičce.
- Řazení podle vzdálenosti od středu zvolené lokality.

**Hotovo, když:**

- [ ] Při 500 bodech je mapa čitelná díky shlukům.
- [ ] Hledání najde akci bez ohledu na velikost písmen a diakritiku.

---

### B-026 Detail akce a sdílený odkaz

`US-03` · FS · M · závisí na: B-023

- `GET /api/events/:id` bez přihlášení. Vrací i soukromé akce (soukromá = dostupná přes odkaz). Members-only akci vrací jen členům skupiny (jinak 404). Zrušenou akci vrací se štítkem a důvodem; `hidden`/`deleted` vrací 404.
- Seznam jmen přihlášených jen pro přihlášeného uživatele; návštěvník dostane jen počet.
- FE stránka `/akce/:id`: název, aktivita, popis, mapa (jeden bod), termín, cena, úroveň, organizátor (osoba nebo skupina, proklik), způsob přihlášení, počet přihlášených, „Chybí ještě X“ / „Volná místa: Y“ / „Plno“, štítek „Zrušeno“ s důvodem, tlačítko „Sdílet odkaz“.
- Open Graph meta (titulek, termín) pro hezký náhled ve WhatsAppu.
- Odkaz se otevře rovnou na detailu, bez přihlašovací obrazovky.

**Hotovo, když:**

- [ ] Testy BE: návštěvník nedostane jména, přihlášený ano; members-only cizímu = 404.

---

### B-027 Úvodní stránka s lokalitou podle IP

`US-01` · FS · M · závisí na: B-023, B-026

- `GET /api/geo/locality` – odhad lokality podle IP (viz otevřené otázky). IP ani výsledek se **neukládají** (ani do logů). Když nejde zjistit → Praha.
- Stránka `/`: jedna věta, co HobbyHub dělá; náhled nadcházejících akcí v lokalitě (3 akce, řazení podle termínu – otevřená otázka F-68); ruční změna lokality bez registrace (uloží se jen v prohlížeči); proklik na detail a na celý přehled `/akce`.
- Nepoužívej layout hero + tři karty (DESIGN.md).

**Hotovo, když:**

- [ ] Test: služba při chybě geolokace vrátí Prahu.

---

### B-028 Úprava a zrušení akce

`US-13` · FS · M · závisí na: B-022, B-026

- `PATCH /api/events/:id` jen pro organizátora (u akce skupiny pro správce – doplní B-055) a jen do začátku akce. Maximum nejde snížit pod počet schválených.
- `POST /api/events/:id/cancel` s povinným důvodem → `status = cancelled`. Akce zmizí z výpisu, přes odkaz má štítek „Zrušeno“.
- Aplikace akci sama neruší ani při nenaplnění minima.
- Změna termínu nebo místa a zrušení vyvolá doménovou událost pro e-maily (odesílání doplní B-041).
- FE: úprava stejným formulářem jako B-022, zrušení v dialogu s polem pro důvod (tlačítko `destructive`).

**Hotovo, když:**

- [ ] Testy: cizí uživatel 403, úprava po začátku 400, snížení max pod schválené 400.

---

# Fáze 3 – Účast

### B-030 Model účasti

`US-06, US-12, US-14` · BE · S · závisí na: B-020

- Prisma model `Participation`: `eventId`, `userId`, `status` (`pending` / `approved` / `rejected` / `withdrawn` / `removed`), `message?`, `attendedAt?`, časové značky. Unikátní dvojice `eventId + userId`.
- Výpočty kapacity z B-020 počítají jen `approved`.

**Hotovo, když:**

- [ ] Migrace a test unikátnosti.

---

### B-031 Přihlášení, žádost a odhlášení – API

`US-06` · BE · M · závisí na: B-030, B-011

- `POST /api/events/:id/participation` (`VerifiedUserGuard`), volitelně `message`:
  - `approvalMode = approval` → `pending`
  - `approvalMode = open` → rovnou `approved`
- `DELETE /api/events/:id/participation` – stažení žádosti nebo odhlášení, jen před začátkem akce. Místo se uvolní.
- Pravidla: dvakrát ne, na plnou akci ne (`EVENT_FULL`), na zrušenou/proběhlou ne. Members-only jen pro členy.
- Organizátor (u akce skupiny i její správce) není účastníkem automaticky, ale na vlastní akci se přihlásit smí; jeho přihláška je rovnou `approved` i u akce se schvalováním a počítá se do kapacity (Q12).
- Kontrolu kapacity a zápis dělej v jedné transakci (dva lidé o poslední místo).

**Hotovo, když:**

- [ ] Testy všech pravidel včetně souběhu o poslední místo.

---

### B-032 Přihlášení na akci – UI v detailu

`US-06, US-04` · FE · M · závisí na: B-031, B-026, B-012

- V detailu akce jedno primární tlačítko podle stavu:
  - nepřihlášený: „Přihlásit se na akci“ → login/registrace s `redirect` zpět
  - neověřený: výzva k ověření e-mailu
  - akce se schvalováním: „Poslat žádost“ (dialog s nepovinnou zprávou) → „Čeká na schválení“ + „Stáhnout žádost“
  - akce bez schvalování: „Přijdu“ → „Jdu“ + „Odhlásit se“
  - plno: „Plno“ (disabled)
  - vlastní akce: „Spravovat akci“ a vedle něj „Přijdu“ / „Odhlásit se“ (organizátor se může přihlásit, nemusí)
- Po akci invaliduj query detailu a „Mých akcí“.

**Hotovo, když:**

- [ ] Testy komponenty pro všechny stavy tlačítka.

---

### B-033 Správa účastníků – API

`US-12` · BE · M · závisí na: B-031

- `GET /api/events/:id/participants` – organizátor vidí čekající (s profilem a zprávou) a schválené.
- `POST /api/events/:id/participants/approve` a `/reject` s polem `userIds[]` (jednotlivě i hromadně). Schválit nad kapacitu nejde – celé hromadné schválení selže s `EVENT_FULL`, nic se nezmění.
- `POST /api/events/:id/participants/:userId/remove` → `removed`.
- Oprávnění: organizátor akce (správci skupiny doplní B-055).

**Hotovo, když:**

- [ ] Testy: hromadné schválení nad kapacitu, cizí uživatel 403.

---

### B-034 Stránka správy akce

`US-12, US-13` · FE · M · závisí na: B-033, B-028

- `/akce/:id/sprava` jen pro organizátora: záložky **Žádosti** (schválit / zamítnout, hromadný výběr), **Účastníci** (odebrat s potvrzením), **Upravit**, **Zrušit akci**.
- Místo pro „Zpráva účastníkům“ (B-042), „Evidence docházky“ (B-072) a „Topovat akci“ (B-073).

**Hotovo, když:**

- [ ] Tři stavy seznamu u žádostí i účastníků.

---

### B-035 Moje akce

`US-07` · FS · M · závisí na: B-031

- `GET /api/me/events?tab=attending|organizing|past`
  - **Přihlášen:** `approved` + `pending` (i vlastní akce, pokud se na ni organizátor přihlásil)
  - **Pořádám:** moje akce + akce mých skupin (po B-055)
  - **Proběhlé:** kde jsem byl přihlášen nebo jsem pořádal
- FE `/moje-akce`: záložky, u akce stav mé účasti a termín, řazeno od nejbližší (proběhlé od nejnovější). Z pořádané akce odkaz na správu.

**Hotovo, když:**

- [ ] Testy rozřazení do záložek.

---

# Fáze 4 – E-maily

### B-040 Jednotná e-mailová šablona a notifikační služba

`US-08` · BE · M · závisí na: –

- Společný layout šablon v `core/email/templates/` (hlavička HobbyHub, patička, tlačítko „Zobrazit akci“). Upravit i existující `verify-email` a `reset-password`.
- `NotificationService` s metodami pro jednotlivé typy e-mailů; volá se z doménových událostí, ne přímo z controllerů. V dev režimu jde přes console mailer.
- Každý e-mail k akci obsahuje odkaz na akci.
- Odeslání neblokuje odpověď API (fronta / `setImmediate` / event emitter) a jeho chyba nerozbije akci uživatele.

**Hotovo, když:**

- [ ] Test, že selhání odeslání nezpůsobí chybu požadavku.

---

### B-041 E-maily při změnách účasti a akce

`US-08, US-12, US-13` · BE · M · závisí na: B-040, B-033, B-028

- **Účastník:** schválení, zamítnutí, odebrání z akce, změna termínu nebo místa, zrušení akce s důvodem.
- **Organizátor:** nová žádost o účast, odhlášení účastníka.
- Příjemci zrušení/změny = `approved` + `pending`.

**Hotovo, když:**

- [ ] Test pro každý typ: správní příjemci, správná šablona.

---

### B-042 Zpráva všem schváleným účastníkům

`US-12` · FS · S · závisí na: B-040, B-034

- `POST /api/events/:id/message` (organizátor) – předmět + text, odešle e-mail všem `approved`.
- FE: dialog ve správě akce. Limit 10 zpráv na akci za den (proti spamu).

**Mimo rozsah:** chat u akce, odpovědi v aplikaci.

---

### B-043 Plánované e-maily

`US-08, US-09` · BE · M · závisí na: B-041

- Plánovač (`@nestjs/schedule`), každá úloha idempotentní (záznam o odeslání, aby po restartu nepřišel e-mail dvakrát).
- **Připomínka účastníkům** den před akcí.
- **Organizátorovi 48 a 24 h před akcí**, kolik lidí chybí do minima, s odkazy Sdílet / Topovat / Zrušit. Při naplněném minimu nepřijde.
- **Výzva k hodnocení**: dávkově jednou denně večer pro akce, které ten den skončily, všem `approved` (odkaz na hodnocení z B-060).

**Hotovo, když:**

- [ ] Testy výběru příjemců s fixním „teď“ (fake timers).

---

# Fáze 5 – Skupiny

### B-050 Model skupiny a členství

`US-16, US-17` · BE · S · závisí na: B-002, B-003

- `Group`: `name`, `description?`, `imageUrl?`, `activityId` (právě jedna), `localityId` (právě jedna), `type` (`public` / `closed`), `status` (`active` / `inactive`), `deactivatedAt?`.
- `GroupMember`: `groupId`, `userId`, `role` (`admin` / `member`), `status` (`pending` / `active` / `blocked`), `message?`. Unikátní dvojice.

---

### B-051 Založení, úprava a deaktivace skupiny

`US-16` · FS · M · závisí na: B-050, B-011

- `POST /api/groups` (`VerifiedUserGuard`), zakladatel se stane správcem. `PATCH` a `POST /:id/deactivate` jen správce.
- Skupina se nemaže ani neruší, jen **deaktivuje** (PO 19. 10.; v UI „Deaktivovat skupinu“, ne „Zrušit“, aby se to nepletlo se zrušením akce): `status = inactive`, `deactivatedAt`, skupina zmizí z hledání, nejde se do ní přidat, stránka skupiny ukazuje „Skupina už není aktivní“. Členové dostanou e-mail (po B-040).
- Nadcházející akce skupiny se zruší s důvodem „Skupina byla deaktivována“, proběhlé zůstanou v historii. Akce skupin přibudou až s B-055, zrušení akcí doplní B-055.
- FE: formulář `/skupiny/nova`, úprava a deaktivace v dialogu s potvrzením (tlačítko `destructive`).

**Hotovo, když:**

- [ ] Test deaktivace: skupina je `inactive`, nejde se do ní přidat a nevrací se ve výpisu.

---

### B-052 Stránka skupiny a hledání skupin

`US-16` · FS · M · závisí na: B-051

- `GET /api/groups?q=&activityId=&localityId=` (veřejné i neveřejné skupiny jsou vidět), `GET /api/groups/:id`.
- FE `/skupiny` (seznam s filtry, tři stavy) a `/skupiny/:id`: aktivita, lokalita, správci, počet členů, nadcházející akce (members-only akce jen členům), tlačítko členství (B-053).

**Mimo rozsah:** mapa skupin (F-29 v user stories není).

---

### B-053 Členství ve veřejné a neveřejné skupině

`US-17` · FS · M · závisí na: B-052

- Veřejná: `POST /api/groups/:id/join` → rovnou `active`.
- Neveřejná: žádost s nepovinnou zprávou → `pending`; kterýkoli správce schválí / zamítne, žadatel dostane e-mail.
- Správce: odebrat člena, zablokovat (blokovaný nevidí akce skupiny a nemůže se znovu přidat).
- Člen: `POST /:id/leave` kdykoli (poslední správce nejdřív musí jmenovat jiného, viz B-054).
- FE: tlačítka na stránce skupiny, záložka **Členové** a **Žádosti** pro správce.

**Hotovo, když:**

- [ ] Testy: blokovaný se nepřidá, schvalovat smí jen správce.

---

### B-054 Jmenování správců

`US-16` · FS · S · závisí na: B-053

- Správce povýší člena na správce; správce se může role vzdát. Všichni správci mají stejná práva.
- Poslední správce se role vzdát ani odejít nemůže (`LAST_ADMIN`).

**Hotovo, když:**

- [ ] Test pravidla posledního správce.

---

### B-055 Akce skupiny

`US-18, US-12, US-13` · FS · M · závisí na: B-053, B-022, B-034

- Založení akce s `groupId` smí kterýkoli správce; aktivita předvyplněná a zamčená podle skupiny. Volba viditelnosti **jen pro členy** / **veřejná**.
- U akce je jako organizátor uvedena skupina s proklikem.
- Oprávnění správy akce (úprava, zrušení, účastníci, zprávy, docházka, topování) rozšiř na **všechny správce skupiny** – jedna sdílená funkce `canManageEvent(user, event)` použitá všude.
- Členové dostanou e-mail o nové akci a hlásí se sami.
- „Pořádám“ v Mých akcích obsahuje akce mých skupin.
- Při deaktivaci skupiny (B-051) se nadcházející akce skupiny zruší s důvodem „Skupina byla deaktivována“ a standardními e-maily; proběhlé zůstanou beze změny.

**Hotovo, když:**

- [ ] Testy `canManageEvent` pro organizátora, správce skupiny a běžného člena.

---

### B-056 Moje skupiny

`US-17` · FS · S · závisí na: B-053

- `GET /api/me/groups` (`AuthenticatedUserGuard`): skupiny se stavem `active`, kde mám členství `active` nebo `pending`; u každé moje `role` a `status` členství. Řazení: čekající nahoře, pak podle názvu.
- FE `/skupiny`: pro přihlášeného záložky **Všechny** / **Moje** (`?tab=moje`). Filtry jen pro Všechny. V Moje sekce „Čeká na schválení“ a „Moje skupiny“, u správce popisek „Správce“.

**Hotovo, když:**

- [ ] Test: deaktivovaná skupina, zamítnuté a zablokované členství se nevrací; `pending` ano.

---

# Fáze 6 – Důvěra

### B-060 Hodnocení akce a organizátora

`US-09` · FS · M · závisí na: B-031, B-043

- Model `Rating`: `eventId`, `userId`, `eventStars` 1–5, `comment?`, `organizerStars` 1–5. Jedno hodnocení na uživatele a akci.
- Hodnotit smí jen ten, kdo byl na akci `approved`, a až po skončení akce. Potvrzená docházka podmínkou není.
- Hodnocení organizátora se počítá k osobě, u akce skupiny ke skupině. Průměr u profilu / stránky skupiny.
- Organizátor vidí hodnocení a komentáře svých akcí (ve správě akce).
- FE: stránka `/akce/:id/hodnoceni` (sem vede odkaz z e-mailu).

**Hotovo, když:**

- [ ] Testy oprávnění k hodnocení a výpočtu průměru.

---

### B-061 Nahlášení

`US-10` · FS · S · závisí na: B-060, B-052

- Model `Report`: `targetType` (`user` / `event` / `group` / `rating`), `targetId`, `reason` (`spam` / `fraud` / `inappropriate` / `other`), `comment?`, `reporterId`, `status` (`open` / `rejected` / `resolved`).
- `POST /api/reports` jen přihlášený. Nahlášení samo nic neskryje. Nahlášený se nedozví, kdo ho nahlásil (`reporterId` nikdy nejde ven mimo admin API).
- FE: „Nahlásit“ (menu ⋯) u akce, profilu, skupiny a hodnocení, dialog s důvodem.

---

### B-062 Administrace – přístup a fronta nahlášení

`US-19` · FS · M · závisí na: B-061

- `AdminGuard` (role `admin`) na všech `/api/admin/*`.
- `GET /api/admin/reports` – seskupené podle cíle: typ, důvody, komentáře, počet nahlášení, odkaz na obsah.
- FE `/admin` (v hlavičce jen pro admina): fronta nahlášení, filtry otevřené / vyřízené.

**Hotovo, když:**

- [ ] Test: běžný uživatel na admin API dostane 403.

---

### B-063 Zásahy superadmina a jejich historie

`US-19` · FS · M · závisí na: B-062

- Nahlášení zamítnout, nebo schválit se zásahem a povinným důvodem:
  - **zablokovat uživatele** → nepřihlásí se, jeho nadcházející akce se zruší s e-mailem přihlášeným
  - **skrýt / smazat akci** → organizátor dostane e-mail s důvodem
  - **smazat hodnocení**
- Každý zásah jde vrátit. Model `ModerationAction` (kdo, co, kdy, důvod, vráceno) a historie v administraci.

**Hotovo, když:**

- [ ] Testy: blokace zruší nadcházející akce; vrácení obnoví stav.

---

# Fáze 7 – Monetizace

### B-070 Simulovaná platba a potvrzení adminem

`US-14, US-15` · FS · M · závisí na: B-062

- Model `Payment`: `userId`, `type` (`subscription` / `promotion`), `eventId?`, `amount` (Kč), `status` (`pending` / `confirmed` / `rejected`), `confirmedBy?`, `confirmedAt?`.
- Tok bez platební brány: obrazovka platby (souhrn, částka, „Zaplatit“) → potvrzovací obrazovka „Čeká na potvrzení“ → admin v `/admin/platby` potvrdí → nastaví se „zaplaceno“.
- Platbu nikdy neodemyká klient, jen admin potvrzení na backendu.

**Mimo rozsah:** skutečná platební brána, faktury.

---

### B-071 Předplatné organizátora

`US-14` · FS · M · závisí na: B-070

- Model `Subscription`: `userId`, `validUntil`. Potvrzení platby `subscription` (149 Kč) prodlouží platnost o měsíc.
- Stránka `/predplatne`: výhody (evidence docházky), cena 149 Kč měsíčně, stav a platnost.
- Předplatné správce skupiny platí i pro akce jeho skupiny (`hasAttendanceAccess(user, event)`).

**Hotovo, když:**

- [ ] Testy `hasAttendanceAccess` pro vlastní akci, akci skupiny a prošlé předplatné.

---

### B-072 Evidence docházky

`US-14` · FS · M · závisí na: B-071, B-034

- Ve správě akce záložka **Docházka**: bez předplatného zamčená s odkazem na `/predplatne`.
- S předplatným: od začátku akce do 7 dnů po ní odškrtávání „Přišel“ u schválených (`attendedAt`). Ovládání pohodlné na mobilu i tabletu.
- U žadatele na moje další akce zobraz „Na vaše akce přišel X×“.
- Po vypršení předplatného se docházka zamkne, uložená data zůstanou.

**Hotovo, když:**

- [ ] Testy časového okna a zamčení po vypršení.

**Mimo rozsah:** QR kód (po MVP).

---

### B-073 Topování akce

`US-15` · FS · M · závisí na: B-070, B-025

- Ve správě akce „Topovat akci“ za 50 Kč → platba `promotion` → po potvrzení `promotedUntil = startsAt`.
- Topovaná akce: nahoře ve výpisu (v rámci filtrů), odlišená na mapě, štítek „Topováno“ v tlumeném stylu (ne jako reklama, ne `primary`).
- Topování končí začátkem nebo zrušením akce.

**Hotovo, když:**

- [ ] Test řazení: topovaná akce je první, po začátku/zrušení se neprojevuje.

---

# Fáze 8 – Dokončení

### B-080 Export dat a smazání účtu

`US-05` · FS · M · závisí na: B-060, B-055

- `GET /api/me/export` – JSON s profilem, účastmi, pořádanými akcemi, členstvími a hodnoceními.
- `DELETE /api/me` (s potvrzením heslem): nadcházející pořádané akce se zruší, jméno u proběhlých akcí a hodnocení se anonymizuje („Smazaný uživatel“), přihlášení se znemožní. Poslední správce skupiny musí předat správu, jinak se skupina deaktivuje.

**Hotovo, když:**

- [ ] Testy anonymizace a zrušení akcí.

---

### B-081 Právní stránky a souhlasy

`F-65` · FE · S · závisí na: B-010

- Stránky `/podminky`, `/ochrana-udaju`, cookies lišta (jen technicky nutné cookies → informační lišta bez souhlasu s ostatními). Text dodá tým / PO (otevřená otázka), zatím placeholder s jasnou značkou.

---

### B-082 Ukázková data pro demo

`F-64` · BE · M · závisí na: B-073, B-063

- Navazuje na testovací data ze sprintu 2 (#47: akce, skupiny a účasti v Praze podle kategorií B-002, termíny relativní k okamžiku seedu). Doplní:
- Seed „demo“ režim: cca 30 uživatelů, 8 skupin (Praha + 2 menší města), 60 akcí v příštích 4 týdnech v různých stavech (plno, chybí lidé, se schvalováním, zrušená, topovaná), proběhlé akce s hodnoceními, jeden uživatel s předplatným, otevřená nahlášení a čekající platba pro admina.
- Demo účty (návštěvník-uživatel, organizátor, správce skupiny, admin) do README.

---

### B-083 Smoke test klíčových scénářů

`F-61` · FS · M · závisí na: B-073

- Integrační testy API (supertest nad testovací DB) pro: registrace → ověření → založení akce → přihláška → schválení → plná kapacita → zrušení; simulovaná platba → potvrzení adminem → odemčení docházky.
- Přidat do CI.

---

### B-084 Monitoring, logy a zálohy

`F-62, F-63` · BE · S · závisí na: –

- Strukturované logy (pino nebo Nest logger v JSON), request ID, bez osobních údajů a bez IP adres.
- Healthcheck `GET /api/health` (DB dostupná).
- Skript pro zálohu a obnovu DB (`pg_dump` / `pg_restore`) a postup v README.

---

### B-085 Odstranění vzorové quack feature

– · FS · S · závisí na: B-024

- Až budou mít akce vlastní BE i FE (vzor je převzatý), odstraň `Quack` model, modul, seed, FE feature a route.

**Hotovo, když:**

- [ ] `pnpm check-all` projde a v kódu není `quack` (kromě jména lokální databáze `quacker` v `docker-compose.yml` a `.env.example`: přejmenování by rozbilo už vytvořené lokální databáze; hotovo v #38).

---

## Otevřené otázky a výchozí volby

Dokud tým nebo PO nerozhodne jinak, agent použije výchozí volbu.

| #   | Otázka                                                                            | Výchozí volba                                                                              | Kdo rozhodne |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------ |
| Q1  | Mapa a našeptávač míst (poznámky zmiňují Google Maps)                             | Leaflet + OSM, místo klikem do mapy + textová adresa, lokality z vlastního číselníku       | Tým          |
| Q2  | Služba pro odhad lokality z IP                                                    | Jednoduchá offline databáze (např. GeoLite2 City), při chybě Praha                         | Tým          |
| Q3  | Nahrávání fotek (profil, skupina)                                                 | V MVP jen URL obrázku                                                                      | Tým          |
| Q4  | Podle čeho vybírat akce na úvodní stránce (F-68)                                  | Nejbližší termín v lokalitě, topované první                                                | PO           |
| Q5  | Text obchodních podmínek a zásad ochrany údajů (F-65)                             | Placeholder                                                                                | PO           |
| Q6  | Ukázková data – dodá PO reálné skupiny ze sondy? (F-64)                           | Tým vymyslí realistická data                                                               | PO           |
| Q7  | Zálohy – jak dlouho držet a kdo odpovídá po předání (F-63)                        | 7 denních záloh                                                                            | PO           |
| Q8  | Brand – logo, barvy, referenční aplikace (F-67)                                   | Podle design systému z nástřelu designu                                                    | PO / tým     |
| Q9  | Filtr Obsazenost: Volná místa / Chybí lidé (návrh týmu 20. 10., rozšířen 23. 10.) | Je v aplikaci                                                                              | PO           |
| Q10 | Výchozí pohled /akce na mobilu                                                    | Mapa přes celou obrazovku, seznam ve vysouvacím panelu                                     | PO           |
| Q11 | Zrušení, nebo smazání akce                                                        | Jen zrušení se štítkem „Zrušeno“, akce se nemaže                                           | PO           |
| Q12 | Organizátor jako účastník vlastní akce                                            | Není automaticky, může se přihlásit; jeho přihláška se neschvaluje a počítá se do kapacity | PO           |
| Q13 | Seznam kategorií a aktivit (B-002)                                                | Seznam týmu z 20. 10. (8 kategorií + „Jiné“), konzultace s PO na standupu 23. 10.          | Tým          |

## Mimo MVP (agent nedělá)

Přihlášení přes Google, chat a soukromé zprávy, upozornění v aplikaci (zvonek), QR docházka, poloha zařízení (GPS), náhradníci, oblíbené akce, opakované akce, doporučení, kalendářní pohled, přidání do Google Kalendáře, párování (swipe), akce z vnějších zdrojů, promování akce, reklamy, prémium pro uživatele, mapa skupin.
