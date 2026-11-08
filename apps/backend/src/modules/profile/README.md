# Vlastní profil (#178)

- `GET /api/me/profile`: údaje aktuálního účtu, domovská lokalita, zájmy a informace, zda existuje přihlášení heslem.
- `PATCH /api/me/profile`: volitelné `name`, `homeLocalityId`, `interestIds`. Vynechané pole se nemění; `homeLocalityId=null` lokalitu zruší a `interestIds=[]` vymaže zájmy. Neznámá pole jsou odmítnuta. Název lokality ani názvy aktivit se nepřijímají jako nové katalogové záznamy.
- `GET /api/me/profile/overview`: vlastní pořádané akce, nadcházející účasti včetně čekajících, historie schválených účastí a přijatá hodnocení. Z každého seznamu vrací jen první `PROFILE_OVERVIEW_TAKE` (3) položky, jako přehled ve Figmě B-05; celkové počty jsou v `organizingTotal`, `upcomingTotal`, `pastTotal` a u hodnocení v `…Summary.count`. Členství skupin využívá existující `GET /api/me/groups`.

Všechny endpointy vyžadují session. Vlastník se vždy bere ze session, nikoliv z těla, URL nebo query. Smazaný účet se odmítne; blokovaný účet nesmí upravovat profil. Odpovědi jsou explicitní projekce bez účtů poskytovatelů, hashů hesel, tokenů nebo poznámek moderace.

Historie (schválené účasti) používá konec akce, pokud existuje, jinak začátek. Nezahrnuje zamítnuté nebo odvolané účasti ani skryté, smazané a zrušené akce. „Co pořádám“ a „Kam jdu“ používají stejnou podmínku jako záložky Pořádám a Přihlášen v Moje akce (`buildMyEventsWhere`): jen akce, které ještě nezačaly (publikované i zrušené se štítkem), u pořádání i akce skupin, které uživatel spravuje, řazené od nejbližší. Počty i obsah sekcí tak odpovídají tomu, kam vede odkaz „Všechny v Moje akce“. Průměry se počítají z agregace v databázi přes všechna hodnocení (ne jen načtená) se stejným zaokrouhlením jako `summarizeStars`, vždy s počtem; bez hodnocení je průměr `null`. Smazaná hodnocení a hodnocení skrytých či smazaných akcí se nezobrazují. Hodnocení organizátora se týká pouze jeho osobních akcí, nikoliv akcí skupin.

Změnu hesla a e-mailu provádí klient přes BetterAuth. Změna hesla ukončí ostatní sessions. Změna e-mailu pouze odešle ověření nové adresy; `updateEmailWithoutVerification=false`, takže původní adresa platí do dokončení ověření. Skutečné doručení zpráv na stagingu závisí na konfiguraci #165. Veřejný profil je samostatná #179.

Není potřeba migrace; modul používá existující profilové sloupce, `UserInterest` a model hodnocení z #180.
