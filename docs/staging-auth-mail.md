# Google OAuth a Gmail SMTP na stagingu (#165)

Staging: `https://team-3.vsepractical.applifting.dev`.

## Stav ověření

**Integrace není na stagingu zprovozněná.** Čtecí [inspekce z 6. 11. 2026](https://github.com/applifting-vsecourse/team-3/actions/runs/42291428353) skončila chybou `HTTP 403 (missing-read-permission)`. Nasazovací job se nespustil a konfigurace stagingu se nezměnila.

Tým nemá administrátorský přístup k nasazovací platformě. Níže popsaná API integrace vyžaduje oprávnění, která dostupný token nemá; za současných podmínek ji nelze aktivovat. Samotné přidání Google/SMTP secrets tento blok neodstraní. Přenos konfigurace bez těchto oprávnění není v této větvi implementovaný.

Google přihlášení, doručení ověřovacího e-mailu a reset hesla zatím nemají potvrzenou funkční akceptaci. Následující kroky popisují požadavky a ověření připravené integrace, nikoliv již funkční staging.

## Účty a přihlašovací údaje

1. Vytvořit týmový Google účet na <https://accounts.google.com/signup>. Přístupové heslo a obnovovací údaje uložit do správce hesel.
2. Na <https://myaccount.google.com/security> zapnout **2-Step Verification**. Na <https://myaccount.google.com/apppasswords> vytvořit heslo aplikace s názvem `HobbyHub staging`. Pro SMTP se používá toto heslo aplikace, nikoliv běžné heslo Google účtu.
3. Ve stejném účtu otevřít <https://console.cloud.google.com/> → výběr projektu → **New project** → `HobbyHub` → **Create**. Vybrat projekt.
4. **Google Auth Platform → Get started / Branding**: název `HobbyHub`, e-mail podpory a kontaktní e-mail týmového účtu. **Audience: External**, pro první test **Testing**. Do **Test users** přidat účty testujících.
5. V **Branding** použít domovskou stránku stagingu a odkazy `/podminky` a `/ochrana-osobnich-udaju`. Pokud Google vyžádá ověření vlastnictví domény, provede je její správce; vlastnictví se nesmí předpokládat. Pro test není potřeba logo ani placené Maps API.
6. **Data Access → Add or remove scopes**: pouze `openid`, `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile`.
7. **Clients → Create client → Web application**, název `HobbyHub staging`:
   - **Authorized JavaScript origins:** `https://team-3.vsepractical.applifting.dev`
   - **Authorized redirect URIs:** `https://team-3.vsepractical.applifting.dev/api/auth/callback/google`
8. Client ID a Client secret uložit bezpečně. Export klienta, SMTP heslo ani ověřovací odkazy nepatří do repozitáře, issue, PR nebo logů.

Pokud `EMAIL_FROM` není nastavené nebo je prázdné, SMTP použije `SMTP_USERNAME`; Resend použije svou výchozí testovací adresu. Pro staging je odesílatel v následující konfiguraci nastavený výslovně.

## GitHub Actions konfigurace

Repozitář → **Settings → Secrets and variables → Actions → Secrets → New repository secret**:

| Název                  | Hodnota                                          |
| ---------------------- | ------------------------------------------------ |
| `GOOGLE_CLIENT_ID`     | Client ID vytvořeného webového klienta           |
| `GOOGLE_CLIENT_SECRET` | Client secret stejného klienta                   |
| `SMTP_USERNAME`        | Adresa týmového Gmailu                           |
| `SMTP_PASSWORD`        | Heslo aplikace bez mezer vložených pro čitelnost |
| `EMAIL_FROM`           | `HobbyHub <adresa týmového Gmailu>`              |

Existující `COOLIFY_WEBHOOK`, `COOLIFY_TOKEN` a registry secrets zachovat. Pro metadata je potřeba oprávnění `read`, pro změnu prostředí `write` a pro schválené nasazení `deploy`. Zpětná kontrola hodnot navíc u verzí Coolify, které je skrývají, vyžaduje `read:sensitive` a odpovídající roli správce/vlastníka týmu. Přístup má být omezený na příslušný staging projekt a prostředí; plošný `root` token není potřeba. Právo ke čtení metadat samo nedokládá právo k zápisu ani ke čtení hodnot. `COOLIFY_TOKEN` a `COOLIFY_WEBHOOK` jsou předané pouze krokům inspekce, konfigurace a spuštění deploye; sestavení image ani akce pro přihlášení k registru je nedědí.

Synchronizace nastavuje `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, prázdný `RESEND_API_KEY` a `SIMULATED_INBOX=false`. Resend má jinak před SMTP přednost. Klíče jsou pouze runtime konfigurace; nejsou build args ani součástí Docker image.

## Čtecí ověření infrastruktury

**Actions → Build & Deploy → Run workflow**, zvolit schválenou pracovní větev a ponechat **inspect_only** zapnuté. Tento režim pouze identifikuje backend; nesestavuje ani nepublikuje image, nemění proměnné a nespouští deploy. Nepotřebuje Google ani SMTP klíče.

Skript získá adresu API a výchozí UUID ze stávajícího webhooku. UUID webhooku nepovažuje automaticky za backend: webhook může cílit na frontend. Backend ověří podle přesného názvu image `${REGISTRY}/${SLUG}-backend` a prostředí webhooku. Podporuje backend jako aplikaci Coolify typu **Docker Image** s tagem `latest`. Pokud nelze najít právě jeden takový backend, skončí před změnou konfigurace. U jiného způsobu hostování je nutné integraci upravit podle zjištěné konfigurace; Compose stack se automaticky nepřepisuje.

Čtecí režim ověřuje identifikaci a přístup ke čtení, nikoliv zápisová oprávnění nebo funkčnost SMTP/OAuth.

## Odmítnutý přístup a skryté hodnoty

Při neúspěchu skript vypíše HTTP stav a jednu pevnou kategorii, nikdy obsah odpovědi:

| Kategorie                                                                         | Co ověřit se správcem stagingu                                                                 |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `missing-read-permission`                                                         | Token nemá požadované oprávnění `read`.                                                        |
| `missing-sensitive-read-permission`                                               | Chybí `read:sensitive`.                                                                        |
| `missing-write-permission` / `missing-deploy-permission`                          | Chybí právo pro konkrétní operaci; samotná inspekce tato práva neověřuje.                      |
| `api-disabled`                                                                    | API je na instanci vypnuté.                                                                    |
| `ip-not-allowed`                                                                  | Původ požadavku nevyhovuje povoleným IP; nepovolovat plošně přístup bez posouzení.             |
| `resource-scope-denied` / `resource-forbidden`                                    | Rozsah tokenu nebo role nepovolují příslušný prostředek.                                       |
| `unauthenticated`                                                                 | Token není přijatý.                                                                            |
| `html-response` / `json-response` / `other-response` / `unreadable-json-response` | Příčina není potvrzená; může odpovídat proxy nebo jiné verzi API. Nevypisovat surové odpovědi. |

Kategorie se přiřazuje pouze známým pevným zprávám API. Neznámý obsah není přebíraný do logů a nenahrazuje ověření konkrétní verze Coolify. Po odmítnutí se nezapisuje ani se automaticky nezkouší vyšší oprávnění.

Pokud načtené runtime proměnné prokazatelně skrývají hodnoty nebo je některá aktualizovaná proměnná zamčená pro jednorázové zobrazení, skript skončí před zápisem. Žádné proměnné neodemyká. U prázdného seznamu proměnných nelze oprávnění ke čtení jejich hodnot odvodit; správce je musí zajistit před aktivací. Zpětná kontrola po zápisu zůstává povinná. Při záměrném vyprázdnění `RESEND_API_KEY` je přípustné explicitní `null`, pokud API prázdný řetězec normalizuje; chybějící pole hodnoty ani `null` u skutečných přihlašovacích údajů se za ověření nepovažují.

## Aktivace po schválení a merge

1. Ověřit přítomnost všech pěti nových secrets a úspěšný čtecí průchod.
2. **Settings → Secrets and variables → Actions → Variables → New repository variable**: `STAGING_AUTH_MAIL_CONFIGURED=true`. Bez tohoto přepínače se konfigurace nepřenáší.
3. Po týmovém review, merge a schválení nasazení spustit workflow na `main` s vypnutým **inspect_only**, případně využít schválené automatické nasazení z `main`. Nasazení z jiné větve je blokované.
4. Workflow nejprve publikuje oba image. Synchronizace potom změní pouze povolené OAuth/SMTP proměnné identifikovaného backendu a načte je zpět. Při chybě se navazující webhook nespustí.
5. Pokud původní webhook neobsahuje backend, skript po kontrole hodnot zařadí i jeho deploy. Pokud backend obsahuje, použije se stávající webhook bez duplicitního spuštění.

Neúspěšná kontrola po zápisu nemusí vrátit předchozí uložené hodnoty; zastaví ale navazující deploy. Výpis chyb obsahuje pouze typ operace, HTTP stav nebo název proměnné, nikdy hodnoty či odpovědi serveru.

Při provozu přímo z kořenového `docker-compose.yml` již backend přebírá kořenový `.env` přes `env_file`. Compose kvůli této změně není potřeba upravovat. Synchronizační skript podporuje backend typu Docker Image; existence Compose souboru nedokládá typ staging resource. Konfigurace `BACKEND_URL` i `FRONTEND_URL` musí odpovídat doméně stagingu; změna URL vyžaduje i rebuild frontendu.

## Kontrola runtime a funkční akceptace

Následující kontrola vyžaduje přístup k terminálu běžícího backendu, který tým aktuálně nemá. Oprávněný provozovatel tak může ověřit přítomnost a bezpečné nastavení bez výpisu hodnot:

```sh
node -e 'const e=process.env;console.log(JSON.stringify({google:!!(e.GOOGLE_CLIENT_ID&&e.GOOGLE_CLIENT_SECRET),smtp:!!(e.SMTP_HOST&&e.SMTP_USERNAME&&e.SMTP_PASSWORD),gmail:e.SMTP_HOST==="smtp.gmail.com",tls:e.SMTP_SECURE==="true",port465:e.SMTP_PORT==="465",resendOff:!e.RESEND_API_KEY,simulationOff:e.SIMULATED_INBOX==="false"}))'
```

Všech osm hodnot má být `true`. Nepoužívat výpis celého prostředí nebo kompletní `docker inspect`.

Na vlastních testovacích účtech ověřit:

1. `GET /api/sign-in-providers` vrací `{"google":true}`; tlačítko je na `/login` i `/signup`.
2. Google přihlášení s dosud neregistrovanou adresou dokončí přihlášení, ověří e-mail a vrátí uživatele na původní stránku.
3. Registrace heslem na jiné skutečné adrese doručí ověřovací e-mail. Odkaz ověří účet a simulovaná schránka není dostupná.
4. Zapomenuté heslo doručí resetovací e-mail. Odkaz umožní změnu hesla, nové heslo funguje a staré nefunguje. Odpověď endpointu 200 sama nedokládá doručení.
5. Po implementaci #177 ověřit skutečné doručení všech typů upozornění k účasti a akci. Zapnutí SMTP tuto službu nenahrazuje.

Hesla, obsah odkazů a tokeny se do reportu výsledků nezapisují. Úspěšné uložení proměnných ani přijetí deploy požadavku nenahrazuje funkční akceptaci.

## Propojování existujících účtů

Účty ověřené simulovanou schránkou nemají doložené vlastnictví adresy a zapnutí SMTP jejich historii nezmění. Se skutečnou poštou BetterAuth propojí Google s existujícím účtem, jehož e-mail je ověřený (viz [přihlášení přes Google](prihlaseni-pres-google.md#jak-se-přihlášení-chová)). Před zapnutím SMTP na stagingu proto tým s PO rozhodne, jestli staging účty vynulovat, nebo je nechat znovu ověřit. Synchronizace ani deploy databázi nemažou ani nepřepisují.

## Reference

- [Google OAuth pro webové aplikace](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google hesla aplikací](https://support.google.com/accounts/answer/185833)
- [Gmail SMTP](https://developers.google.com/workspace/gmail/imap/imap-smtp)
- [Coolify aplikace](https://coolify.io/docs/api/endpoints/applications/get-application-by-uuid)
- [Coolify prostředí aplikací](https://coolify.io/docs/api/endpoints/applications/update-envs-by-application-uuid)
- [Issue #165](https://github.com/applifting-vsecourse/team-3/issues/165)

Oprávnění a známé kategorie odmítnutí vycházejí z veřejného kódu Coolify: [API oprávnění](https://github.com/coollabsio/coolify/blob/main/app/Http/Middleware/ApiAbility.php), [povolení API](https://github.com/coollabsio/coolify/blob/main/app/Http/Middleware/ApiAllowed.php), [IP omezení](https://github.com/coollabsio/coolify/blob/main/app/Http/Middleware/ApiIpAllowed.php) a [čtení citlivých hodnot](https://github.com/coollabsio/coolify/blob/main/app/Http/Middleware/ApiSensitiveData.php). Konkrétní nasazená verze může používat jinou odpověď.
