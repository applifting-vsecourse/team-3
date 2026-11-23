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
