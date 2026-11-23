# Účet: export dat a smazání (#64, B-080)

Všechny endpointy vyžadují session; vlastník se bere vždy ze session.

- `GET /api/me/account`: co by smazání udělalo – `hasPassword` (čím se potvrzuje), `confirmationPhrase`, `groupsRunAlone` (aktivní skupiny, kde je uživatel jediný aktivní správce) a `upcomingOrganizedCount`.
- `GET /api/me/export`: JSON ke stažení (`Content-Disposition: attachment`, GDPR čl. 20). Profil, způsoby přihlášení (bez tajemství), účasti i s hodnocením od organizátora, pořádané akce, členství, hodnocení daná i přijatá jako organizátor, přátelství, upozornění, poslané zprávy a oznámení, platby, nahlášení. Ostatní lidé jen jménem, nikdy e-mailem ani ID. Limit 10 za hodinu.
- `DELETE /api/me` (204): tělo `{ password }`, u účtu bez hesla (jen Google) `{ confirmation: "smazat účet" }` a session mladší než `freshAge` BetterAuthu (24 h), jinak 403 `REAUTHENTICATION_REQUIRED`. Heslo ověřuje BetterAuth (`auth.api.verifyPassword`). Chyby 400 `PASSWORD_REQUIRED`, `INVALID_PASSWORD`, `CONFIRMATION_MISMATCH`. Limit 5 pokusů za 15 minut.

Smazání v tomto pořadí (selhání v půlce nechá účet, který to může zkusit znovu, nikdy smazaný účet s živými akcemi):

1. Skupiny, které uživatel spravuje sám, se deaktivují stávající deaktivací (B-051: zruší jejich nadcházející akce, smažou čekající žádosti). Dialog je vyjmenuje předem s výzvou předat správu.
2. Jeho nadcházející akce se zruší s důvodem „Účet organizátora byl smazán.“ stejně jako „Zrušit akci“ (účastníci dostanou upozornění a e-mail); akce skrytá superadminem se zruší potichu.
3. V jedné transakci: účet se anonymizuje (`name` = „Smazaný uživatel“, e-mail `deleted-<id>@deleted.invalid` – původní adresa je volná pro novou registraci –, bez bia, fotky, uživatelského jména, domovské lokality, viditelnost `nobody`, role `user`, `deletedAt`), místa a žádosti na nezačatých akcích se stáhnou (`withdrawn`), smažou se členství, přátelství a žádosti, zájmy, upozornění, sessions, účty přihlášení a ověřovací odkazy.
4. Organizátoři akcí, kde měl schválené místo, dostanou „participant-left“.

Řádek uživatele zůstává kvůli cizím klíčům (akce, hodnocení, platby): proběhlé účasti, hodnocení a zprávy ukazují „Smazaný uživatel“. Veřejný profil smazaného účtu je 404 a seznamy přátel ho vynechávají (`deletedAt`). Migrace není potřeba, `User.deletedAt` už existuje.
