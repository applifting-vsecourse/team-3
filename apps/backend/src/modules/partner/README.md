# Najdi parťáka (#84)

Balíček karet s lidmi z okolí, které baví to co mě. Na kartě jsou tlačítka „Teď ne“, „Vrátit“ a „Přidat“ (swipe je jen zkratka). Zadání: PO 16. 11. („10 lidí v dosahu s podobnými aktivitami, případně swipe“), brief v PR.

## Kdo je v balíčku

Pravidla jsou čisté funkce v [`domain/partner-suggestions.ts`](domain/partner-suggestions.ts) a každé má test.

- **Kdo se může ukázat** (`partnerCandidatesWhere`): ověřený e-mail, není zablokovaný ani smazaný, má dokončený onboarding a zapnuté „Ukazovat mě v Najdi parťáka“ (`User.partnerDiscoverable`, výchozí `false`: ukáže se jen ten, kdo to sám zapne tlačítkem „Ukázat mě“ v Najdi parťáka nebo v úpravě profilu; ochrana soukromí už v návrhu, GDPR čl. 25). Má domovskou lokalitu v obdélníku okruhu a aspoň jeden zájem shodný se mnou. Nikdy já, přátelé ani nikdo, s kým mám řádek `Friendship` v jakémkoli stavu a směru. Výjimkou je jeho žádost, která ještě čeká na mě: „Přidat“ ji přijme, a to je shoda (vzájemný like jako Bumble nebo Tinder). Nikdo, koho jsem za posledních 90 dní přeskočil (`PARTNER_SKIP_DAYS`).
- **Okruh** (`PARTNER_RADII_KM`): 10, 25, nebo 50 km od středu mé domovské lokality, výchozí je 10. Databáze filtruje obdélník, `rankPartners` pak řeže podle **pásma** vzdálenosti (`distanceBand`, haversine z `shared/geo/distance.ts`), ne podle přesné vzdálenosti. Hranice okruhu tak nic neprozradí jemněji než pásmo na kartě.
- **Já sám:** balíček vidím jen s dokončeným onboardingem, domovskou lokalitou a zájmy (`missing`: `onboarding`, `locality`, `interests`). Když mám „Ukazovat mě v Najdi parťáka“ vypnuté, nevidím nikoho ani já (`hidden`, vzájemnost jako Bumble Snooze).
- **Pořadí** (`comparePartners`): nejdřív ti, kdo mi už poslali žádost (první swipy tak často končí shodou), pak víc společných zájmů, pak bližší pásmo vzdálenosti a nakonec `id`, aby se pořadí nemíchalo.
- **Karta** (`PartnerSuggestion`): jen to, co ukazuje i veřejný profil (#179), tedy jméno a zájmy rozdělené na společné („Oba vás baví“) a ostatní. Dál `hasRequestedMe` („Posílá ti žádost“) a vzdálenost v **pásmu** (`distanceBand`: do 2 km, asi 5 / 10 / 25 km, do 50 km), zaokrouhlenou nahoru. Měří se mezi středy domovských lokalit, ne mezi místy, kde lidé bydlí. Nikdy e-mail, název lokality, souřadnice, fotka, „Kam jde“ ani společné proběhlé akce (o těch rozhodne PO).

## Stránkování

Balíček se při každém dotazu seřadí celý, všichni v obdélníku okruhu se společným zájmem. Omezení počtu před seřazením by vyřadilo i lidi, které pořadí dává dopředu, a stránkování by je pak už neukázalo. Vrací stránky po 20 (`PARTNER_PAGE_SIZE`) a `nextCursor`. Kurzor je místo poslední karty v pořadí, ne offset. Lidé, které mezitím přeskočím nebo přidám, z balíčku vypadnou, a offset by pak přeskočil stejný počet jiných. Kurzor obsahuje jen klíče pořadí, které jsou vidět i na kartě (žádost, počet společných zájmů, pásmo, id), takže nic neprozradí. Cizí nebo poškozený kurzor vrátí `400 INVALID_CURSOR`.

## API

Uživatel je vždy ze session, `:userId` je ten druhý. Všechny endpointy včetně čtení chtějí `VerifiedUserGuard`: balíček ukazuje jen ověřené lidi a zablokovaný účet nevidí nikoho.

- `GET /api/partners/suggestions?radiusKm=10&cursor=…` vrací `{ items, nextCursor, radiusKm, missing, hidden, limit }`, kde `limit` je `{ left, perDay, resetsAt, plan }` (#473, friendship README › Denní limit). Každá karta má `mutualFriendsCount`: kolik společných přátel, `null` pod 2, nikdy jména (friendship README › Společní přátelé). Podle počtu se neřadí, kurzor by ho musel nést. `missing` říká, co chybí (`onboarding`, `locality`, `interests`). `hidden` je vypnuté „Ukazovat mě“. Dokud platí jedno nebo druhé, je balíček prázdný.
- `POST /api/partners/:userId/request` je „Přidat“, tedy `FriendshipService.request` (#307) včetně upozornění a e-mailu (#86) a jeho denního limitu (viz [friendship README](../friendship/README.md) › Denní limit, `429 FRIEND_REQUEST_DAILY_LIMIT` stejně jako na `POST /api/friends/:userId`). Odpoví `{ state, limit }`, kde `state: friends` znamená „Je to shoda!“. Chyby friendship modulu (`SELF`, `USER_NOT_FOUND`, `ALREADY_*`, limit) projdou beze změny.
- `POST /api/partners/:userId/skip` je „Teď ne“. Uloží `PartnerSkip` (jeden řádek na směr dvojice, opakované přeskočení posune `createdAt`), odpoví `204`. Druhý se o přeskočení nikdy nedozví.
- `DELETE /api/partners/:userId/skip` je „Vrátit“ a přeskočení smaže, `204` i tehdy, když nebylo co mazat. Aplikace vrací jen poslední „Teď ne“. „Přidat“ se nevrací: žádost už odešla s upozorněním a ruší se na profilu („Zrušit žádost“).

## Proč takhle

- Tlačítka i swipe: WCAG 2.5.1 a 2.5.7 chtějí ke každému gestu ovládání jedním ukazatelem.
- Pásma místo km: útoky na dating aplikace přes vzdálenost (USENIX Security '24, „Swipe Left for Identity Theft“). Tinder ze stejného důvodu zaokrouhluje a přichytává polohu do mřížky.
- 90 dní pro „Teď ne“: Strava schová návrh na 28 dní, a my přidáváme lidi pomaleji.
- Denní limit: každé „Přidat“ znamená upozornění a e-mail cizímu člověku a friendship modul ochranu proti opakovaným žádostem nemá. Hinge má zdarma 8 lajků denně.

## Poloha a zbytkové riziko

Vzdálenost se počítá mezi středy domovských lokalit (města nebo městské části) a ukazuje se jen v pásmech. Okruh se řeže podle pásma. Domovská lokalita jde změnit nejvýš třikrát za pražský den (`HOME_LOCALITY_CHANGE_LIMIT` v modulu `profile`), takže přesouvat domov a sledovat, jak se mění pásmo člověka, jde jen pomalu. Kdo má víc účtů v různých obcích, může z pásem pořád odhadnout, ve které obci (ne kde) člověk bydlí. Víc než obec se zjistit nedá, protože jemnější poloha v databázi není. Kdo to nechce riskovat, vypne „Ukazovat mě v Najdi parťáka“.

## Na později

- **C3:** kandidáti se načítají a řadí při každé stránce znovu. Pro malé okruhy to stačí. Při tisících lidí v okruhu by bylo lepší řadit v SQL, nebo kandidáty zastropovat až po řazení.
- **C4:** když se klíč pořadí člověka mezi stránkami změní (přidá si společný zájem, pošle mi žádost), může se posunout před kurzor a v tomhle průchodu se neukáže. Ukáže se při dalším otevření.
- **U5:** chipy na kartě by šlo skládat z `ActivityTag` (dnes vlastní styl kvůli ikoně a tichým chipům).
- **Otázky pro PO:** společné proběhlé akce v řazení a na kartě, vzájemná viditelnost (skrytý nevidí nikoho), lime razítka, limit 20 a 90 dní pro „Teď ne“.
