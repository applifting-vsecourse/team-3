# Hodnocení (B-060)

## Účastník hodnotí akci a organizátora (#66)

- `GET /api/events/:id/rating`: moje hodnocení akce (nebo `null`), do kdy jde dát nebo změnit (`ratableUntil`) a proč teď nejde (`refusal`, jinak `null`).
- Obě odpovědi nesou i `event`: to, co stránka hodnocení ukazuje z akce (jako karta akce: název, termín, místo, aktivita, organizátor, skupina, kolik lidí šlo). Stránka tak nepotřebuje detail akce, který bývalý člen skupiny u akce jen pro členy už nedostane (#66). Čte se týmž čtením, ze kterého se rozhoduje, u `PUT` tedy pod zámkem.
- `PUT /api/events/:id/rating`: `{ eventStars, organizerStars, comment? }`. První volání hodnocení dá, další ho celé nahradí, i komentář (prázdný = žádný). Jedno hodnocení na uživatele a akci.

Obě vyžadují session, `PUT` i ověřený e-mail (`VerifiedUserGuard`). Hodnotit smí jen ten, kdo byl na akci `approved`, ne organizátor – ten, kdo akci založil, i u akce skupiny; ostatní správci skupiny, kteří na akci byli, hodnotí jako každý účastník (#313); členství ve skupině akce už podmínkou není (bývalý člen ohodnotí akci jen pro členy, na které byl). Neznámá, skrytá a smazaná akce je 404, kdo hodnotit nesmí, dostane 403 (`OWN_EVENT`, `NOT_PARTICIPANT`), stav akce nebo hodnocení je 409. Pravidla jsou v čisté funkci `decideEventRating` (`domain/event-rating.ts`) a kontroluje je v tomto pořadí – první, která neprojde, je odpověď:

1. `OWN_EVENT` – organizátor (ten, kdo akci založil);
2. `NOT_PARTICIPANT` – kdo na akci nebyl schválený;
3. `RATING_DELETED` – hodnocení smazal superadmin. Je **před** stavem akce (#313): smazané hodnocení zůstane smazané, i když je akce mezitím po lhůtě. Dřív (PR 1 před #313) dostala zrušená akce `EVENT_NOT_PUBLISHED` i tehdy; u zrušené akce ale hodnocení vzniknout nemohlo, takže se to v praxi neliší;
4. `eventNotRatable` (níže): `EVENT_NOT_PUBLISHED` (zrušená), `EVENT_NOT_ENDED`, `EVENT_NOT_HELD`, `RATING_WINDOW_CLOSED`. Zápis je pod zámkem řádku akce jako přihláška a o všem – jestli akce existuje, odmítnutí i `ratableUntil` – rozhoduje jedno čtení pod zámkem.

**Jestli akce jde hodnotit** (`eventNotRatable` v `domain/participant-rating.ts`, stejné pro hodnocení akce i účastníků), v tomto pořadí:

1. `EVENT_NOT_PUBLISHED` – zrušená (skrytá a smazaná je už 404);
2. `EVENT_NOT_ENDED` – ještě neskončila;
3. `EVENT_NOT_HELD` – nesešlo se minimum, akce se nekonala (detail akce říká „Akce se nekonala“, #314). Rozhoduje počet schválených účastí při hodnocení proti `minParticipants`;
4. `RATING_WINDOW_CLOSED` – po lhůtě.

Lhůta je 14 kalendářních dní v pražském čase (review #313), ne 14 × 24 h: hodnotit jde celý 14. den po dni, kdy akce skončila (bez konce začala), do 23:59:59.999 v Praze, takže změna času nic neposune; `ratableUntil` je ten poslední okamžik. Konec přesně o pražské půlnoci patří ke dni před ní (akce 19:00–24:00 skončila ten večer, ne další den; `pragueEndDay`, #314). Dny počítá `prague-day.ts` (`startOfPragueDay(den, dnů_později)`), `RATING_WINDOW_DAYS` v `domain/rating-window.ts`; hlášky i popisy API berou číslo odtud. U akce skupiny se hvězdičky organizátora počítají ke skupině (`rating-summary.ts`).

## Organizátor hodnotí účastníky (#66)

- `GET /api/events/:id/participant-ratings`: schválení účastníci v pořadí, v jakém dostali místo (D-03), bez organizátora samotného, každý se svým hodnocením (nebo `null`) a `ratingDeleted`, když ho smazal superadmin; k tomu `ratableUntil` a `refusal` (proč teď nejde hodnotit nikoho).
- `PUT /api/events/:id/participant-ratings`: `{ ratings: [{ participantId, stars, comment? }] }`. Jeden účastník, nebo všichni najednou s tím, co frontend vyplnil přes „Všem stejně“ (Figma D-05). Každý dostane vlastní hodnocení, které nahradí předchozí i s komentářem; kdo v seznamu není, se nemění. Výchozí hodnota pro akci se neukládá. Všechno, nebo nic: když jedno hodnocení neprojde, neuloží se žádné; chyba u konkrétního účastníka nese jeho `participantId`. Vrací stejný přehled jako `GET`.

Pravidla jsou v `decideParticipantRatings` (`domain/participant-rating.ts`) pro celý seznam najednou, v tomto pořadí – první, která neprojde, je odpověď, a nezáleží na pořadí účastníků v seznamu (#314):

1. `NOT_ORGANIZER` (403) – hodnotí jen ten, kdo akci založil, i u akce skupiny, ne ostatní správci skupiny;
2. `eventNotRatable` jednou pro celý seznam (409 `EVENT_NOT_PUBLISHED`, `EVENT_NOT_ENDED`, `EVENT_NOT_HELD`, `RATING_WINDOW_CLOSED`) – bez `participantId`;
3. každý účastník (409 s `participantId` prvního, který neprojde): `SELF_RATING`, `NOT_APPROVED`, `RATING_DELETED`. Smazané hodnocení je tady až po stavu akce: po lhůtě je odpověď `RATING_WINDOW_CLOSED` pro všechny, ne jeden označený řádek.

`decideParticipantRating` je totéž pro jednoho účastníka.

`GET` nejdřív přečte akci (stav, organizátor, minimum, počet schválených) a teprve organizátorovi načte účastníky s hodnocením (#314). `PUT` je jedna transakce pod zámkem řádku akce: o existenci akce i odmítnutích rozhoduje čtení pod zámkem, hodnocení zapíše **jeden** příkaz `INSERT … ON CONFLICT … DO UPDATE` pro celý seznam (ne upsert po jednom – i 500 účastníků je jeden dotaz, zámek je krátký a transakce daleko od 5s timeoutu, #314) a odpověď je přehled přečtený v téže transakci po zápisu; mimo ni `PUT` nic nečte (#313).

Nový řádek dostane id z databáze (`gen_random_uuid()`), ne cuid jako zbytek schématu: `@default(cuid())` dělá klient Prismy, takže hromadný `INSERT` žádné nemá; sloupec je `text` a na tvaru id nic nezávisí (review #314).

**Pořadí `RATING_DELETED` se u obou hodnocení liší** (review #314): u hodnocení akce je před stavem akce (hodnotí vždy jeden člověk a dozví se, že jeho hodnocení smazal správce, i po lhůtě, #313), u hodnocení účastníků až po `eventNotRatable` (je to řádek seznamu; když akci hodnotit nejde, dostane celý seznam jeden důvod, po lhůtě `RATING_WINDOW_CLOSED`). Test v `participant-rating.spec.ts` staví obě pořadí vedle sebe.

Frontend: `/akce/:id/hodnoceni` podle role – účastník C-03, organizátor D-05 (stránka pozná organizátora podle 403 `OWN_EVENT` z `GET /rating`). Správa akce proběhlé akce ukáže „Jak akci hodnotili“ (`GET /ratings`) a zakladateli akce v lhůtě odkaz „Ohodnotit účastníky“.

## Organizátor vidí, jak akci hodnotili (#66)

- `GET /api/events/:id/ratings`: oba průměry (akce, organizátor – u akce skupiny jsou hvězdičky organizátora skupiny) vždy s počtem, bez hodnocení `null`, a každé hodnocení s autorem a komentářem, nejnovější první. Hodnocení smazaná superadminem se nevrací (B-063).

Vidí ho ten, kdo akci spravuje: organizátor, nebo u akce skupiny aktivní správce skupiny (rozhoduje stejná `canManageEvent` jako u správy akce, B-055); kdokoli jiný 403 `NOT_MANAGER`, neznámá, skrytá a smazaná akce 404. Frontend ho ukazuje ve správě proběhlé akce (B-060).
