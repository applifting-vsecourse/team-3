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

1. V Coolify otevři resource HobbyHub (Docker Compose) → **Environment Variables**.
2. Přidej `GOOGLE_CLIENT_ID` a `GOOGLE_CLIENT_SECRET`. Secret označ jako zamčený (_locked_), ať se neukazuje v logu. Compose je předá backendu stejně jako ostatní proměnné z `.env.example` (`env_file: .env`).
3. Restartuj backend (nebo dej _Redeploy_).
4. Ověř, že `https://team-3.vsepractical.applifting.dev/api/sign-in-providers` vrací `{"google":true}` a na `/login` je tlačítko.

Vypnutí: smaž jednu z proměnných (nebo ji nech prázdnou) a restartuj backend – tlačítko zmizí.

## Jak se přihlášení chová

- **Nový uživatel**: účet vznikne s e-mailem od Googlu a e-mail se počítá jako ověřený. Pod tlačítkem je věta, že pokračováním souhlasí s podmínkami a bere na vědomí zpracování údajů; čas souhlasu se uloží (`termsAcceptedAt`) stejně jako při registraci e-mailem.
- **Existující účet se stejným e-mailem**: Google se k němu připojí, druhý účet nevznikne – ale jen když je e-mail toho účtu už ověřený. Jinak by se do cizího účtu dostal ten, kdo si ho dřív založil s cizí adresou a heslem, které zná (výchozí ochrana BetterAuth, necháváme ji zapnutou). Takový uživatel uvidí na `/login` hlášku, ať se přihlásí heslem a e-mail si ověří; pak už Google půjde.
- **Jméno z Googlu** projde stejným pravidlem jako při registraci (#153): znaky, které do jména nepatří (číslice, emoji…), se vynechají.
- Po přihlášení se uživatel vrátí tam, odkud přišel (`from`, stejně bezpečně jako u přihlášení heslem). Když Google vrátí chybu nebo uživatel přihlášení zruší, skončí na `/login` s českou hláškou.
