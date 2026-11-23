# Vlastní profil (#178)

- `GET /api/me/profile`: údaje aktuálního účtu, domovská lokalita, zájmy a informace, zda existuje přihlášení heslem.
- `PATCH /api/me/profile`: volitelné `name`, `bio` (nejvýš 500 znaků, prázdné ho smaže), `homeLocalityId`, `interestIds` a viditelnost `photoVisibility`, `bioVisibility`, `pastEventsVisibility` (`everyone` / `friends` / `organizers` / `nobody`, B-014, #64). Vynechané pole se nemění; `homeLocalityId=null` lokalitu zruší a `interestIds=[]` vymaže zájmy. Neznámá pole jsou odmítnuta. Název lokality ani názvy aktivit se nepřijímají jako nové katalogové záznamy.
- `GET /api/me/profile/overview`: přijatá hodnocení (jako účastník a jako organizátor). Z každého seznamu vrací nejvýš `PROFILE_OVERVIEW_TAKE` (50) nejnovějších položek, celkové počty a průměry jsou v `…Summary`. Profil ukáže tři a zbytek na „Zobrazit další“ (#370). Akce (Kam jdu, Pořádám, Proběhlé) a skupiny profil od #367 neukazuje: jsou v Moje, `GET /api/me/events` (`attending`, `organizing`, `past`) a `GET /api/me/groups`.

- `PATCH /api/me/profile/details` (#64): totéž jako `multipart/form-data`, kde `profile` je JSON s poli výše a volitelným `removePhoto` a `image` je nová fotka (JPEG, PNG nebo WebP do 5 MB). Fotka se kontroluje a zmenšuje jako obrázky akcí a skupin (`prepareImage` z modulu `image`) a ukládá se do `uploaded_image`; `User.photoImageKey` na ni ukazuje a výměna nebo odebrání starý řádek smaže ve stejné transakci. Servíruje ji `GET /api/images/{photoKey}`, kdo ji uvidí ve veřejném profilu, rozhoduje `photoVisibility` (modul `user`).
- `POST /api/me/profile/onboarding/profile` (#296, #64): volitelný krok průvodce „Představ se partě“. Uloží lokalitu, zájmy, jméno, bio, viditelnost a fotku najednou se značkou dokončení; opakování po úspěchu nic nepřepíše a fotka se pak nevytvoří.

Všechny endpointy vyžadují session. Vlastník se vždy bere ze session, nikoliv z těla, URL nebo query. Smazaný účet se odmítne; blokovaný účet nesmí upravovat profil. Odpovědi jsou explicitní projekce bez účtů poskytovatelů, hashů hesel, tokenů nebo poznámek moderace.

Průměry se počítají z agregace v databázi přes všechna hodnocení (ne jen načtená) se stejným zaokrouhlením jako `summarizeStars`, vždy s počtem; bez hodnocení je průměr `null`. Smazaná hodnocení a hodnocení skrytých či smazaných akcí se nezobrazují. Hodnocení organizátora se týká pouze jeho osobních akcí, nikoliv akcí skupin.

Změnu hesla a e-mailu provádí klient přes BetterAuth. Změna hesla ukončí ostatní sessions. Změna e-mailu pouze odešle ověření nové adresy; `updateEmailWithoutVerification=false`, takže původní adresa platí do dokončení ověření. Skutečné doručení zpráv na stagingu závisí na konfiguraci #165. Veřejný profil je samostatná #179.

Migrace #64: `photoImageKey` na `uploaded_image`, hodnota `friends` ve `profile_visibility` a výchozí `friends` pro navštívené akce (dosud je cizí neviděl nikdo).
