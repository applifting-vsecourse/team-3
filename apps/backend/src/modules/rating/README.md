# Hodnocení (B-060)

## Účastník hodnotí akci a organizátora (#66)

- `GET /api/events/:id/rating`: moje hodnocení akce (nebo `null`), do kdy jde dát nebo změnit (`ratableUntil`) a proč teď nejde (`refusal`, jinak `null`).
- `PUT /api/events/:id/rating`: `{ eventStars, organizerStars, comment? }`. První volání hodnocení dá, další ho celé nahradí, i komentář (prázdný = žádný). Jedno hodnocení na uživatele a akci.

Obě vyžadují session, `PUT` i ověřený e-mail (`VerifiedUserGuard`). Hodnotit smí jen ten, kdo byl na akci `approved`, ne organizátor – ten, kdo akci založil, i u akce skupiny; ostatní správci skupiny, kteří na akci byli, hodnotí jako každý účastník (#313); členství ve skupině akce už podmínkou není (bývalý člen ohodnotí akci jen pro členy, na které byl). Neznámá, skrytá a smazaná akce je 404, kdo hodnotit nesmí, dostane 403 (`OWN_EVENT`, `NOT_PARTICIPANT`), stav akce nebo hodnocení je 409 (`EVENT_NOT_PUBLISHED` u zrušené akce, `EVENT_NOT_ENDED`, `RATING_DELETED`, `RATING_WINDOW_CLOSED`); smazané hodnocení je `RATING_DELETED` i po lhůtě. Pravidla jsou v čisté funkci `decideEventRating` (`domain/event-rating.ts`). Zápis je pod zámkem řádku akce jako přihláška a o všem – jestli akce existuje, odmítnutí i `ratableUntil` – rozhoduje jedno čtení pod zámkem.

Lhůta je 14 kalendářních dní v pražském čase (review #313), ne 14 × 24 h: hodnotit jde celý 14. den po dni, kdy akce skončila (bez konce začala), do 23:59:59.999 v Praze, takže změna času nic neposune; `ratableUntil` je ten poslední okamžik. Dny počítá `prague-day.ts`, `RATING_WINDOW_DAYS` v `domain/rating-window.ts`; hlášky i popisy API berou číslo odtud, stejná pro hodnocení účastníka (`decideParticipantRating`). U akce skupiny se hvězdičky organizátora počítají ke skupině (`rating-summary.ts`).

## Organizátor hodnotí účastníky (#66)

- `GET /api/events/:id/participant-ratings`: schválení účastníci v pořadí, v jakém dostali místo (D-03), bez organizátora samotného, každý se svým hodnocením (nebo `null`) a `ratingDeleted`, když ho smazal superadmin; k tomu `ratableUntil` a `refusal` (proč teď nejde hodnotit nikoho).
- `PUT /api/events/:id/participant-ratings`: `{ ratings: [{ participantId, stars, comment? }] }`. Jeden účastník, nebo všichni najednou s tím, co frontend vyplnil přes „Všem stejně“ (Figma D-05). Každý dostane vlastní hodnocení, které nahradí předchozí i s komentářem; kdo v seznamu není, se nemění. Výchozí hodnota pro akci se neukládá. Všechno, nebo nic: když jedno hodnocení neprojde, neuloží se žádné; chyba u konkrétního účastníka nese jeho `participantId`. Vrací stejný přehled jako `GET`.

Hodnotí jen organizátor, který akci založil, i u akce skupiny, ne ostatní správci skupiny (403 `NOT_ORGANIZER`). Akce musí jít hodnotit (409 `EVENT_NOT_PUBLISHED`, `EVENT_NOT_ENDED`, `RATING_WINDOW_CLOSED`), u každého účastníka 409 `SELF_RATING`, `NOT_APPROVED` nebo `RATING_DELETED`. Pravidla jsou v `decideParticipantRating` (`NOT_ORGANIZER` jako první, smazané hodnocení před lhůtou) a zápis je jedna transakce pod zámkem řádku akce: o existenci akce i odmítnutích rozhoduje čtení pod zámkem a odpověď je přehled přečtený v téže transakci po zápisu, mimo ni `PUT` nic nečte (#313). To, jestli akce jde hodnotit (`eventNotRatable`), sdílí hodnocení akce i účastníků.

Frontend (`/akce/:id/hodnoceni`) přijde v dalších PR k #66.
