# Najdi parťáka (#84)

Balíček karet s lidmi z okolí, které baví to co mě. Na kartě jsou tlačítka „Teď ne“, „Vrátit“ a „Přidat“ (swipe je jen zkratka). Zadání: PO 16. 11. („10 lidí v dosahu s podobnými aktivitami, případně swipe“), brief v PR.

## Kdo je v balíčku

Pravidla jsou čisté funkce v [`domain/partner-suggestions.ts`](domain/partner-suggestions.ts) a každé má test.

- **Kdo se může ukázat** (`partnerCandidatesWhere`): ověřený e-mail, není zablokovaný ani smazaný, má dokončený onboarding a zapnuté „Ukazovat mě v Najdi parťáka“ (`User.partnerDiscoverable`, výchozí `true`, mění se na Můj profil). Má domovskou lokalitu v obdélníku okruhu a aspoň jeden zájem shodný se mnou. Nikdy já, přátelé ani nikdo, s kým mám řádek `Friendship` v jakémkoli stavu a směru. Výjimkou je jeho žádost, která ještě čeká na mě: „Přidat“ ji přijme, a to je shoda (vzájemný like jako Bumble nebo Tinder). Nikdo, koho jsem za posledních 90 dní přeskočil (`PARTNER_SKIP_DAYS`).
- **Okruh** (`PARTNER_RADII_KM`): 10, 25, nebo 50 km od středu mé domovské lokality, výchozí je 10. Přesná vzdálenost (haversine, `shared/geo/distance.ts`) se kontroluje v `rankPartners`, databáze filtruje jen obdélník.
- **Pořadí** (`comparePartners`): nejdřív ti, kdo mi už poslali žádost (první swipy tak často končí shodou), pak víc společných zájmů, pak bližší pásmo vzdálenosti a nakonec `id`, aby se pořadí nemíchalo.
- **Karta** (`PartnerSuggestion`): jen to, co ukazuje i veřejný profil (#179), tedy jméno a zájmy rozdělené na společné („Oba vás baví“) a ostatní. Dál `hasRequestedMe` („Posílá ti žádost“) a vzdálenost v **pásmu** (`distanceBand`: do 2 km, asi 5 / 10 / 25 km, do 50 km), zaokrouhlenou nahoru. Měří se mezi středy domovských lokalit, ne mezi místy, kde lidé bydlí. Nikdy e-mail, název lokality, souřadnice, fotka, „Kam jde“ ani společné proběhlé akce (o těch rozhodne PO).

## Stránkování

Balíček se při každém dotazu seřadí celý (nejvýš `PARTNER_CANDIDATE_LIMIT` lidí v obdélníku). Vrací stránky po 20 (`PARTNER_PAGE_SIZE`) a `nextCursor`. Kurzor je místo poslední karty v pořadí, ne offset. Lidé, které mezitím přeskočím nebo přidám, z balíčku vypadnou, a offset by pak přeskočil stejný počet jiných. Kurzor obsahuje jen klíče pořadí, které jsou vidět i na kartě (žádost, počet společných zájmů, pásmo, id), takže nic neprozradí. Cizí nebo poškozený kurzor vrátí `400 INVALID_CURSOR`.

## API

Jen pro přihlášené. Uživatel je vždy ze session, `:userId` je ten druhý. Zápisy chtějí `VerifiedUserGuard`.

- `GET /api/partners/suggestions?radiusKm=10&cursor=…` vrací `{ items, nextCursor, radiusKm, missing, requestsLeft }`. `missing` říká, co v profilu chybí (`locality`, `interests`), a dokud něco chybí, je balíček prázdný.
- `POST /api/partners/:userId/request` je „Přidat“, tedy `FriendshipService.request` (#307) včetně upozornění a e-mailu (#86). Odpoví `{ state, requestsLeft }`, kde `state: friends` znamená „Je to shoda!“. Nových žádostí je 20 denně od pražské půlnoci (`PARTNER_DAILY_REQUESTS`), počítají se všechny moje žádosti o přátelství od půlnoci, i ty z profilu. Pak `429 PARTNER_DAILY_LIMIT`. Přijmout cizí žádost jde vždy. Chyby friendship modulu (`SELF`, `USER_NOT_FOUND`, `ALREADY_*`) projdou beze změny.
- `POST /api/partners/:userId/skip` je „Teď ne“. Uloží `PartnerSkip` (jeden řádek na směr dvojice, opakované přeskočení posune `createdAt`), odpoví `204`. Druhý se o přeskočení nikdy nedozví.
- `DELETE /api/partners/:userId/skip` je „Vrátit“ a přeskočení smaže, `204` i tehdy, když nebylo co mazat. Aplikace vrací jen poslední „Teď ne“. „Přidat“ se nevrací: žádost už odešla s upozorněním a ruší se na profilu („Zrušit žádost“).

## Proč takhle

- Tlačítka i swipe: WCAG 2.5.1 a 2.5.7 chtějí ke každému gestu ovládání jedním ukazatelem.
- Pásma místo km: útoky na dating aplikace přes vzdálenost (USENIX Security '24, „Swipe Left for Identity Theft“). Tinder ze stejného důvodu zaokrouhluje a přichytává polohu do mřížky.
- 90 dní pro „Teď ne“: Strava schová návrh na 28 dní, a my přidáváme lidi pomaleji.
- Denní limit: každé „Přidat“ znamená upozornění a e-mail cizímu člověku a friendship modul ochranu proti opakovaným žádostem nemá. Hinge má zdarma 8 lajků denně.
