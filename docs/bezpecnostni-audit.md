# Bezpečnostní audit HobbyHubu

Analýza vychází z `main` (`1f264ab`), stav oprav k 23. 11. 2026 (`main` `1a38f75`). Issue: #172. Zveřejnění reportu i s otevřenými nálezy schválil PO 3. 11.

Kdo nález opraví, změní ve stejném PR i jeho stav v tomto reportu.

## Shrnutí

- **Node.js:** aplikace běžela na `node:24-alpine` bez pevné verze, takže nebylo jisté, zda obsahuje opravu CVE-2026-111497 (Brotli). Verze je teď pevně 24.22.2 (#196) a na stagingu je ověřená z logu backendu.
- **Balíčky:** `pnpm audit` hlásil 10 critical a 55 high. Po aktualizaci (#196) a vynucení `js-yaml` přes override (#283) je 0 critical a 0 high, zbývá 4 moderate a 1 low.
- **Kód:** nezávislá analýza nenašla žádný kritický nález, přístup k cizím datům (IDOR) ani SQL injection. Našla 1 vysoký, 4 střední a 8 nízkých nálezů. Vysoký nález (CSRF) je opravený v #140. Ze čtyř středních jsou N-3 a N-4 opravené, u N-2 a N-5 zbývá část popsaná níže. Z nízkých jsou N-6 a N-9 opravené v #240, N-12 a N-13 v #401, u N-10 zbývá část, N-11 je přijaté a N-7 a N-8 jsou otevřené.
- **Dřívější nálezy:** všech pět (S-1 až S-5) je opravených.
- **Průběžná kontrola:** přibyl Dependabot a CodeQL (#196).

## Co ještě chybí

- [ ] Ověřit `BETTER_AUTH_SECRET` a ostatní nastavení na stagingu, ověří Tomáš Klíma (viz [Ke kontrole na stagingu](#ke-kontrole-na-stagingu)).
- [ ] Před vznikem administrace (B-063) nastavit na stagingu superadmina se silným heslem (viz [Ke kontrole na stagingu](#ke-kontrole-na-stagingu)). `deploy.yml` předává od #308 jen `SUPERADMIN_EMAIL`; hotovo, až bude variable nastavená, superadmin po nasazení existuje a nastaví si heslo přes „Zapomenuté heslo“.

## Jak audit proběhl

| Kontrola              | Nástroj                                                                                                                    | Omezení                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Závislosti            | `pnpm audit`                                                                                                               | Jen známé zranitelnosti v registru                                         |
| Analýza kódu          | Nezávislý AI agent bez znalosti předchozí práce, jen čtení kódu                                                            | Nálezy nebyly zkoušeny útokem; hodnoty proměnných na stagingu nejsou známé |
| Statická analýza      | Semgrep 1.183 (sady `javascript`, `typescript`, `nodejs`, `react`, `secrets`, `dockerfile`, `github-actions`), 393 souborů | Testy a generovaný kód vyřazené                                            |
| Statická analýza      | CodeQL na GitHubu (`javascript-typescript`, `actions`)                                                                     | Výchozí sada pravidel                                                      |
| Bezpečnostní hlavičky | Jeden požadavek `HEAD` na úvodní stránku stagingu                                                                          | Jen úvodní stránka frontendu                                               |

Semgrep našel 7 upozornění, všechna stejného typu: akce v GitHub Actions nejsou připnuté na commit (viz N-12, opraveno v #401).

CodeQL má na `main` 3 otevřená upozornění. Dvě hlásí chybějící `permissions` v `ci.yml` a `deploy.yml` (viz N-12, opraveno v #401). Třetí je planý poplach: kontrola `includes("photon.komoot.io")` je v testovacím mocku (`LocalityCombobox.test.tsx`), ne v kódu aplikace.

## Node.js a CVE-2026-111497

Zranitelnost zápisu mimo paměť v dekodéru Brotli (závažnost high). Proces, který dekóduje data od útočníka, může prozradit paměť nebo spustit cizí kód. Opravené verze jsou 22.23.4, 24.22.1 a 26.12.1.

| Místo                  | Před        | Po               |
| ---------------------- | ----------- | ---------------- |
| `.nvmrc` (čte ho i CI) | `24`        | `24.22.2`        |
| `Dockerfile*`          | `24-alpine` | `24.22.2-alpine` |
| `engines`              | `>=24`      | `^24.22.1`       |

Na `node:24.22.2-alpine` jsme přešli, protože to byla v době opravy nejnovější verze řady 24 a obsahuje opravu z 24.22.1. Frontendový image navíc přešel z `nginx:1.27-alpine` na `nginx:1.30-alpine` (později na `nginxinc/nginx-unprivileged:1.30-alpine`, viz N-13).

**Ověření na stagingu:** backend od #234 po startu vypíše do logu verzi Node a commit. Na stagingu je v logu `Node v24.22.2, commit 3fe174c` (ověřeno 4. 11. v Dozzle). Další důkazy:

- Staging vrací hlavičku `Server: nginx/1.30.6`, tedy verzi nginx, kterou přidal stejný PR #196.
- CI běží na Node z `.nvmrc`.

## Závislosti

| Závažnost | Před | Po  |
| --------- | ---- | --- |
| critical  | 10   | 0   |
| high      | 55   | 0   |
| moderate  | 61   | 4   |
| low       | 14   | 1   |

Nejzávažnější opravené položky: `better-auth` (přihlášení za jiného uživatele), `next` (spuštění kódu; v aplikaci se nepoužívá, do stromu se dostal jen jako volitelná závislost `better-auth`), `proxy-addr`, `handlebars`, `shell-quote`, `multer`, `nodemailer`.

Přes `pnpm.overrides` jsou vynucené `next`, `multer` a `js-yaml` pod `@nestjs/swagger`, protože je jinak drží starší verze závislostí. Až to `@nestjs/platform-express`, `better-auth` a `@nestjs/swagger` vyřeší samy, je možné override odebrat. `js-yaml` 5.5.0 místo 5.3.0 opravuje [GHSA-r3ph-w7gj-g6xm](https://github.com/advisories/GHSA-r3ph-w7gj-g6xm). Upgrade na NestJS 12 zatím neplánujeme (#231). Až přijde, override `@nestjs/swagger>js-yaml` je potřeba odebrat, jinak by natvrdo držel `js-yaml` 5.x.

`pnpm audit` počítá výskyty, proto 4 moderate znamenají dva balíčky (`minimatch` a `glob`, každý dvakrát). `js-yaml` je od 9. 11. vynucený na 5.5.0 a z výpisu zmizel.

| Co zůstává                                                                                   | Závažnost | Důvod                                                                                                |
| -------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `minimatch` ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249))       | moderate  | Přichází přes `react-email`, `@nestjs/cli`, `jest` a `npm-run-all`; oprava je až v nové hlavní verzi |
| `glob` ([GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4))            | moderate  | Přichází přes `react-email`, `@nestjs/cli` a `jest`; oprava je až v nové hlavní verzi                |
| `deepmerge` 4.3.1 ([GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)) | low       | Opravená verze neexistuje; jen vývojový nástroj `@nestjs/cli`                                        |

## Nálezy v kódu

Stav: **opraveno** = sloučeno do `main`, **částečně** = opravená jen část, zbytek je popsaný, **otevřený** = zatím se neřeší, **přijaté** = návrh ponechat tak, jak je.

| ID   | Nález                                                                                                                                          | Závažnost | Stav                         | Oprava nebo doporučení                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| N-1  | Zápisy do `/api` nekontrolovaly původ požadavku, aplikace jiného týmu na společné doméně je mohla vyvolat                                      | vysoká    | opraveno v #140              | Stejný problém jako S-4; na stagingu ověřeno                                                                                      |
| N-2  | Simulovaná schránka se zapínala sama, když chyběla e-mailová služba, takže jde ověřit cizí adresu; po zapnutí Googlu (#165) hrozí sdílení účtu | střední   | částečně v #216 a #165       | Simulovaná schránka je se SMTP vypnutá; zbývá riziko u účtů ověřených simulací, viz [Zbývá u N-2 a N-3](#zbývá-u-n-2-a-n-3)       |
| N-3  | Demo účty s heslem zveřejněným v repu se zakládaly při každém startu, pokud se to výslovně nevyplo                                             | střední   | opraveno v #216, #234 a #235 | Viz [Zbývá u N-2 a N-3](#zbývá-u-n-2-a-n-3)                                                                                       |
| N-4  | Chyběly bezpečnostní hlavičky (CSP, `frame-ancestors`, HSTS, `nosniff`), stránku šlo vložit do cizího rámce; #140 to neřeší                    | střední   | opraveno v #216              | Hlavičky v `nginx`, `helmet` v backendu; CSP viz níže                                                                             |
| N-5  | Neověřený účet mohl bez omezení přidávat lokality do veřejného katalogu; `/api` nemá rate limit                                                | střední   | částečně v #216 a #230       | Limity zápisů na uživatele, viz [Zbývá u N-5](#zbývá-u-n-5)                                                                       |
| N-6  | Bez e-mailové služby se odkazy pro obnovu hesla a ověření vypisují do logu i v produkci                                                        | nízká     | opraveno v #240              | V produkci se loguje jen příjemce a předmět, i při seedu                                                                          |
| N-7  | Zablokovaného uživatele zastaví jen některé cesty; projeví se až s blokací (B-063)                                                             | nízká     | otevřený                     | Odmítat blokované při přihlášení a rušit jejich session                                                                           |
| N-8  | Cookie session nemá prefix `__Host-`, jiná aplikace na doméně může podstrčit vlastní cookie                                                    | nízká     | otevřený                     | Samostatná doména pro každý tým, nebo prefix `__Host-`                                                                            |
| N-9  | Swagger a referenční stránka BetterAuth jsou v produkci veřejné, referenční stránka načítá nepřipnutý skript z CDN                             | nízká     | opraveno v #240              | V produkci vypnuté, pokud není `API_DOCS=true`; staging je má zapnuté, viz [Zbývá u N-9](#zbývá-u-n-9)                            |
| N-10 | Každý přihlášený vidí jména účastníků akcí a může je hromadně stáhnout                                                                         | nízká     | částečně v #222 a #230       | Účastníky vidí jen organizátor, přijatí účastníci a členové skupiny; veřejné čtení má limit IP, viz [Zbývá u N-10](#zbývá-u-n-10) |
| N-11 | Přes registraci a kontrolu uživatelského jména lze zjistit, zda účet existuje                                                                  | nízká     | přijaté                      | Kompromis kvůli UX; limit přihlášení hromadné zkoušení zpomaluje                                                                  |
| N-12 | `ci.yml` a `deploy.yml` nemají `permissions` (`codeql.yml` je má), akce nejsou připnuté na commit; `COOLIFY_TOKEN` je dostupný celému jobu     | nízká     | opraveno v #401              | `permissions: contents: read`, akce na SHA, token jen v kroku nasazení                                                            |
| N-13 | Frontendový kontejner běží jako root, nasazuje se jen tag `latest`                                                                             | nízká     | opraveno v #401              | `nginx-unprivileged` na portu 80, tag commitu; viz [Zbývá u N-13](#zbývá-u-n-13)                                                  |

**CSP u N-4:** frontend omezuje skripty na vlastní doménu a zakazuje vložení do rámce. Obrázky, styly a spojení záměrně neomezuje kvůli mapě, stylům Leafletu a hledání adres. Backend omezuje jen rámce, aby fungoval Swagger.

### Zbývá u N-2 a N-3

V produkci se simulovaná schránka ani demo účty nezapnou samy. Demo účty má staging dál zapnuté výslovně v `apps/backend/Dockerfile.deploy`.

**N-2:** staging od #165 posílá skutečné e-maily přes SMTP. Na stagingu ověřeno (#165): registrace pošle skutečný ověřovací e-mail a odkaz v něm funguje, „Zapomenuté heslo“ pošle e-mail. Se zadaným SMTP se simulovaná schránka vypne sama (`simulatedInboxEnabled`), staging to hlásí v `GET /api/sign-in-providers` (`"simulatedInbox": false`, 23. 11.). Ověřit cizí adresu na stagingu už nejde.

- **Zbývající riziko:** účty ověřené dřív simulací zůstávají ověřené, tak to tým rozhodl ([`docs/staging-auth-mail.md`](staging-auth-mail.md#na-co-dát-pozor)). Vlastnictví jejich adresy nikdo nedoložil a se skutečnou poštou BetterAuth propojí přihlášení přes Google s existujícím účtem se stejnou ověřenou adresou. Kdo si přes simulaci založil účet s cizí adresou, zná k němu heslo; když se pak majitel adresy přihlásí přes Google, dostane se do téhož účtu a oba ho sdílejí. Demo účty ze seedu jsou na `@example.com`, ty ohrožené nejsou. Kdyby se to mělo změnit: nechat tyto účty znovu ověřit, nebo vynulovat databázi stagingu.
- `SIMULATED_INBOX` je v `Dockerfile.deploy` build argument s výchozí hodnotou `true` a `deploy.yml` mu předává GitHub variable `SIMULATED_INBOX` (bez ní `true`). Dokud je SMTP nastavené, nemá účinek; kdyby klíče SMTP z image zmizely, schránka se zase zapne. Pro skutečnou produkci předat `SIMULATED_INBOX=false`.

**Klíče na stagingu:** proměnné v Coolify nastavují vyučující, takže vlastní klíče (Google, Resend, SMTP) se na staging dostanou jen při sestavení image: GitHub secret, build-arg v `deploy.yml` a `ENV` v `Dockerfile.deploy`. Hodnoty pak jsou uvnitř image a přečte je každý, kdo k image má přístup. Proto pro staging použít samostatné klíče jen pro staging (u Resendu klíč jen s právem odesílat, u Googlu samostatného OAuth klienta), aby šly při úniku zneplatnit bez dopadu jinam. Klíče nepatří do repa, ani jako výchozí hodnota v `Dockerfile.deploy`.

**Limity simulované schránky (#236)** platí, jen dokud je schránka zapnutá. Na stagingu je od #165 vypnutá, takže následující dvě slabiny se teď neprojeví:

- Kdo pošle 20 pokusů se špatným heslem na cizí adresu, zamkne majiteli schránku na 10 minut. Úspěšný pokus počítadlo vynuluje, ale zamčenou schránku neotevře.
- Počítadla drží nejvýš 10 000 klíčů a plné počítadlo nový klíč odmítne, aby zahlcení nevynulovalo běžící limity. Když se naplní počítadlo IP adres, dostane na 10 minut 429 každá nová IP, tedy všichni noví návštěvníci schránky, nejen útočník.

**N-3** je opravené v #234 a #235: v produkci seed založí demo účty jen s heslem z GitHub secretu `SEED_DEMO_PASSWORD`, ne s heslem z repa. Účtům, které heslo z repa ještě měly, ho seed vyměnil a ukončil jejich session. Na stagingu ověřeno 4. 11.: heslo z repa se nepřihlásí. Heslo ze secretu je uvnitř image stejně jako ostatní klíče (viz výše), proto platí jen pro staging. Před skutečnou produkcí je potřeba smazat řádek `SEED_DEMO_DATA=true`.

### Zbývá u N-5

Limity API (#230, `apps/backend/src/shared/rate-limit/rate-limits.ts`) počítá backend v paměti, po restartu se vynulují. Překročení vrací 429 s českou hláškou, kterou frontend zobrazí.

| Co                                                                          | Limit         | Počítá se                   |
| --------------------------------------------------------------------------- | ------------- | --------------------------- |
| Přidání lokality do katalogu (jen ověřený uživatel, #216)                   | 20 za hodinu  | na uživatele                |
| Založení akce nebo skupiny, dohromady                                       | 20 za hodinu  | na uživatele                |
| Ostatní zápisy (přihlášky, zprávy, úpravy, schvalování, přátelé, hodnocení) | 120 za minutu | na uživatele, všechny spolu |

Zakládání a přidání lokality se započítá i do ostatních zápisů. Limit podle IP u zápisů záměrně není: celá učebna na jedné Wi-Fi je jedna IP (viz #141). Bez limitu zůstává simulovaná schránka (má vlastní limity z #236) a potvrzení věku (jednou za účet). Test `rate-limit.coverage.spec.ts` hlídá, že nový zápisový endpoint bez limitu neprojde.

Zůstává:

- **Mazání lokalit:** už přidané lokality jde odstranit jen přímo v databázi, patří to k administraci (B-063).

### Zbývá u N-10

Veřejná čtení vracejí jména a id lidí: organizátora akce v `GET /api/events`, `GET /api/events/:id`, `GET /api/home`, `GET /api/home/events` a `GET /api/groups/:groupId/events`, správců skupiny v `GET /api/groups` a `GET /api/groups/:id`, a veřejný profil v `GET /api/users/:userId`. Od #230 mají všechna dohromady limit 600 požadavků za minutu. Nepřihlášený se počítá podle IP. Přihlášený se počítá podle účtu všude, kde se načítá session, tedy kromě seznamů `GET /api/events` a `GET /api/groups` (u nich by to byl dotaz do databáze navíc). Detail akce se totiž sám ptá každých 10 s a celá učebna na jedné IP by si jinak sdílela jedno počítadlo. Limit je velkorysý a hromadné stahování jen zpomalí. Test `rate-limit.coverage.spec.ts` hlídá, že nová veřejná cesta bez limitu neprojde, pokud není mezi vyjmenovanými cestami, které o lidech nic nevracejí (katalog, obrázky, stav aplikace).

- IP je `request.ip` z Expressu. Za proxy na stagingu ji určuje `trust proxy` (`TRUST_PROXY_HOPS=1`, od #236) a limit tak spoléhá na stejné nastavení proxy jako limit simulované schránky (viz [Ke kontrole na stagingu](#ke-kontrole-na-stagingu)). Dokud to vyučující nepotvrdí, může se stát:
  - Proxy do `X-Forwarded-For` nepřidává adresu klienta: kdo hlavičku nepošle, má IP proxy, takže 600 požadavků za minutu si sdílejí všichni nepřihlášení a seznamy akcí a skupin všech návštěvníků. Kdo ji pošle sám, IP si zvolí a limit obejde.
  - Backend je dostupný přímo, mimo proxy: klient si IP podvrhne stejnou hlavičkou.
- Zda jméno organizátora a správců ve veřejném API zůstává, rozhoduje PO (dotaz v #230).

### Zbývá u N-9

Tým se rozhodl dokumentaci API na stagingu ponechat, proto ji `apps/backend/Dockerfile.deploy` zapíná řádkem `API_DOCS=true`. Před skutečnou produkcí je potřeba ho smazat, stejně jako `SEED_DEMO_DATA=true`, a předat `SIMULATED_INBOX=false` (viz [Zbývá u N-2 a N-3](#zbývá-u-n-2-a-n-3)).

### Zbývá u N-13

- **Port 80 bez roota:** nginx dál poslouchá na portu 80, protože na něj směruje Coolify a tým jeho nastavení měnit nemůže.
  - Neprivilegovaný proces může port 80 použít jen díky tomu, že Docker 20.10+ to v síťovém namespace kontejneru povolí (`net.ipv4.ip_unprivileged_port_start=0`).
  - Se `network_mode: host` nebo se starším runtime by nginx nenaběhl. V logu frontendu by bylo `bind() to 0.0.0.0:80 failed (13: Permission denied)`.
  - Běh bez roota je ověřený lokálně v #401: všechny procesy nginx běží pod uživatelem `nginx` (uid 101).
  - Na stagingu je po nasazení #401 (23. 11.) ověřené jen to, že je dostupný a hlavičky zůstaly: úvodní stránka vrací 200 a bezpečnostní hlavičky z #216. Běh bez roota to nedokládá, stejnou verzi `nginx/1.30.6` a stejné hlavičky vracel i předchozí image. Potvrdit ho jde jen v Coolify (viz [Ke kontrole na stagingu](#ke-kontrole-na-stagingu)).
  - Kdyby to po změně runtime selhalo, vrátit commit se změnou `apps/frontend/Dockerfile.deploy` z #401, workflow můžou zůstat.
- **Image v registru přibývají:** každý push na `main` přidá dva image s tagem commitu a nikdo je nemaže.
  - Image backendu obsahuje klíče z build-args (viz [Klíče na stagingu](#zbývá-u-n-2-a-n-3)).
  - Přepsaný `latest` starý image z registru nesmazal ani dřív, dokud neproběhl úklid registru. Tag commitu ho jen pojmenuje.
  - Proto zůstává pravidlo: na stagingu jen klíče pro staging, po úniku je zneplatnit. Hodnota v image tím ztratí cenu.
  - Úklid starých tagů zatím nikdo neřeší.

## Ke kontrole na stagingu

Z kódu nejde zjistit a tým nemá přístup do Coolify. Ověří to Tomáš Klíma:

- `BETTER_AUTH_SECRET` nastavuje Coolify, nesmí mít hodnotu z `.env.example`.
- Backend nesmí být dostupný přímo mimo proxy.
- Proxy musí přepisovat hlavičku `X-Forwarded-For`, jinak nemusí správně fungovat rate limit přihlášení a limit veřejného čtení akcí a skupin (#230).
- Před backendem je právě jedna proxy (`TRUST_PROXY_HOPS=1`). Při víc proxy by limit simulované schránky počítal adresu vnější proxy, ne klienta.
- Po nasazení #236 nemá žádný uživatel s neověřeným e-mailem platnou session (migrace `20261107120000_end_unverified_sessions`). Dotaz musí vrátit 0: `SELECT count(*) FROM "session" s JOIN "user" u ON u."id" = s."userId" WHERE u."emailVerified" = false AND s."expiresAt" > now();`
- `FRONTEND_URL` a `BACKEND_URL` musí odpovídat skutečným adresám, jinak ochrana z #140 odmítne všechny zápisy.
- Frontend běží z image s tagem commitu z #401 nebo novějším (`nginxinc/nginx-unprivileged`) a proces nginx má uid 101, ne 0 (N-13).

**Superadmin:** do #308 na stagingu nebyl nastavený `SUPERADMIN_EMAIL` ani `SUPERADMIN_PASSWORD` (`deploy.yml` je nepředával a proměnné v Coolify nastavit nejde), takže se superadmin nezaložil (seed to hlásí v logu, ověřeno 2. 11.). Od #308 předává `deploy.yml` jen GitHub variable `SUPERADMIN_EMAIL` (build-arg). Heslo ani jeho hash v image nejsou (review #380): seed založí účet s ověřeným e-mailem a náhodným heslem, které nikde neuloží ani nezaloguje, a superadmin si heslo nastaví přes „Zapomenuté heslo“. Odkaz dojde jen majiteli schránky, proto to seed udělá jen se skutečným e-mailem (SMTP nebo Resend); se simulovanou schránkou superadmina nezaloží a vypíše proč. Existující účet se stejnou adresou, i běžný, nepovýší a heslo mu nemění; superadminovi heslo nemění ani při dalších startech. Zbývající riziko: kdo ovládne schránku `SUPERADMIN_EMAIL`, ovládne i superadmina, proto adresa jen pro tým, s dvoufázovým ověřením. Superadmin má od #308 práva navíc (deaktivace a úprava akcí).

## Co je v pořádku

- **Oprávnění:** všechny controllery prošly kontrolou. Uživatel se bere ze session a akce i skupiny hlídají organizátora a správce.
- **Osobní údaje:** API o lidech vrací jen `id` a jméno, e-mail vidí jen jeho majitel. Zprávu k žádosti (#243) vidí v aplikaci jen organizátor akce nebo správci skupiny, a jen dokud žádost čeká. Organizátorovi akce ji navíc pošle e-mail o nové žádosti (#177), takže mu ve schránce zůstane i po rozhodnutí. Bez e-mailové služby se u každého upozornění zapisuje do logu adresa příjemce a předmět s názvem akce (N-6). U oznámení skupiny (#194) je v předmětu i text, který napsal správce („{skupina}: {předmět}“), takže do logu jde u každého příjemce volný text od uživatele. Staging od #165 posílá e-maily přes SMTP, takže se tam do logu nezapisují.
- **Vstupy:** DTO odmítají neznámá pole a seznamy mají strop. Raw SQL je parametrizované.
- **Přihlášení:** platnost tokenů, ochranu přihlášení limitem a kontrolu uniklých hesel agent v kódu našel.
- **XSS a přesměrování:** aplikace nepoužívá `dangerouslySetInnerHTML` a návratové adresy prochází přes `safeRedirect`.
- **Tajné údaje:** v historii gitu není žádný soubor `.env`.

## Dřívější audit

Nálezy S-1 až S-5 pocházejí z nočního testování před Sprint Review 2. Jejich report není v repu ani v issues, seznam dodal Martin.

| ID  | Nález                                                 | Závažnost | Stav                                        |
| --- | ----------------------------------------------------- | --------- | ------------------------------------------- |
| S-1 | Neplatné datum při založení a úpravě akce vracelo 500 | nízká     | Opraveno v #137                             |
| S-2 | `GET /api/events?dateTo=9999-12-31` vrací 500         | nízká     | Opraveno v #237; na stagingu ověřeno 4. 11. |
| S-3 | Souběh při vyřizování žádostí o členství ve skupině   | nízká     | Opraveno v #400; viz níže                   |
| S-4 | Zápisy do API z aplikací jiných týmů (CSRF)           | vysoká    | Opraveno v #140; stejný nález jako N-1      |
| S-5 | Do skupiny se jde přidat i bez ověřeného e-mailu      | nízká     | Opraveno v #236; viz níže                   |

**S-2:** `9999-12-31` prošlo validací a `startOfNextPragueDay` z něj počítal následující den v roce 10000, který neuměl zpracovat. #237 počítá půlnoc z čísel místo z řetězce, takže filtr vrací seznam akcí.

**S-5:** založení skupiny ověřený e-mail vyžaduje, žádost o členství a vstup do skupiny jen přihlášení. V #46 to tak bylo zvoleno záměrně, Figma A-08 ale stav „neověřený e-mail“ má. Tým 3. 11. rozhodl, že před podáním žádosti o členství musí být e-mail ověřený, PO 4. 11. pravidlo rozšířil: přihlásit se jde jen s ověřeným e-mailem. Opraveno v #236: BetterAuth neověřený e-mail nepřihlásí (403 `EMAIL_NOT_VERIFIED`) a po registraci session nezakládá, migrace ukončila session neověřených uživatelů a `POST /api/groups/:id/join` má navíc `VerifiedUserGuard` pro session, která by přesto zůstala. Odchod ze skupiny a stažení žádosti ověření nepotřebují.

**S-3** je chyba ve skupinách, ne bezpečnostní díra: data neunikají. Odhalilo ji noční testování:

- **Schválení a zamítnutí naráz:** service ověří, že žádost čeká, ale samotný zápis v `group.repository.ts` stav už nekontroluje. Když jeden správce žádost schválí a druhý ji skoro naráz zamítne, může se smazat člověk, kterého ten první právě schválil.
- **Dvě rychlá kliknutí na „Přidat se“:** druhý zápis narazí na unikátní klíč člena skupiny a skončí chybou 500.

Opraveno v #400 (issue #226): schválení i zamítnutí zapíše jen žádost, která pořád čeká (podmínka na stav přímo v zápisu). Kdo přijde pozdě, dostane 409 `NOT_PENDING` a nikoho nesmaže. Druhé „Přidat se“ narazí na unikátní klíč bez chyby (`ON CONFLICT DO NOTHING`) a skončí stejně jako první.

## Průběžná kontrola

- **Dependabot** (`.github/dependabot.yml`): každý týden kontroluje npm, Docker a GitHub Actions.
- **CodeQL** (`.github/workflows/codeql.yml`): běží na každém PR, po sloučení do `main` a jednou týdně. Repo je veřejné, takže je zdarma.
