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

## Upozornění

Nová žádost (i odeslaná znovu) přijde tomu, koho žádám, přijetí tomu, kdo žádal: do centra upozornění i e-mailem (#86, `FriendshipService.request` → `NotificationService.notify`, až po zápisu, který se opravdu stal). Odmítnutí a odebrání zůstávají tichá.

## Pozvánka od kamaráda (#406)

Každý má osobní odkaz `/pozvanka/{kód}`. Kód je 16 náhodných bajtů z CSPRNG (128 bitů podle OWASP Session Management Cheat Sheet) jako base64url, 22 znaků, bez jména, e-mailu i id (`user.inviteCode`). Vzniká při prvním `GET /api/invites/me`, nevyprší a jde vyměnit („Vytvořit nový odkaz“, starý hned přestane platit). Kdo se přes odkaz zaregistroval, je v `user.invitedById` (`invitedAt`): zvoucí z toho vidí jen počet, ne jména. Odměny nejsou.

Pravidla jsou čisté funkce v [`domain/invite.ts`](domain/invite.ts), každý případ s testem:

- **Kdo je pozvaný** (`inviteClaim`): nový účet (do 14 dnů od registrace), který ještě nikdo nepozval, a kód nemá za posledních 24 hodin 20 registrací. Jinak se kód tiše ignoruje: starší účet, pozvaný někým jiným, nebo nad limitem.
- **„Přidat do přátel“ z pozvánky** (`decideInviteAccept`): pozvaný je se zvoucím přítel hned, bez žádosti (sdílený odkaz je souhlas zvoucího). Nový řádek `accepted`, nebo se na přátelství změní řádek, který mezi nimi už byl (žádost kterýmkoli směrem, tiché odmítnutí). Kdo pozvaný není, pošle obyčejnou žádost (`decideRequest`), takže odkaz, který se dostal ven, nikomu cizímu „Kam jde“ neotevře. Sám sebe nepozveš (`SELF`), přátelům se nic nemění.

API:

- `GET /api/invites/me` (přihlášený): `{ code, url, joinedCount }`. Odkaz se skládá z `FRONTEND_URL`, nikdy z hlavičky `Host`.
- `POST /api/invites/me/regenerate` (`VerifiedUserGuard`): nový kód.
- `GET /api/invites/:code` (veřejné): `{ id, name, interests }` zvoucího, tedy jen to, co ukazuje i veřejný profil (nejvýš 3 zájmy pro banner na registraci). Neplatný, vyměněný kód i zablokovaný nebo smazaný zvoucí jsou stejná 404 `INVITE_NOT_FOUND`, takže odpověď nic dalšího o účtech neprozradí.
- `POST /api/invites/:code/accept` s `{ "befriend": true | false }` (`VerifiedUserGuard`): odpověď na krok onboardingu. `{ state }` je vztah ke zvoucímu po akci.

Zvoucí se o novém pozvaném dozví jednou (`friend-invite-joined`, do centra i e-mailem, #86): „{jméno} je nově na HobbyHubu díky tvé pozvánce. Jste přátelé.“, nebo bez druhé věty, když pozvaný zvolil „Teď ne“. Přátelství uzavřené z pozvánky později přijde jako přijetí žádosti, obyčejná žádost jako žádost.

Frontend drží kód z odkazu v `localStorage` (30 dní) a v `from` přes registraci, ověření e-mailu i Google, viz `apps/frontend/src/features/invites`.
