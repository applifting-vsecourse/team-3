# Přihlášení přes Google (#154)

Tlačítko „Pokračovat přes Google“ na `/login` a `/signup` se ukáže jen tehdy, když má backend nastavené **obě** proměnné `GOOGLE_CLIENT_ID` a `GOOGLE_CLIENT_SECRET`. Bez nich aplikace nabízí jen e-mail a heslo a nic jiného se nemění. Frontend se na to ptá za běhu (`GET /api/sign-in-providers` → `{"google": true}`), takže po nastavení proměnných stačí restart backendu, frontend se znovu sestavovat nemusí.

## 1. OAuth klient v Google Cloud Console

1. Na https://console.cloud.google.com vyber nebo založ projekt (třeba „HobbyHub“).
2. **Google Auth Platform → Branding** (ve starší konzoli _APIs & Services → OAuth consent screen_): název aplikace HobbyHub, e-mail podpory a odkazy na podmínky a zpracování údajů – `https://team-3.vsepractical.applifting.dev/podminky` a `https://team-3.vsepractical.applifting.dev/ochrana-osobnich-udaju`.
3. **Audience**: typ _External_. Dokud je aplikace ve stavu _Testing_, přihlásí se jen účty zapsané mezi _Test users_ – pro demo je tam přidej, nebo aplikaci publikuj. Stačí základní rozsahy `openid`, `email` a `profile`, žádné citlivé.
4. **Clients → Create client** (dřív _Credentials → Create credentials → OAuth client ID_), typ _Web application_:
   - **Authorized JavaScript origins:** `https://team-3.vsepractical.applifting.dev`
   - **Authorized redirect URIs:** `https://team-3.vsepractical.applifting.dev/api/auth/callback/google`
5. Zkopíruj _Client ID_ a _Client secret_. Secret patří jen do proměnných prostředí, nikdy do repa ani do issue.

Redirect URI je vždy `BACKEND_URL` + `/api/auth/callback/google` a musí sedět přesně, jinak Google vrátí chybu `redirect_uri_mismatch`. Pro lokální vývoj přidej ke stejnému klientovi i `http://localhost:3050` (origin) a `http://localhost:4050/api/auth/callback/google` (redirect URI) a proměnné dej do `apps/backend/.env`.

## 2. Proměnné na stagingu (Coolify)

**Stav #165:** dostupný API token neumožňuje ani čtení potřebných metadat (`HTTP 403`, `missing-read-permission`) a tým nemá administrátorský přístup k platformě. Připravená integrace proto zatím nemůže konfiguraci předat. [Výsledek inspekce a omezení](staging-auth-mail.md#stav-ověření) jsou součástí návodu; samotné uložení secrets nestačí.

Přesný postup pro Google, Gmail SMTP, předávání z GitHub Actions do skutečného runtime backendu a funkční testy je v [návodu pro #165](staging-auth-mail.md). Samotné uložení GitHub secrets ani úspěšný webhook hodnoty backendu nepředá. Čtecí režim workflow identifikuje backend podle image a prostředí; před aktivací musí být ověřeno předávání proměnných do jeho kontejneru.

`GOOGLE_ACCOUNT_LINKING` nech výchozí `false`: zapnutí SMTP samo neopraví účty, které byly ověřené simulovanou schránkou. Nové Google účty fungují i při vypnutém propojování.

Vypnutí: smaž jednu z proměnných (nebo ji nech prázdnou) a restartuj backend – tlačítko zmizí.

## Jak se přihlášení chová

- **Nový uživatel**: účet vznikne s e-mailem od Googlu a e-mail se počítá jako ověřený. Pod tlačítkem je věta, že pokračováním souhlasí s podmínkami a bere na vědomí zpracování údajů; čas souhlasu se uloží (`termsAcceptedAt`) stejně jako při registraci e-mailem.
- **Existující účet se stejným e-mailem**: automatické připojení je výchozí vypnuté; uživatel se přihlásí heslem. Správce může nastavit `GOOGLE_ACCOUNT_LINKING=true` až po bezpečném vyřešení účtů ověřených simulací. Pak se propojí pouze účet s ověřenou adresou; výchozí ochrana BetterAuth zůstává zapnutá.
- **Se simulovanou schránkou** (`SIMULATED_INBOX`, staging bez e-mailové služby) se účty nepropojují vůbec, protože ověřený e-mail tam nedokazuje, že adresa patří majiteli účtu. Po zapnutí skutečné e-mailové služby zůstanou účty ověřené simulací ověřené. Automatické propojování proto zůstává vypnuté; zapnout je lze až po schváleném vyřešení a skutečném ověření starých adres.
- **Jméno z Googlu** projde stejným pravidlem jako při registraci (#153): znaky, které do jména nepatří (číslice, emoji…), se vynechají.
- Po přihlášení se uživatel vrátí tam, odkud přišel (`from`, stejně bezpečně jako u přihlášení heslem). Když Google vrátí chybu nebo uživatel přihlášení zruší, skončí na `/login` s českou hláškou.
