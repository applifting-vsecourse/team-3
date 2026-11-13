# HobbyHub – Backlog pro agenta (MVP)

Zdroj: `HobbyHub_User_Stories_MVP.md` (US-01 až US-19 odvozené z Feature breakdownu v3.4 po FB1 s PO, US-20 až US-22 z planningu sprintu 4) a technické features z epicu _Technický základ_ (F-59 až F-67). Backlog rozkládá user stories na úkoly velikosti jednoho pull requestu, seřazené tak, aby agent mohl brát jeden po druhém shora.

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
10. **Mimo rozsah znamená mimo rozsah.** Co v úkolu není, nedělej (chat, QR docházka, GPS, reklamy…).

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
| B-011                          | Ověření e-mailu a guard ověřeného uživatele                   | US-04               | FS     | M    | B-010               |
| B-012                          | Přihlášení, zapomenuté heslo, návrat na akci                  | US-04               | FE     | S    | B-010               |
| B-013                          | Profil uživatele (data + stránka)                             | US-05               | FS     | M    | B-002, B-003        |
| B-014                          | Viditelnost údajů v profilu                                   | US-05               | FS     | S    | B-013               |
| B-015                          | Změna hesla a e-mailu                                         | US-05               | FE     | S    | B-012               |
| B-016                          | Potvrzení věku 18+ a souhlasy při registraci                  | US-04, F-65         | FS     | S    | B-010, B-081        |
| B-017                          | Přátelé                                                       | US-22               | FS     | M    | B-013, B-044        |
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
| B-044                          | Centrum upozornění v aplikaci                                 | US-21               | FS     | M    | B-041               |
| **Fáze 5 – Skupiny**           |                                                               |                     |        |      |                     |
| B-050                          | Model skupiny a členství                                      | US-16, US-17        | BE     | S    | B-002, B-003        |
| B-051                          | Založení, úprava a deaktivace skupiny                         | US-16               | FS     | M    | B-050, B-011        |
| B-052                          | Stránka skupiny a hledání skupin                              | US-16               | FS     | M    | B-051               |
| B-053                          | Členství ve veřejné a neveřejné skupině                       | US-17               | FS     | M    | B-052               |
| B-054                          | Jmenování správců                                             | US-16               | FS     | S    | B-053               |
| B-055                          | Akce skupiny                                                  | US-18               | FS     | M    | B-053, B-022, B-034 |
| B-056                          | Moje skupiny                                                  | US-17               | FS     | S    | B-053               |
| **Fáze 6 – Důvěra**            |                                                               |                     |        |      |                     |
| B-060                          | Hodnocení akce, organizátora a účastníka                      | US-09               | FS     | M    | B-031, B-043        |
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

`US-04` · FS · M · závisí na: B-010

**Cíl:** Do aplikace se přihlásí jen uživatel s ověřeným e-mailem (PO 4. 11.), takže na akce i do skupin se vždy hlásí ověřený uživatel. Řeší S-5 (#236).

- BetterAuth: ověřovací odkaz s platností 24 h (`EMAIL_VERIFICATION_TTL_SECONDS`, šablona `verify-email.tsx` už existuje), `requireEmailVerification: true` – neověřený se nepřihlásí (chyba `EMAIL_NOT_VERIFIED`, žádná session), po registraci se session nezakládá. Po kliknutí na odkaz je uživatel ověřený, vrátí se přes `redirect` (B-012) na stránku, odkud registrace vyšla, a v dialogu „E-mail je ověřený“ se přihlásí sám („Přihlásit se“, #197); `autoSignInAfterVerification` se nezapíná.
- Kdo je přihlášený, je ověřený: e-mail se ověřuje při registraci a jinak session nevznikne. Při nasazení se smažou session všech uživatelů s `emailVerified = false` (migrace nebo skript v nasazení), takže neověřená session nezůstane ani z doby před změnou.
- FE: po registraci i při pokusu o přihlášení s neověřeným e-mailem obrazovka „Ověř si e-mail“ (Figma B-01a, desktop dialog B-01ad) s „Poslat odkaz znovu“ (s limitem) a „Zpět na přihlášení“. Pruh „Ověř si e-mail“ (`VerifyEmailBanner`) a stavy „neověřený“ na detailu akce a ve formuláři akce se odstraní – přihlášený neověřený uživatel nenastane.
- `VerifiedUserGuard` (vedle `authenticated-user.guard.ts`) zůstává jen jako obrana do hloubky: 403 `EMAIL_NOT_VERIFIED`, když `emailVerified = false`, a dál odmítá zablokovaného uživatele (`blockedAt`). Nové endpointy na něm nestojí – ověření zajišťuje přihlášení. Přihlášení přes Google: e-mail ověřil Google.
- Seed: demo účet Eva (`emailVerified: false`) se nepřihlásí a ukazuje obrazovku B-01a.

**Hotovo, když:**

- [ ] Test guardu: neověřený → 403, zablokovaný → 403, ověřený → projde.
- [ ] Test přihlášení: neověřený e-mailem a heslem se nepřihlásí a nedostane session, ověřený ano; po ověření odkazem se přihlásí.
- [ ] Test registrace: po registraci uživatel není přihlášený a dostane ověřovací e-mail.
- [ ] Test nasazení: po smazání neověřených session nemá žádný uživatel s `emailVerified = false` platnou session.
- [ ] Test FE: po registraci i po odmítnutém přihlášení neověřeného obrazovka „Ověř si e-mail“ s novým odesláním odkazu.

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
- `GET /api/users/:id` – veřejný profil (PO 4. 11., mění 28. 10.): jméno, zájmy a hodnocení (B-060, vždy s počtem): jak ho hodnotili organizátoři jako účastníka (průměr a hodnocení s komentáři), průměr jako organizátor a průměrné hodnocení akcí, které pořádá. Když pořádal veřejné akce, i historie proběhlých s počtem lidí a průměrem hodnocení akce (Figma B-07). Jen veřejné akce, ne jen pro členy ani soukromé; akce skupin se osobě nepočítají. E-mail, akce, kterých se účastnil, ani skupiny nevrací, ty vidí jen uživatel sám (#179). Víc údajů až s přátelstvím (B-014).
- FE: stránka `/profil` (úprava a přehled mých akcí, skupin a hodnocení, #178) a `/uzivatele/:id` (zobrazení, #179). Onboarding `/vitej` (PO 10. 11., sprint 4, US-20): krokový průvodce při prvním přihlášení – po registraci e-mailem až po ověření e-mailu a přihlášení (B-011, do té doby session nevzniká), přes Google hned; Figma B-08 / B-08d – domovská lokalita (předvyplněná odhadem), zájmy výběrem jako filtr A-02a, případně další údaje. „Uložit a ukázat akce“ vede na /akce s „Podle tvých zájmů“, „Teď ne“ průvodce přeskočí a znovu se nenabízí; údaje jdou změnit v `/profil`.
- Sprint 3 (#178): jméno, domovská lokalita a zájmy; fotka a bio zůstávají v #64.

**Hotovo, když:**

- [ ] Uložená domovská lokalita se předvyplní ve filtru výpisu akcí (až bude B-024).
- [ ] Testy validace (délka bia, neexistující aktivita).

---

### B-014 Viditelnost údajů v profilu

`US-05` · FS · S · závisí na: B-013

**Cíl:** Uživatel rozhoduje, kdo vidí fotku, bio a navštívené akce.

> Odloženo (PO 28. 10.): nastavení viditelnosti přijde až s přátelstvím. Do té doby veřejný profil ukazuje jméno, zájmy, hodnocení a historii pořádaných veřejných akcí (B-013, PO 4. 11.).
>
> Přátelé (PO 10. 11.) jsou B-017, B-014 na ně navazuje: nastavení viditelnosti přijde po přátelství.

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

### B-017 Přátelé

`US-22` · FS · M · závisí na: B-013, B-044

**Cíl:** Aplikace lidi i propojuje: uživatel se spojí s lidmi, které zná, a vidí, kam chodí (PO 10. 11., sprint 4).

> Koncept a texty schválí refinement 16. 11.; body s [návrh] jsou předpoklad týmu. Datový model je zatím návrh v `docs/datovy-model.md`.

- Veřejný a osobní profil (PO): veřejný profil (`/uzivatele/:id`, B-013) vidí kdokoli; přítel navíc vidí akce, na které uživatel jde. Co dalšího vidí jen přátelé, rozhodne refinement (navazuje B-014).
- Na veřejném profilu „Přidat do přátel“; žádost přijde jako upozornění (B-044) a jde přijmout nebo odmítnout. [návrh] Přítele jde odebrat.
- Sekce „Lidé, které znám“ se seznamem přátel a čekajících žádostí.
- U přítele vidím jeho nadcházející akce: jen veřejné a ty, které bych viděl i sám (ne soukromé ani jen pro členy cizí skupiny).

**Hotovo, když:**

- [ ] Testy: žádost, přijetí, odmítnutí; nepřítel akce neuvidí; soukromá akce se příteli neukáže.

---

# Fáze 2 – Akce a objevování

### B-020 Model akce

`US-11, US-13, US-15, US-18` · BE · M · závisí na: B-002, B-003

**Cíl:** Jeden model akce pro akce jednotlivců i skupin.

Prisma model `Event`:

- `title`, `description?`, `activityId`, `startsAt`, `endsAt?`, `lat`, `lng`, `address`, `localityId`
- `minParticipants`, `maxParticipants`, `price?` (Kč, celé číslo), `level?` (začátečník / pokročilý / všichni), `equipment?`
- `approvalMode` (`open` výchozí / `approval`), `visibility` (`public` / `private` / `members`)
- `organizerUserId` (zakladatel), `groupId?` (akce skupiny, B-055)
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
- Lokalita, adresa a špendlík (#147, PR #295): výběr adresy posune špendlík a doplní lokalitu, umístění špendlíku dohledá adresu a lokalitu, volba lokality umístí špendlík do jejího středu. Lokalita se tak odvodí z místa akce a dá se upravit ručně („Upravit lokalitu bez přesunu špendlíku“). Co lokalita a co adresa znamená, je otevřené (Q14).
- Klientská validace stejná jako na BE, chyby pod polem, tlačítko s pending stavem (DESIGN.md › Forms).
- Po zveřejnění přesměruj na detail a nabídni „Sdílet odkaz“ (kopírování do schránky + Web Share API na mobilu).
- Stav „neověřený“ ve formuláři se odstraní (PO 4. 11., B-011): neověřený se nepřihlásí a neověřené session se při nasazení smažou.

**Hotovo, když:**

- [ ] Formulář jde celý vyplnit na mobilu (375 px) včetně výběru místa.

---

### B-023 Veřejný výpis akcí – API s filtry

`US-02` · BE · M · závisí na: B-020

- `GET /api/events` bez přihlášení. Parametry: `q` (název), `localityId` nebo `lat,lng,radiusKm` nebo `bbox` (výřez mapy – „Hledat v této oblasti“), `dateFrom`, `dateTo` (rozsah, oba včetně), `activityId[]`, `categoryId[]` (celá kategorie = všechny její aktivity, i nově přidané), `capacity` (obsazenost: `free` = jen akce, které nejsou plné, `missing` = jen akce s `missingToMin > 0`; změna 23. 10. z `missingOnly`), `sort` (`date` výchozí / `distance`), stránkování. `activityId[]` a `categoryId[]` se sčítají (OR).
- `GET /api/events/facets` – stejné filtry kromě typu aktivity, vrací počty akcí po kategoriích a aktivitách pro výběr typu aktivity. Pokud se nevejde do sprintu, FE počty skryje.
- Vrací jen `status = published`, `visibility = public`, `startsAt > now` (bez `past`, viz níže). Nevrací soukromé a „jen pro členy“.
- `past=true` (#61, filtr Proběhlé na `/akce`): místo nadcházejících akce, které proběhly – po `endsAt`, bez konce po konci dne v Praze (#272, `event-over.ts`, stejné pravidlo jako detail, stránka skupiny, profil a hodnocení) – od nejnovější, každá s průměrem hodnocení akce (`rating`). Zrušené nikdy: nekonaly se, vidí je jen ten, koho se týkají (Moje akce, Můj profil › Proběhlé). Kombinuje se s ostatními filtry; FE s ním neposílá rozsah termínu ani obsazenost.
- Každá položka: aktivita, název, termín, místo (lat/lng + adresa), `missingToMin`, `freeSpots`, `isFull`, organizátor (osoba nebo skupina), `isPromoted`.
- `GET /api/events/map` – stejné filtry, odlehčené body pro mapu (bez stránkování, limit 500).
- Stav po #57: `q` hledá v názvu, názvu aktivity a `Activity.keywords` bez diakritiky (všechna slova); `lat`+`lng` je bod pro `distanceKm` a `sort=distance`, `radiusKm` (1–100) okruh kolem něj. Databáze předfiltruje obdélníkem, přesnou vzdálenost, hledání a řazení dělá služba před limitem 200 (jako obsazenost). Stránkování ani `/events/map` zatím nejsou; FE ukáže „Víc než 200 akcí“. Známé omezení: hledání (`q`) databáze neumí, služba prochází jen 2000 nejbližších termínů v lokalitě (u celého Česka v celé ČR, `SCAN_LIMIT`), takže při větším počtu akcí shodu s pozdějším termínem nenajde. Řešením je fulltext v databázi (sloupec bez diakritiky nebo `unaccent`).

**Hotovo, když:**

- [ ] Testy, že proběhlé, zrušené, soukromé a members-only akce se ve výpisu neobjeví.
- [x] Řazení podle vzdálenosti funguje vůči zadanému bodu.
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

- Klepnutí na špendlík otevře náhled (název, termín, kolik chybí, krátký popisek) s proklikem na detail (A-03a, #56).
- Blízké akce se shlukují do bubliny s počtem (klepnutí přiblíží), např. Leaflet.markercluster.
- Po posunu mapy tlačítko „Hledat v této oblasti“ (parametr `bbox`).
- Hledání (`q`) podle názvu i klíčových slov aktivity (`Activity.keywords`) není hlavní prvek: desktop vpravo v liště filtrů, mobil lupa v hlavičce (#57).
- Okolí zvolené lokality +10 / 25 / 50 km (bounding box / vzdálenost ze souřadnic katalogu, BE rozšíří where-builder z B-023).
- Řazení podle vzdálenosti od středu zvolené lokality; vzdálenost na kartě akce.
- Řazení „Nejbližší termín“ (výchozí) / „Nejmenší vzdálenost“ od středu zvolené lokality (Figma A-02j); bez zvolené lokality (celé Česko) jen termín.
- „Všechny akce“ = výchozí lokalita bez okolí; zapnuté okolí (+10/25/50 km) platí pro všechny záložky (tým 4. 11.).
- Pole hledání má placeholder „Hledat akci nebo aktivitu“.

**Hotovo, když:**

- [x] Při 500 bodech je mapa čitelná díky shlukům.
- [x] Hledání najde akci podle názvu i klíčového slova aktivity bez ohledu na velikost písmen a diakritiku.
- [x] Testy where-builderu pro okolí.

---

### B-026 Detail akce a sdílený odkaz

`US-03` · FS · M · závisí na: B-023

- `GET /api/events/:id` bez přihlášení. Vrací i soukromé akce (soukromá = dostupná přes odkaz). Members-only akce (rozhodnuto 4. 11., upřesněno v review #215): nepřihlášenému vrací 401 `UNAUTHENTICATED` a FE ho pošle na přihlášení s návratem na akci (B-012); přihlášenému nečlenovi 403 `MEMBERS_ONLY` jen s `groupId` – žádný údaj o akci (název, čas, místo, účastníci) ani o skupině navíc; FE si skupinu načte z `GET /api/groups/:id` (B-052, ten je veřejný) a ukáže stránku s cestou do skupiny (A-05i). Zrušenou akci vrací se štítkem a důvodem; `hidden`/`deleted` vrací 404. Totéž 403 vrací i přihlášení, odhlášení a správa akce, které detail načítají nejdřív (Swagger v `events.controller.ts`, #70).
- Proč 403 s `groupId` a ne 404 (review #215): odkaz na akci jen pro členy pošle nečlenovi člen skupiny, a 404 by z něj udělal slepou uličku bez cesty do skupiny (A-05i). Prozradí se jen to, že akce s tímhle `id` existuje a která skupina ji pořádá. `id` je `cuid`, takže akce nejde hádat ani procházet, a skupina je veřejná (stránka skupiny i `GET /api/groups/:id` bez přihlášení). Nepřihlášený nedostane ani `groupId`. Bezpečnostní audit (#172, PR #223) tenhle případ neřeší; kdyby nález přibyl, platí audit.
- „Kdo jde“ bez jmen (Figma A-05, A-05a–c; review #215): kdo jména nevidí, dostane sekci „Kdo jde · N z M“ jen s počtem a jednou větou, kdy jména uvidí – „Jména uvidíš, až budeš na akci.“, u čekající žádosti „Jména uvidíš, až tě organizátor schválí.“ Bez seznamu jmen a avatarů. Mění test v `EventDetailView.test.tsx`, který dnes hlídá, že se sekce neukáže (#195).
- Jména přihlášených (`participants`) vrací API jen organizátorovi, uživateli se schválenou účastí a u akce skupiny aktivním členům a správcům skupiny (PO 28. 10., #174). Rozhoduje server podle session, nikdy podle požadavku. Ostatní dostanou `participants: null` a vidí jen obsazenost („Chybí ještě X“ / „N volných míst“ / „Plno“): návštěvník, přihlášený bez účasti, čekající žadatel, kdo se odhlásil nebo byl odebrán či zamítnut, a čekající nebo zablokovaný člen skupiny. Sekce „Kdo jde“ jim ukáže jen počet a větu, kdy jména uvidí (níž).
- FE stránka `/akce/:id`: název, aktivita, popis, mapa (jeden bod), termín, cena, úroveň, organizátor (osoba nebo skupina, proklik), způsob přihlášení, počet přihlášených, „Chybí ještě X“ / „N volných míst“ / „Plno“, štítek „Zrušeno“ s důvodem, tlačítko „Sdílet odkaz“.
- Open Graph meta (titulek, termín) pro hezký náhled ve WhatsAppu.
- Odkaz se otevře rovnou na detailu, bez přihlašovací obrazovky. Výjimka: akce jen pro členy nepřihlášeného pošle na přihlášení a po něm zpátky na akci (401 výš).

**Hotovo, když:**

- [ ] Testy BE pro každou roli: jména dostane organizátor, schválený účastník a u akce skupiny členové a správci; návštěvník, přihlášený bez účasti, čekající žadatel, odhlášený, odebraný ani čekající člen skupiny ne; members-only nepřihlášenému = 401, přihlášenému nečlenovi = 403 jen s `groupId`.
- [ ] Test FE: bez jmen sekce „Kdo jde“ s počtem a větou, kdy jména uvidí, bez jmen; members-only nepřihlášeného přesměruje na přihlášení s návratem na akci.

---

### B-027 Úvodní stránka s lokalitou podle IP

`US-01` · FS · M · závisí na: B-023, B-026

- Výchozí lokalita na `/`, `/akce` a `/skupiny` (tým 28. 10., #55): domovská lokalita z profilu → jinak odhad podle IP → když selže, **celé Česko** (ne Praha). „Zrušit vše“ zruší všechny filtry včetně lokality a vrátí výchozí.
- `GET /api/geo/locality` – výchozí lokalita: domovská z profilu, jinak odhad podle IP (Q2), jinak `null` = celé Česko; `source` říká odkud (`home` / `ip` / `none`). IP ani výsledek se **neukládají** (ani do logů), odpověď má `Cache-Control: private, no-store`.
- Odhad: tabulka českých rozsahů z DB-IP „IP to City Lite“ (CC BY 4.0) přiřazených k městům katalogu, v repu `modules/geo/data/ip-localities-cz.txt`; obnoví ji `pnpm backend geo:build` (DB-IP vydává jednou měsíčně). Zdroj je uvedený v Ochraně osobních údajů.
- Ruční volba lokality se pamatuje jen v prohlížeči (`localStorage`), bez registrace; „Zrušit vše“ ji zapomene.
- Stránka `/` podle Figmy A-01 / A-01d (návštěvník) a A-01p / A-01pd (přihlášený): pás s panelem „Teď chybí jeden“, sekce Tady chybíš, Jak to funguje, Tento víkend, Kousek od tebe, O tyhle akce je zájem, Od dobře hodnocených organizátorů, Tyhle skupiny rozšiřují partu, výzva „Nic pro tebe?“ (#182). Pravidla v `docs/ux-audit.md` › Úvodní stránka:
  - akce se ukáže jen v první sekci, kam patří (panel nahoře je první);
  - akce jen pro členy na úvodní stránce nikdy nejsou;
  - „Od dobře hodnocených“ = organizátor nebo skupina s průměrem aspoň 4,5 z nejméně 3 hodnocení (pravidla průměru v B-060);
  - „Tyhle skupiny rozšiřují partu“ (PO 4. 11.): aktivní skupiny v okolí s nadcházející akcí, do kterých se dá přidat (veřejné) nebo požádat o členství (neveřejné), řazené podle nejbližší akce skupiny;
  - „Podle tvých zájmů“ jen pro přihlášeného: podle akcí, na kterých byl, nebo zájmů v profilu, jinak náhodný výběr.
- Nepoužívej layout hero + tři karty (DESIGN.md).
- API (#182): `GET /api/home?localityId=` vrací sekce už vybrané a seřazené (klíče `highlight`, `missing`, `weekend`, `interests`, `nearby`, `popular`, `wellRated`, `groups`), prázdné vynechá. Lokalita: `localityId` → domovská z profilu → celé Česko; městská část bere akce i skupiny z celého města („v okolí Prahy 3“, A-01pd), jen „Kousek od tebe“ měří od středu městské části; odhad podle IP (#55) se doplní v `resolveHomeLocalityId`. Jen akce, kam se dá ještě přihlásit (ne plné); „Od dobře hodnocených“ nejvýš jedna akce od organizátora; přihlášený nedostane vlastní akce ani ty, kde už má místo nebo žádost nebo kde ho organizátor zamítl či odebral (nová žádost nejde), ani skupiny, kde už je. Limity podle Figmy A-01d: panel 1, ostatní sekce 3. UI (#182): `/` bere sekce jen z `GET /api/home` (ne z `GET /api/events?sort=popular`), `?lokalita=` na `/` pošle `localityId` (do #55); přihlášený má sekce jako rychlé výběry „Pro tebe“ a odpověď je čerstvá 15 minut, aby se náhodný výběr „Podle tvých zájmů“ po návratu do okna nepřeházel (přihlášení na akci ji obnoví).

**Hotovo, když:**

- [x] Test: služba při chybě geolokace vrátí celé Česko; přihlášený s domovskou lokalitou dostane ji.

---

### B-028 Úprava a zrušení akce

`US-13` · FS · M · závisí na: B-022, B-026

- `PATCH /api/events/:id` jen pro organizátora, u akce skupiny i pro jejího správce (`canManageEvent`, B-055) a jen do začátku akce. Maximum nejde snížit pod počet schválených.
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
  - neověřený: stav se odstraní (B-011 – neověřený se nepřihlásí, neověřené session se při nasazení smažou)
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
- Oprávnění: organizátor akce, u akce skupiny i její správci (`canManageEvent`, B-055).

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

> Sprint 4 (PO 10. 11.): sekce „Moje“ ukazuje akce i skupiny (B-056) a zakládání, správa a schvalování členů fungují u akcí i skupin stejně (issue „Moje: akce i skupiny“).

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
- **Jak je to hotové (#176, podle oznámení skupin #194):** `GET/POST /api/events/:id/messages` (množné číslo jako `/announcements`). Poslat smí jen organizátor (ne správce skupiny, který akci spravuje) zveřejněné, nezrušené akce (`403 NOT_ORGANIZER`, `409 EVENT_CANCELLED`), nejvýš 10 zpráv na akci za pražský kalendářní den (`429 MESSAGE_LIMIT`, kontrola pod zámkem řádku akce). Předmět nejvýš 120, text nejvýš 2000 znaků. E-mail (Figma E-01 typ 7, přes `NotificationService` po zápisu) dostanou jen schválení účastníci kromě organizátora. Číst je smí jen ti, kdo vidí „Kdo jde“ (#174, `403 NOT_PARTICIPANT`), u zrušené akce zůstanou ke čtení. FE: „Napsat účastníkům“ ve správě akce (D-04, D-04d), sekce „Zprávy od organizátora“ na detailu (A-05c).

**Mimo rozsah:** chat u akce, odpovědi v aplikaci.

---

### B-043 Plánované e-maily

`US-08, US-09` · BE · M · závisí na: B-041

- Plánovač (`@nestjs/schedule`), každá úloha idempotentní (záznam o odeslání, aby po restartu nepřišel e-mail dvakrát).
- **Připomínka účastníkům** den před akcí.
- **Organizátorovi 48 a 24 h před akcí**, kolik lidí chybí do minima, s odkazy Sdílet / Topovat / Zrušit. Při naplněném minimu nepřijde.
- **Výzva k hodnocení**: dávkově jednou denně večer pro akce, které ten den skončily, všem `approved` (odkaz na hodnocení z B-060). Účastníkům „Ohodnoť akci“, organizátorovi „Ohodnoť účastníky“ (E-01 typy 11 a 12).

**Hotovo, když:**

- [ ] Testy výběru příjemců s fixním „teď“ (fake timers).

---

### B-044 Centrum upozornění v aplikaci

`US-21` · FS · M · závisí na: B-041

**Cíl:** Uživatel vidí v aplikaci, co se stalo s jeho akcemi, skupinami a přáteli (PO 10. 11., sprint 4, #86).

> Seznam událostí a texty schválí refinement 16. 11.; body s [návrh] jsou předpoklad týmu. Datový model je zatím návrh v `docs/datovy-model.md`.

- Zvonek v hlavičce s počtem nepřečtených, centrum upozornění se seznamem od nejnovějšího.
- Upozornění je krátká zpráva („Na tvou akci se přihlásil…“) s proklikem na detail; po otevření je přečtené.
- [návrh] Události: nová přihláška nebo žádost na mou akci, schválení / zamítnutí, zrušení a změna akce, žádost o vstup do skupiny, nová akce skupiny, žádost o přátelství a její přijetí (B-017). Ke stejným událostem e-mail (navazuje na #177, `NotificationService`).
- Upozornění se zapíše ze stejné doménové události jako e-mail, chyba zápisu nerozbije akci uživatele.

**Hotovo, když:**

- [ ] Testy: správní příjemci pro každou událost, počet nepřečtených, cizí upozornění nejde přečíst.

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
- Skupina se nemaže ani neruší, jen **deaktivuje** (PO 19. 10.; v UI „Deaktivovat skupinu“, ne „Zrušit“, aby se to nepletlo se zrušením akce): `status = inactive`, `deactivatedAt`, skupina zmizí z hledání, nejde se do ní přidat, stránka skupiny ukazuje „Skupina už není aktivní“. Všem aktivním členům kromě správce, který deaktivoval, přijde e-mail „Skupina už není aktivní“ (E-01 typ 10); přihlášení na zrušené veřejné akce skupiny, kteří nejsou členy, dostanou e-mail o zrušení akce.
- Nadcházející akce skupiny se zruší s důvodem „Skupina už není aktivní“, proběhlé zůstanou v historii. Zrušení je ve stejné transakci jako deaktivace (B-055, #70).
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
- **Oznámení členům (#194, vzor B-042):** `GET/POST /api/groups/:id/announcements`. Poslat smí jen správce aktivní skupiny, nejvýš 10 oznámení na skupinu za pražský kalendářní den (Figma D-08) (`429 ANNOUNCEMENT_LIMIT`, kontrola pod zámkem řádku skupiny). E-mail dostanou všichni aktivní členové včetně správců i autora (Figma D-08: „všem N aktivním členům“). Číst je smí jen aktivní členové a správci (`403 NOT_GROUP_MEMBER`), u deaktivované skupiny zůstanou ke čtení. FE: „Napsat členům“ ve správě (D-08), sekce „Oznámení“ na stránce skupiny (A-08e).

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

- Založení akce s `groupId` smí kterýkoli správce; aktivita předvyplněná a zamčená podle skupiny. Volba viditelnosti **veřejná** (`public`) / **jen pro členy** (`members`, vidí a hlásí se jen členové; PO 29. 10. jim říká „soukromé“, ale soukromá je v B-026 akce dostupná přes odkaz).
- U akce je jako organizátor uvedena skupina s proklikem.
- Oprávnění správy akce (úprava, zrušení, účastníci, zprávy, docházka, topování) rozšiř na **všechny správce skupiny** – jedna sdílená funkce `canManageEvent(user, event)` použitá všude. Výjimka je hodnocení účastníků (B-060): hodnotí jen zakladatel akce (`organizerUserId`), i u akce skupiny – byl tam a akci vedl (review #215).
- Členové dostanou e-mail o nové akci a hlásí se sami.
- „Pořádám“ v Mých akcích obsahuje akce mých skupin.
- Při deaktivaci skupiny (B-051) se nadcházející akce skupiny zruší s důvodem „Skupina už není aktivní“ a standardními e-maily; proběhlé zůstanou beze změny.

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

### B-060 Hodnocení akce, organizátora a účastníka

`US-09` · FS · M · závisí na: B-031, B-043

- Model `Rating`: `eventId`, `userId`, `eventStars` 1–5, `comment?` (max 500 znaků), `organizerStars` 1–5 (obojí i `CHECK` v databázi, review #313), `deletedAt` (smazáno superadminem, B-063). Jedno hodnocení na uživatele a akci.
- Hodnocení účastníka organizátorem (PO 28. 10.): model `ParticipantRating`: `eventId`, `participantId` (s `eventId` cizí klíč na účast), `stars` 1–5 (i `CHECK` v databázi), `deletedAt`. Jedno na účastníka a akci, hodnotí jen organizátor akce – zakladatel (`organizerUserId`), i u akce skupiny, ne ostatní správci skupiny (výjimka z `canManageEvent` v B-055, review #215) – ne sám sebe, jen u proběhlé akce (`endsAt`, když chybí, `startsAt`) a jen `approved` účastníka: `decideParticipantRating` v `modules/rating/domain/participant-rating.ts`. `comment?` (max 500 znaků, `RATING_COMMENT_MAX_LENGTH`; PO 4. 11., dřív bez komentáře). Limit komentáře hlídá i databáze (`VarChar(500)`) u `ParticipantRating` i `Rating`, hvězdičky 1–5 `CHECK` u obou (review #313). Komentář vidí hodnocený účastník. Po smazání superadminem jde hodnocení jen vrátit, ne dát znovu. Model a výpočet průměrů ve sprintu 3 (#180), dávání hodnocení ve sprintu 4 (#66, PO 10. 11.).
- Hodnotit smí jen ten, kdo byl na akci `approved`, a až po skončení akce. Potvrzená docházka podmínkou není. Akce, která nedosáhla minima (nekonala se – počet schválených pod `minParticipants`), hodnotit nejde, ani přes API: `EVENT_NOT_HELD` (review #314), stejně jako detail akce říká „Akce se nekonala“ a tlačítko „Ohodnotit akci“ se nenabízí. Hodnotit jde do 14 dnů od konce akce a do té doby jde hodnocení změnit (tým 4. 11.): 14 kalendářních dní v pražském čase, ne 14 × 24 h – celý 14. den po dni konce akce (review #313). Platí pro `Rating` i `ParticipantRating`: kód odmítnutí `RATING_WINDOW_CLOSED`, lhůta v `modules/rating/domain/rating-window.ts` (#66).
- Hodnocení organizátora se počítá k osobě, u akce skupiny ke skupině. Průměr jako organizátor (`organizerRatingSummary`, z `Rating.organizerStars`, bez akcí skupin) a jako účastník (`participantRatingSummary`, z `ParticipantRating.stars`) jsou čisté funkce v `modules/rating/domain/rating-summary.ts` (#180) pro profil (B-013, #178, #179): zaokrouhlené na jedno desetinné místo, vždy s počtem, bez hodnocení `null`, smazaná hodnocení se nepočítají a nepočítají se ani hodnocení akcí, které admin skryl nebo smazal. Průměr skupiny (`groupRatingSummary`) z `Rating.organizerStars` akcí skupiny – detail akce skupiny a sekce „Od dobře hodnocených“ (#182). „Dobře hodnocený“ = průměr aspoň 4,5 z nejméně 3 hodnocení.
- Rychlé hodnocení účastníků (PO 4. 11., Figma D-05): organizátor nejdřív „Všem stejně“ – hvězdičky (předvyplněno 5★) a jeden komentář pro všechny, pak jednotlivým účastníkům dá individuální hodnocení (hvězdičky i komentář). Odškrtnout, kdo nepřišel, půjde až v dalších sprintech. Uloží se hodnocení každého účastníka zvlášť, výchozí hodnota pro akci se neukládá. Jeden zápis v transakci; `decideParticipantRating` platí pro každého.
- Organizátor vidí hodnocení a komentáře svých akcí (ve správě akce).
- Hodnocení účastníka i s komentářem je vidět na jeho veřejném profilu (B-013).
- FE: stránka `/akce/:id/hodnoceni` (sem vede odkaz z e-mailu) – obsah podle role: účastník C-03, organizátor D-05 (Figma, stránka „Moje akce a správa akce“).

**Hotovo, když:**

- [x] Testy výpočtu průměru a oprávnění k hodnocení účastníka (#180).
- [x] Testy oprávnění k hodnocení akce a organizátora a API (#66).
- [x] Test lhůty 14 dnů pro `Rating` i `ParticipantRating`: den 14 projde, později `RATING_WINDOW_CLOSED`; změna hodnocení po lhůtě taky ne (#66). Kalendářní dny v pražském čase i přes změnu času (review #313); konec akce přesně o pražské půlnoci patří ke dni před ní (review #314).
- [x] Test: správce skupiny, který akci nezaložil, účastníky akce skupiny nehodnotí (`NOT_ORGANIZER`).

---

### B-061 Nahlášení

`US-10` · FS · S · závisí na: B-060, B-052

- Model `Report`: `targetType` (`user` / `event` / `group` / `rating` / `participant_rating`), `targetId`, `reason` (`spam` / `fraud` / `inappropriate` / `other`), `comment?`, `reporterId`, `status` (`open` / `rejected` / `resolved`).
- `POST /api/reports` jen přihlášený. Nahlášení samo nic neskryje. Nahlášený se nedozví, kdo ho nahlásil (`reporterId` nikdy nejde ven mimo admin API).
- FE: „Nahlásit“ (menu ⋯) u akce, profilu, skupiny a hodnocení, dialog s důvodem.
- Hodnocení účastníka má vlastní typ `participant_rating` (PO 4. 11.): je s komentářem na veřejném profilu a `targetId` bez cizího klíče by z `rating` nepoznal tabulku. Hotové nejpozději s komentáři na profilu.

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

> Sprint 4 (PO 10. 11., P2): první nástřel bez fronty nahlášení (B-062 mimo scope). Z B-062 se vezme jen `AdminGuard`; admin upraví nebo deaktivuje jakoukoli akci přímo z jejího detailu. Deaktivace není zrušení: akci skryje (`status = hidden`, zmizí z výpisu, mapy i úvodní stránky, detail řekne, že akce není dostupná – API 404, B-026 a jde vrátit, zrušení (B-028) posílá e-mail účastníkům a vrátit nejde. Deaktivace se zapíše do historie (`ModerationAction`, `hide_event`); pro úpravu akce superadminem typ zásahu zatím chybí. Blokace uživatelů je volitelný bonus; zbytek B-063 až s B-062.

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

| #   | Otázka                                                                            | Výchozí volba                                                                                                                                 | Kdo rozhodne |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Q1  | Mapa a našeptávač míst (poznámky zmiňují Google Maps)                             | Leaflet + OSM, místo klikem do mapy + textová adresa, lokality z vlastního číselníku                                                          | Tým          |
| Q2  | Služba pro odhad lokality z IP                                                    | Offline tabulka z DB-IP Lite (CC BY 4.0) v repu, při chybě celé Česko (tým 28. 10., #55)                                                      | Tým          |
| Q3  | Nahrávání fotek (profil, skupina, akce)                                           | Akce: organizátor nahraje obrázek jako soubor, bez něj obrázek aktivity (PO 10. 11., #77). Profil a skupina zatím jen URL obrázku             | PO           |
| Q4  | Podle čeho vybírat akce na úvodní stránce (F-68)                                  | Nejbližší termín v lokalitě, topované první; sekce podle #182, pravidla v docs/ux-audit.md                                                    | PO           |
| Q5  | Text obchodních podmínek a zásad ochrany údajů (F-65)                             | Placeholder                                                                                                                                   | PO           |
| Q6  | Ukázková data – dodá PO reálné skupiny ze sondy? (F-64)                           | Tým vymyslí realistická data                                                                                                                  | PO           |
| Q7  | Zálohy – jak dlouho držet a kdo odpovídá po předání (F-63)                        | 7 denních záloh                                                                                                                               | PO           |
| Q8  | Brand – logo, barvy, referenční aplikace (F-67)                                   | Podle design systému z nástřelu designu                                                                                                       | PO / tým     |
| Q9  | Filtr Obsazenost: Volná místa / Chybí lidé (návrh týmu 20. 10., rozšířen 23. 10.) | PO 10. 11.: v této podobě hledajícímu nedává smysl, tým navrhne jednodušší řešení (sprint 4). Do schválení návrhu filtr zůstává beze změny    | PO           |
| Q10 | Výchozí pohled /akce na mobilu                                                    | Mapa přes celou obrazovku, seznam ve vysouvacím panelu                                                                                        | PO           |
| Q11 | Zrušení, nebo smazání akce                                                        | Jen zrušení se štítkem „Zrušeno“, akce se nemaže; zrušení nejde vrátit (PO 10. 11.)                                                           | PO           |
| Q12 | Organizátor jako účastník vlastní akce                                            | Není automaticky, může se přihlásit; jeho přihláška se neschvaluje a počítá se do kapacity                                                    | PO           |
| Q13 | Seznam kategorií a aktivit (B-002)                                                | Seznam týmu z 20. 10. (8 kategorií + „Jiné“), konzultace s PO na standupu 23. 10.                                                             | Tým          |
| Q14 | Co znamená lokalita a co adresa akce (PO 10. 11.: zřejmě dvě nezávislé hodnoty)   | Jako PR #295: lokalita se odvodí z místa akce (špendlík nebo vybraná adresa) a jde upravit ručně; špendlík předvyplní adresu a naopak (B-022) | PO           |

## Mimo MVP (agent nedělá)

Chat a soukromé zprávy, QR docházka, poloha zařízení (GPS), náhradníci, oblíbené akce, opakované akce, doporučení, kalendářní pohled, přidání do Google Kalendáře, párování (swipe), akce z vnějších zdrojů, promování akce, reklamy, prémium pro uživatele, mapa skupin.

Upozornění v aplikaci (centrum upozornění B-044, #86) a přátelé (B-017) se do scope dostaly na planningu sprintu 4 (PO 10. 11., `docs/zapis-planning-sprint4.md`).
