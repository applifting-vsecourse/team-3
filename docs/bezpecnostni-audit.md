# Bezpečnostní audit HobbyHubu

Analýza vychází z `main` (`1f264ab`), stav oprav k 1. 11. 2026 (`main` `6298a49`). Issue: #172.

Kdo nález opraví, změní ve stejném PR i jeho stav v tomto reportu.

## Shrnutí

- **Node.js:** aplikace běžela na `node:24-alpine` bez pevné verze, takže nebylo jisté, zda obsahuje opravu CVE-2026-111497 (Brotli). Verze je teď pevně 24.22.2 (#196).
- **Balíčky:** `pnpm audit` hlásil 10 critical a 55 high. Po aktualizaci (#196) je 0 critical a 0 high, zbývá 6 moderate a 1 low.
- **Kód:** nezávislá analýza nenašla žádný kritický nález, přístup k cizím datům (IDOR) ani SQL injection. Našla 1 vysoký, 4 střední a 8 nízkých nálezů. Vysoký nález (CSRF) je opravený v #140. Čtyři střední řešil #216: N-4 je opravený, u N-2, N-3 a N-5 zbývá část popsaná níže.
- **Průběžná kontrola:** přibyl Dependabot a CodeQL (#196).

## Co ještě chybí

- [ ] Potvrdit s PO přijetí rizika N-3 na stagingu (schůzka 3. 11.).
- [ ] Potvrdit s PO, že pro verzi Node na stagingu stačí nepřímé ověření (viz [Node.js](#nodejs-a-cve-2026-111497)).
- [ ] Rozhodnout s PO, zda má být pro členství ve skupině potřeba ověřený e-mail (S-5).
- [ ] Vyřešit `js-yaml`, oprava už existuje (viz [Závislosti](#závislosti)).
- [ ] Ověřit `BETTER_AUTH_SECRET` a ostatní nastavení na stagingu, ověří Tomáš Klíma (viz [Ke kontrole na stagingu](#ke-kontrole-na-stagingu)).
- [ ] Před vznikem administrace (B-063) nastavit na stagingu superadmina se silným heslem (viz [Ke kontrole na stagingu](#ke-kontrole-na-stagingu)).

## Jak audit proběhl

| Kontrola              | Nástroj                                                                                                                    | Omezení                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Závislosti            | `pnpm audit`                                                                                                               | Jen známé zranitelnosti v registru                                         |
| Analýza kódu          | Nezávislý AI agent bez znalosti předchozí práce, jen čtení kódu                                                            | Nálezy nebyly zkoušeny útokem; hodnoty proměnných na stagingu nejsou známé |
| Statická analýza      | Semgrep 1.183 (sady `javascript`, `typescript`, `nodejs`, `react`, `secrets`, `dockerfile`, `github-actions`), 393 souborů | Testy a generovaný kód vyřazené                                            |
| Statická analýza      | CodeQL na GitHubu (`javascript-typescript`, `actions`)                                                                     | Výchozí sada pravidel                                                      |
| Bezpečnostní hlavičky | Jeden požadavek `HEAD` na úvodní stránku stagingu                                                                          | Jen úvodní stránka frontendu                                               |

Semgrep našel 7 upozornění, všechna stejného typu: akce v GitHub Actions nejsou připnuté na commit (viz N-12).

CodeQL má na `main` 3 otevřená upozornění. Dvě hlásí chybějící `permissions` v `ci.yml` a `deploy.yml` (viz N-12). Třetí je planý poplach: kontrola `includes("photon.komoot.io")` je v testovacím mocku (`LocalityCombobox.test.tsx`), ne v kódu aplikace.

## Node.js a CVE-2026-111497

Zranitelnost zápisu mimo paměť v dekodéru Brotli (závažnost high). Proces, který dekóduje data od útočníka, může prozradit paměť nebo spustit cizí kód. Opravené verze jsou 22.23.4, 24.22.1 a 26.12.1.

| Místo                  | Před        | Po               |
| ---------------------- | ----------- | ---------------- |
| `.nvmrc` (čte ho i CI) | `24`        | `24.22.2`        |
| `Dockerfile*`          | `24-alpine` | `24.22.2-alpine` |
| `engines`              | `>=24`      | `^24.22.1`       |

Na `node:24.22.2-alpine` jsme přešli, protože jde o nejnovější verzi řady 24 a obsahuje opravu z 24.22.1. Frontendový image navíc přešel z `nginx:1.27-alpine` na `nginx:1.30-alpine`.

**Ověření na stagingu:** přímo ověřit nejde, tým nemá přístup do Coolify. Nepřímé důkazy:

- Nasazení commitu `cb3b2f4` s pevnou verzí skončilo úspěšně.
- Staging vrací hlavičku `Server: nginx/1.30.6`, tedy verzi nginx, kterou přidal stejný PR #196.
- `docker build` obou `Dockerfile.deploy` proběhl a backend v image běží na v24.22.2.
- CI běží na Node z `.nvmrc`.

## Závislosti

| Závažnost | Před | Po  |
| --------- | ---- | --- |
| critical  | 10   | 0   |
| high      | 55   | 0   |
| moderate  | 61   | 6   |
| low       | 14   | 1   |

Nejzávažnější opravené položky: `better-auth` (přihlášení za jiného uživatele), `next` (spuštění kódu; v aplikaci se nepoužívá, do stromu se dostal jen jako volitelná závislost `better-auth`), `proxy-addr`, `handlebars`, `shell-quote`, `multer`, `nodemailer`.

Přes `pnpm.overrides` jsou vynucené `next` a `multer`, protože je jinak drží starší verze závislostí. Až to `@nestjs/platform-express` a `better-auth` vyřeší samy, je možné override odebrat.

`pnpm audit` počítá výskyty, proto 6 moderate znamená tři balíčky. Po první aktualizaci hlásil jen `js-yaml`, `minimatch` a `glob` přibyly s novými upozorněními v registru.

| Co zůstává                                                                                   | Závažnost | Důvod                                                                                                    |
| -------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `js-yaml` 5.3.0 ([GHSA-r3ph-w7gj-g6xm](https://github.com/advisories/GHSA-r3ph-w7gj-g6xm))   | moderate  | Přichází přes `@nestjs/swagger` 11. Opravená verze 5.4.1 existuje, jde vynutit přes override (neověřeno) |
| `minimatch` ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249))       | moderate  | Přichází přes `react-email`, `@nestjs/cli`, `jest` a `npm-run-all`; oprava je až v nové hlavní verzi     |
| `glob` ([GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4))            | moderate  | Přichází přes `react-email`, `@nestjs/cli` a `jest`; oprava je až v nové hlavní verzi                    |
| `deepmerge` 4.3.1 ([GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)) | low       | Opravená verze neexistuje; jen vývojový nástroj `@nestjs/cli`                                            |

## Nálezy v kódu

Stav: **opraveno** = sloučeno do `main`, **částečně** = opravená jen část, zbytek je popsaný, **otevřený** = zatím se neřeší, **přijaté** = návrh ponechat tak, jak je.

| ID   | Nález                                                                                                                                          | Závažnost | Stav                         | Oprava nebo doporučení                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------- | ---------------------------------------------------------------- |
| N-1  | Zápisy do `/api` nekontrolovaly původ požadavku, aplikace jiného týmu na společné doméně je mohla vyvolat                                      | vysoká    | opraveno v #140              | Stejný problém jako S-4; na stagingu ověřeno                     |
| N-2  | Simulovaná schránka se zapínala sama, když chyběla e-mailová služba, takže jde ověřit cizí adresu; po zapnutí Googlu (#165) hrozí sdílení účtu | střední   | částečně v #216              | Viz [Zbývá u N-2 a N-3](#zbývá-u-n-2-a-n-3)                      |
| N-3  | Demo účty s heslem zveřejněným v repu se zakládaly při každém startu, pokud se to výslovně nevyplo                                             | střední   | částečně v #216              | Viz [Zbývá u N-2 a N-3](#zbývá-u-n-2-a-n-3)                      |
| N-4  | Chyběly bezpečnostní hlavičky (CSP, `frame-ancestors`, HSTS, `nosniff`), stránku šlo vložit do cizího rámce; #140 to neřeší                    | střední   | opraveno v #216              | Hlavičky v `nginx`, `helmet` v backendu; CSP viz níže            |
| N-5  | Neověřený účet mohl bez omezení přidávat lokality do veřejného katalogu; `/api` nemá rate limit                                                | střední   | částečně v #216, zbytek #230 | Viz [Zbývá u N-5](#zbývá-u-n-5)                                  |
| N-6  | Bez e-mailové služby se odkazy pro obnovu hesla a ověření vypisují do logu i v produkci                                                        | nízká     | otevřený, #229               | V produkci logovat jen příjemce a předmět                        |
| N-7  | Zablokovaného uživatele zastaví jen některé cesty; projeví se až s blokací (B-063)                                                             | nízká     | otevřený                     | Odmítat blokované při přihlášení a rušit jejich session          |
| N-8  | Cookie session nemá prefix `__Host-`, jiná aplikace na doméně může podstrčit vlastní cookie                                                    | nízká     | otevřený                     | Samostatná doména pro každý tým, nebo prefix `__Host-`           |
| N-9  | Swagger a referenční stránka BetterAuth jsou v produkci veřejné, referenční stránka načítá nepřipnutý skript z CDN                             | nízká     | otevřený, #229               | Zapínat jen mimo produkci                                        |
| N-10 | Každý přihlášený vidí jména účastníků akcí a může je hromadně stáhnout                                                                         | nízká     | otevřený, #174 a #224        | Produktové a GDPR rozhodnutí, navazuje na #94                    |
| N-11 | Přes registraci a kontrolu uživatelského jména lze zjistit, zda účet existuje                                                                  | nízká     | přijaté                      | Kompromis kvůli UX; limit přihlášení hromadné zkoušení zpomaluje |
| N-12 | `ci.yml` a `deploy.yml` nemají `permissions` (`codeql.yml` je má), akce nejsou připnuté na commit; `COOLIFY_TOKEN` je dostupný celému jobu     | nízká     | otevřený, #228               | Přidat `permissions`, připnout akce, token jen pro krok nasazení |
| N-13 | Frontendový kontejner běží jako root, nasazuje se jen tag `latest`                                                                             | nízká     | otevřený, #228               | `nginx-unprivileged`, tagovat i podle commitu                    |

**CSP u N-4:** frontend omezuje skripty na vlastní doménu a zakazuje vložení do rámce. Obrázky, styly a spojení záměrně neomezuje kvůli mapě, stylům Leafletu a hledání adres. Backend omezuje jen rámce, aby fungoval Swagger.

### Zbývá u N-2 a N-3

V produkci se simulovaná schránka ani demo účty nezapnou samy. Staging je má dál zapnuté výslovně v `apps/backend/Dockerfile.deploy`, protože nemá e-mailovou službu a tým nemá přístup k proměnným v Coolify.

**N-2** se dokončí s #165 (Martin):

- Zadat klíče e-mailové služby na stagingu a ověřit, že e-maily chodí.
- Smazat z `Dockerfile.deploy` řádek `SIMULATED_INBOX=true`.
- Účtům ověřeným simulací zrušit ověření, nebo vynulovat databázi stagingu.

**Klíče na stagingu:** proměnné v Coolify nastavují vyučující, takže vlastní klíče (Google, Resend, SMTP) se na staging dostanou jen při sestavení image: GitHub secret, build-arg v `deploy.yml` a `ENV` v `Dockerfile.deploy`. Hodnoty pak jsou uvnitř image a přečte je každý, kdo k image má přístup. Proto pro staging použít samostatné klíče jen pro staging (u Resendu klíč jen s právem odesílat, u Googlu samostatného OAuth klienta), aby šly při úniku zneplatnit bez dopadu jinam. Klíče nepatří do repa, ani jako výchozí hodnota v `Dockerfile.deploy`.

Dokud je schránka zapnutá, jde na stagingu ověřit cizí adresu. Google se ale k existujícímu účtu nepřipojí, takže účet takhle převzít nejde.

**N-3:** tým navrhuje na stagingu přijmout jako vědomé riziko, potvrzení s PO je na schůzce 3. 11. Staging má jen testovací data bez skutečných uživatelů. Před skutečnou produkcí je potřeba smazat řádek `SEED_DEMO_DATA=true`.

### Zbývá u N-5

Přidat lokalitu teď může jen ověřený uživatel a nejvýš 20krát za hodinu. Limit se počítá na uživatele a po restartu backendu se vynuluje. Zůstává:

- **Rate limit na zbytek `/api`:** ověřený uživatel může dál hromadně zakládat akce a skupiny. Limit podle IP jsme záměrně nepřidali: celá učebna na jedné Wi-Fi je jedna IP (viz #141) a backend nemá nastavené `trust proxy`, takže by mohl počítat všechny uživatele dohromady. Řeší #230.
- **Mazání lokalit:** už přidané lokality jde odstranit jen přímo v databázi, patří to k administraci (B-063).

## Ke kontrole na stagingu

Z kódu nejde zjistit a tým nemá přístup do Coolify. Ověří to Tomáš Klíma:

- `BETTER_AUTH_SECRET` nastavuje Coolify, nesmí mít hodnotu z `.env.example`.
- Backend nesmí být dostupný přímo mimo proxy.
- Proxy musí přepisovat hlavičku `X-Forwarded-For`, jinak nemusí správně fungovat rate limit přihlášení.
- `FRONTEND_URL` a `BACKEND_URL` musí odpovídat skutečným adresám, jinak ochrana z #140 odmítne všechny zápisy.

**Superadmin:** na stagingu není nastavený `SUPERADMIN_EMAIL` ani `SUPERADMIN_PASSWORD`, takže se superadmin nezaložil (seed to hlásí v logu, ověřeno 2. 11.). Výchozí heslo z `.env.example` tam proto nehrozí. Účet superadmina by dnes ani neměl práva navíc, protože administrace (B-063) ještě neexistuje. Než v aplikaci vznikne prostředí a speciální práva pro superadmina, je potřeba ho na stagingu nastavit se silným heslem, které není v repu.

## Co je v pořádku

- **Oprávnění:** všechny controllery prošly kontrolou. Uživatel se bere ze session a akce i skupiny hlídají organizátora a správce.
- **Osobní údaje:** API o lidech vrací jen `id` a jméno, e-mail vidí jen jeho majitel.
- **Vstupy:** DTO odmítají neznámá pole a seznamy mají strop. Raw SQL je parametrizované.
- **Přihlášení:** platnost tokenů, ochranu přihlášení limitem a kontrolu uniklých hesel agent v kódu našel.
- **XSS a přesměrování:** aplikace nepoužívá `dangerouslySetInnerHTML` a návratové adresy prochází přes `safeRedirect`.
- **Tajné údaje:** v historii gitu není žádný soubor `.env`.

## Dřívější audit

Nálezy S-1 až S-5 pocházejí z nočního testování před Sprint Review 2. Jejich report není v repu ani v issues, seznam dodal Martin.

| ID  | Nález                                                 | Závažnost | Stav                                       |
| --- | ----------------------------------------------------- | --------- | ------------------------------------------ |
| S-1 | Neplatné datum při založení a úpravě akce vracelo 500 | nízká     | Opraveno v #137                            |
| S-2 | `GET /api/events?dateTo=9999-12-31` vrací 500         | nízká     | Otevřený, #225; na stagingu ověřeno 1. 11. |
| S-3 | Souběh při vyřizování žádostí o členství ve skupině   | nízká     | Otevřený, #226; viz níže                   |
| S-4 | Zápisy do API z aplikací jiných týmů (CSRF)           | vysoká    | Opraveno v #140; stejný nález jako N-1     |
| S-5 | Do skupiny se jde přidat i bez ověřeného e-mailu      | žádná     | Není chyba, otázka na PO; viz níže         |

**S-2:** běžná nesmyslná data už dostanou 400, ale `9999-12-31` projde validací. `startOfNextPragueDay` z něj počítá následující den v roce 10000 a ten neumí zpracovat. Oprava: omezit rok v `ListEventsQueryDto`.

**S-5:** založení skupiny ověřený e-mail vyžaduje, žádost o členství a vstup do skupiny jen přihlášení. V #46 to tak bylo zvoleno záměrně, Figma A-08 ale stav „neověřený e-mail“ má. Rozhodne PO.

**S-3** je chyba ve skupinách, ne bezpečnostní díra: data neunikají. Odhalilo ji noční testování. Čtením kódu jsme ověřili, že tam pořád je, znovu jsme ji nevyvolávali:

- **Schválení a zamítnutí naráz:** service ověří, že žádost čeká, ale samotný zápis v `group.repository.ts` stav už nekontroluje. Když jeden správce žádost schválí a druhý ji skoro naráz zamítne, může se smazat člověk, kterého ten první právě schválil.
- **Dvě rychlá kliknutí na „Přidat se“:** druhý zápis narazí na unikátní klíč člena skupiny a skončí chybou 500.

Oprava: podmínit zápis stavem žádosti a kolizi vrátit jako běžnou chybu místo 500.

## Průběžná kontrola

- **Dependabot** (`.github/dependabot.yml`): každý týden kontroluje npm, Docker a GitHub Actions.
- **CodeQL** (`.github/workflows/codeql.yml`): běží na každém PR, po sloučení do `main` a jednou týdně. Repo je veřejné, takže je zdarma.
