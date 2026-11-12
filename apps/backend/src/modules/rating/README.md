# Hodnocení (B-060)

## Účastník hodnotí akci a organizátora (#66)

- `GET /api/events/:id/rating`: moje hodnocení akce (nebo `null`), do kdy jde dát nebo změnit (`ratableUntil`) a proč teď nejde (`refusal`, jinak `null`).
- `PUT /api/events/:id/rating`: `{ eventStars, organizerStars, comment? }`. První volání hodnocení dá, další ho celé nahradí, i komentář (prázdný = žádný). Jedno hodnocení na uživatele a akci.

Obě vyžadují session, `PUT` i ověřený e-mail (`VerifiedUserGuard`). Hodnotit smí jen ten, kdo byl na akci `approved`, ne organizátor; členství ve skupině akce už podmínkou není (bývalý člen ohodnotí akci jen pro členy, na které byl). Neznámá, skrytá a smazaná akce je 404, kdo hodnotit nesmí, dostane 403 (`OWN_EVENT`, `NOT_PARTICIPANT`), stav akce nebo hodnocení je 409 (`EVENT_NOT_PUBLISHED` u zrušené akce, `EVENT_NOT_ENDED`, `RATING_WINDOW_CLOSED`, `RATING_DELETED`). Pravidla jsou v čisté funkci `decideEventRating` (`domain/event-rating.ts`) a zápis je pod zámkem řádku akce jako přihláška.

Lhůta je 14 dní od konce akce (bez konce od začátku), poslední okamžik ještě platí: `domain/rating-window.ts`, stejná pro hodnocení účastníka (`decideParticipantRating`). U akce skupiny se hvězdičky organizátora počítají ke skupině (`rating-summary.ts`).

Organizátor hodnotí účastníky a frontend (`/akce/:id/hodnoceni`) přijdou v dalších PR k #66.
