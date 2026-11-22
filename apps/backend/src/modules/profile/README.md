# Vlastní profil (#178)

- `GET /api/me/profile`: údaje aktuálního účtu, domovská lokalita, zájmy a informace, zda existuje přihlášení heslem.
- `PATCH /api/me/profile`: volitelné `name`, `homeLocalityId`, `interestIds` a `partnerDiscoverable` („Ukazovat mě v Najdi parťáka“, #84, výchozí `true`; `false` = nenabízím se nikomu v [Najdi parťáka](../partner/README.md)). Vynechané pole se nemění; `homeLocalityId=null` lokalitu zruší a `interestIds=[]` vymaže zájmy. Neznámá pole jsou odmítnuta. Název lokality ani názvy aktivit se nepřijímají jako nové katalogové záznamy.
- `GET /api/me/profile/overview`: přijatá hodnocení (jako účastník a jako organizátor). Z každého seznamu vrací nejvýš `PROFILE_OVERVIEW_TAKE` (50) nejnovějších položek, celkové počty a průměry jsou v `…Summary`. Profil ukáže tři a zbytek na „Zobrazit další“ (#370). Akce (Kam jdu, Pořádám, Proběhlé) a skupiny profil od #367 neukazuje: jsou v Moje, `GET /api/me/events` (`attending`, `organizing`, `past`) a `GET /api/me/groups`.

Všechny endpointy vyžadují session. Vlastník se vždy bere ze session, nikoliv z těla, URL nebo query. Smazaný účet se odmítne; blokovaný účet nesmí upravovat profil. Odpovědi jsou explicitní projekce bez účtů poskytovatelů, hashů hesel, tokenů nebo poznámek moderace.

Průměry se počítají z agregace v databázi přes všechna hodnocení (ne jen načtená) se stejným zaokrouhlením jako `summarizeStars`, vždy s počtem; bez hodnocení je průměr `null`. Smazaná hodnocení a hodnocení skrytých či smazaných akcí se nezobrazují. Hodnocení organizátora se týká pouze jeho osobních akcí, nikoliv akcí skupin.

Změnu hesla a e-mailu provádí klient přes BetterAuth. Změna hesla ukončí ostatní sessions. Změna e-mailu pouze odešle ověření nové adresy; `updateEmailWithoutVerification=false`, takže původní adresa platí do dokončení ověření. Skutečné doručení zpráv na stagingu závisí na konfiguraci #165. Veřejný profil je samostatná #179.

Není potřeba migrace; modul používá existující profilové sloupce, `UserInterest` a model hodnocení z #180.
