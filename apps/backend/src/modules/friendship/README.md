# Přátelé (B-017, #307)

Uživatel se spojí s lidmi, které zná, a u přítele vidí, kam jde. Schválený koncept a texty jsou v komentáři k #307 (18. 11.), obrazovky ve Figmě v sekci „Přátelé (#307)“ na stránce Účet.

## Model

`Friendship` (`friendship`): jedna žádost na dvojici lidí, bez ohledu na to, kdo žádal. `pairKey` jsou obě ID seřazená a spojená dvojtečkou (`friendshipPairKey`); unikátní index na něm hlídá dvojici v databázi, i když oba požádají ve stejnou chvíli. Stavy `pending` (žádost čeká), `accepted` (přátelé, `acceptedAt`), `rejected` (příjemce tiše odmítl). Účet se v aplikaci maže jen nastavením `deletedAt`, takže záznam zůstane; smazané a zablokované účty se v seznamech nezobrazují, jejich profil vrací 404 a nová žádost na ně `USER_NOT_FOUND`. Kaskáda v databázi (`onDelete: Cascade`) platí jen pro skutečné smazání řádku uživatele.

## Pravidla

Čisté funkce v [`domain/friendship.ts`](domain/friendship.ts), každý stav s testem:

- **Vztah k druhému** (`friendshipState`) z pohledu přihlášeného: `friends`, `outgoing` (moje žádost čeká, i po tichém odmítnutí), `incoming` (jeho žádost čeká na mě), `none`, `self`.
- **Přidat do přátel** (`decideRequest`): nová žádost; když už ten druhý žádá mě, je to přijetí; ten, kdo dřív odmítl, může poslat vlastní žádost (záznam se otočí). Ne sám sobě (`SELF`), ne znovu (`ALREADY_REQUESTED`, i po tichém odmítnutí), ne přátelům (`ALREADY_FRIENDS`). Zablokovaný nebo smazaný účet je `USER_NOT_FOUND`, stejně jako jeho profil.
- **Odmítnout** (`decideReject`): jen žádost, která čeká na mě (`NO_REQUEST`). Tiše, odesílatel dál vidí „Žádost odeslána“.
- **Zrušit žádost / Odebrat z přátel** (`decideRemove`): moje žádost (i odmítnutá) nebo přátelství se smaže a pak jde poslat žádost znovu (rozhodnuto 18. 11., ochranu proti opakovaným žádostem zatím neřešíme). Žádost, která čeká na mě, se odmítá, ne maže (`NO_FRIENDSHIP`).

## API

Jen pro přihlášené, uživatel je vždy ze session, `:userId` je ten druhý. Změny chce `VerifiedUserGuard` (zablokovaný účet nic nemění), čtení stačí přihlášení.

- `GET /api/friends`: přátelé podle jména (české řazení) se zájmy, `incoming` a `outgoing` žádosti od nejnovější (`requestedAt`). Všechno najednou, bez stránkování; profil si vezme první položky a počty. Zablokované a smazané účty v seznamech nejsou.
- `POST /api/friends/:userId`: žádost, nebo přijetí.
- `PATCH /api/friends/:userId` s `{ "status": "rejected" }`: odmítnutí.
- `DELETE /api/friends/:userId`: zrušení žádosti nebo odebrání přítele.

Každá změna odpoví `{ state }`, vztahem k druhému po akci, pro tlačítko na jeho profilu. Zápisy jsou podmíněné stavem, ze kterého pravidla rozhodla (`updateMany` / `deleteMany`): co mezitím vyřídila jiná záložka, se nepřepíše. Když dva požádají současně, druhý zápis narazí na unikátní `pairKey` a service rozhodne znovu, tedy přijme.

Na veřejném profilu (`GET /api/users/:id`, modul `user`) je `friendship` a pro přítele „Kam jde“, viz [`../user/README.md`](../user/README.md).

## Denní limit (#84)

Nových žádostí je nejvýš 20 za pražský den (`FRIEND_REQUESTS_PER_DAY` v [`domain/request-limit.ts`](domain/request-limit.ts)). Platí to pro novou žádost i pro znovu poslanou, přijetí cizí žádosti limit nemá. Hlídá to jedno místo, `FriendshipService.request`, takže `POST /api/friends/:userId` i „Přidat“ v Najdi parťáka odpoví stejně: `429 FRIEND_REQUEST_DAILY_LIMIT`. Počítají se řádky `Friendship`, kde jsem žadatel, i upozornění `friend_request`, která žádosti poslaly, a platí vyšší číslo. Zrušená žádost tak limit neobnoví. Počet a zápis běží v jedné transakci pod `pg_advisory_xact_lock(hashtext(žadatel))` (`FriendRequestLimitRepository`), takže dvě souběžné žádosti limit nepřekročí.

## Upozornění

Nová žádost (i odeslaná znovu) přijde tomu, koho žádám, přijetí tomu, kdo žádal: do centra upozornění i e-mailem (#86, `FriendshipService.request` → `NotificationService.notify`, až po zápisu, který se opravdu stal). Odmítnutí a odebrání zůstávají tichá.

## Pozvánka od kamaráda (#406)

Každý má osobní odkaz `/pozvanka/{kód}`. Kód je 16 náhodných bajtů z CSPRNG (128 bitů podle OWASP Session Management Cheat Sheet) jako base64url, 22 znaků, bez jména, e-mailu i id (`user.inviteCode`). Vzniká při prvním `GET /api/invites/me`, nevyprší a jde vyměnit („Vytvořit nový odkaz“, starý hned přestane platit). Kdo se přes odkaz zaregistroval, je v `user.invitedById` (`invitedAt`): zvoucí z toho vidí jen počet, ne jména. Odměny nejsou.

Pravidla jsou čisté funkce v [`domain/invite.ts`](domain/invite.ts), každý případ s testem:

- **Kdo je pozvaný** (`inviteClaim`): nový účet (do 14 dnů od registrace), který ještě nikdo nepozval, a zvoucí nemá za posledních 24 hodin 20 registrací přes svůj odkaz (20 na zvoucího za den). Pozvaný je jen jednou: přátelé hned vzniknou jen v odpovědi, která pozvánku uplatní. Jinak se kód tiše ignoruje: starší účet, pozvaný už dřív (i tímhle zvoucím, takže jeho pozdější „Odebrat z přátel“ nebo „Zrušit žádost“ platí), nebo nad limitem.
- **„Přidat do přátel“ z pozvánky** (`decideInviteAccept`): pozvaný je se zvoucím přítel hned, bez žádosti (sdílený odkaz je souhlas zvoucího). Nový řádek `accepted`, nebo se na přátelství změní řádek, který mezi nimi už byl (žádost kterýmkoli směrem, pozvaný dřív tiše odmítl zvoucího). Žádost pozvaného, kterou zvoucí tiše odmítl, zůstane, jak je: odkaz jeho „ne“ nepřebije. Kdo pozvaný není, pošle obyčejnou žádost (`decideRequest`), takže odkaz, který se dostal ven, nikomu cizímu „Kam jde“ neotevře. Sám sebe nepozveš (`SELF`), přátelům se nic nemění.

API:

- `GET /api/invites/me` (`VerifiedUserGuard`): `{ code, url, joinedCount }`. Odkaz se skládá z `FRONTEND_URL`, nikdy z hlavičky `Host`.
- `POST /api/invites/me/regenerate` (`VerifiedUserGuard`): nový kód.
- `GET /api/invites/:code` (veřejné): `{ id, name, interests }` zvoucího, tedy jen to, co ukazuje i veřejný profil (nejvýš 3 zájmy pro banner na registraci). Neplatný, vyměněný kód i zablokovaný, smazaný nebo neověřený zvoucí jsou stejná 404 `INVITE_NOT_FOUND`, takže odpověď nic dalšího o účtech neprozradí. Navíc nejvýš 60 dotazů z jedné IP za 10 minut, pak 429 (`InviteLookupThrottlerGuard`).
- `POST /api/invites/:code/accept` s `{ "befriend": true | false }` (`VerifiedUserGuard`): odpověď na krok onboardingu. `{ state }` je vztah ke zvoucímu po akci.

Zvoucí se o novém pozvaném dozví jednou (`friend-invite-joined`, do centra i e-mailem, #86): „{jméno} je nově na HobbyHubu díky tvé pozvánce. Jste přátelé.“, nebo bez druhé věty, když pozvaný zvolil „Teď ne“. E-mail zvoucímu radí, co dělat s odkazem, který se dostal k cizímu (odebrat z přátel, vytvořit nový odkaz). Další odpověď téhož pozvaného je obyčejná žádost a přijde jako žádost, nebo jako přijetí, když zvoucí žádal první.

Frontend drží kód z odkazu v `localStorage` (30 dní, uloží ho jen nepřihlášený) a v `from` přes registraci, ověření e-mailu i Google, viz `apps/frontend/src/features/invites`. Po odpovědi v onboardingu se kód z prohlížeče smaže.

Známé omezení: když se v onboardingu nepodaří načíst zvoucího (výpadek sítě), krok se přeskočí, aby onboarding neblokoval. Kód zůstane v prohlížeči, ale znovu se nabízí jen v onboardingu, takže pozvánka propadne. Přes odkaz pak jde poslat obyčejná žádost na profilu zvoucího.
