# Upozornění k akcím (#177), zprávy organizátora (#176) a oznámení skupin (#194)

E-maily o tom, co se stalo s akcí nebo s něčí účastí (B-040, B-041), zprávy organizátora účastníkům (#176) a oznámení správce členům skupiny (#194). Služba, která změnu zapsala, po zápisu zavolá jedinou metodu:

```ts
this.notifications.notify({ type: 'event-cancelled', eventId });
```

`notify` se vrátí hned a nikdy nevyhodí chybu. Odesílání se naplánuje přes `setImmediate` a nečeká na něj doménová operace. Tím se nezaručuje pořadí vůči dokončení HTTP odpovědi. E-mail, který se nepodaří poslat, se zapíše do logu (id uživatele a druh chyby, nikdy adresa) a ostatní příjemci ho dostanou normálně. Chyba odeslání tedy nerozbije akci uživatele.

## Kdo co dostane

| Druh (`type`)           | Příjemci                                                  | Vyvolá ho                                                          |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| `request-decided`       | žadatelé, kterým organizátor žádost schválil/zamítl       | `EventsService.decideRequests`                                     |
| `event-changed`         | schválení a čekající účastníci, ne organizátor            | `EventsService.updateEvent` (jen když se změnil termín nebo místo) |
| `event-cancelled`       | schválení a čekající účastníci, ne organizátor; s důvodem | `EventsService.cancelEvent`                                        |
| `request-received`      | organizátor; se zprávou žadatele (#175)                   | `EventsService.join` (žádost čeká na schválení)                    |
| `participant-joined` | organizátor: v centru vždy, e-mailem jen když si u akce zapnul `emailOnJoin` (při založení i v úpravě) | `EventsService.join` (místo hned, akce bez schvalování, #86) |
| `participant-left`      | organizátor                                               | `EventsService.leave` (odhlásil se schválený účastník)             |
| `group-announcement`    | všichni aktivní členové skupiny, správci i autor          | `GroupsService.sendAnnouncement` (#194)                            |
| `event-message`         | schválení účastníci, ne organizátor                       | `EventsService.sendMessage` (#176)                                 |
| `group-join-request`    | aktivní správci skupiny, ne žadatel; se zprávou žadatele  | `GroupsService.join` (žádost do uzavřené skupiny, #86)             |
| `group-request-decided` | žadatel, kterému správce žádost o vstup schválil/zamítl   | `GroupsService.approveRequest`, `rejectRequest` (#86)              |
| `friend-request`        | ten, koho žádám o přátelství (i při opakované žádosti)    | `FriendshipService.request` (#307, #86)                            |
| `friend-accepted`       | ten, kdo o přátelství požádal                             | `FriendshipService.request` (přijetí, #307, #86)                   |

Oznámení skupiny není o akci: e-mail má předmět „{skupina}: {předmět}“, nadpis a text jsou slova správce (odstavce podle prázdných řádků) a tlačítko „Stránka skupiny“ (Figma E-01, typ 8).

Zpráva organizátora (#176) je jako oznámení skupiny jeho vlastními slovy: předmět „{akce}: {předmět}“, nadpis a text jsou slova organizátora a tlačítko „Detail akce“ (Figma E-01, typ 7). Dostanou ji jen schválení účastníci; čekající, zamítnutí, odebraní a odhlášení ne.

Nikdo nedostane e-mail o tom, co udělal sám, s výjimkou oznámení skupiny: Figma D-08 slibuje e-mail všem aktivním členům a autor tak vidí, co členům přišlo. Zablokovaní (`blockedAt`) a smazaní (`deletedAt`) uživatelé e-mail nedostanou. Organizátor se o stažení čekající žádosti nedozví: žádost mu jen zmizí ze seznamu.

## Jak přidat další druh

1. Přidej variantu do `Notification` v `domain/notification.ts`.
2. V `NotificationService.audienceOf` řekni, kdo ji dostane.
3. V `domain/messages.ts` (`composeMessage`) řekni, co se v e-mailu píše. Šablona `EventNotificationEmail` (`core/email/templates/`) se pro všechny druhy sdílí, mění se jen text.

Druh s vlastním předmětem a textem od autora (zpráva organizátora `event-message`, oznámení skupiny `group-announcement`) nejde přes `composeMessage`: vyřaď ho z `EventNotification`, v `NotificationService.deliver` ho pošli do vlastní metody `prepare…` (najde záznam a příjemce v repozitáři) a e-mail mu poskládej vlastní funkcí v `domain/messages.ts` (`composeEventMessage`, `composeAnnouncement`).

Texty jsou česky a tykáním; žádný text nepředpokládá pohlaví organizátora („žádost byla schválena“, ne „organizátor schválil“).

## Kam e-maily jdou

Přes sdílený `EmailService` jako ověřovací e-maily: Resend nebo SMTP, když jsou nastavené klíče (#165), jinak konzole (v produkci se do logu píše jen příjemce a předmět). Simulovaná schránka (#58) drží jen ověřovací e-mail, upozornění v ní nejsou. Centrum upozornění v aplikaci (zvonek) popisuje sekce níže.

## Centrum upozornění v aplikaci (#86, B-044)

Každá událost výše zapíše před odesláním e-mailů i upozornění do centra (tabulka `notification`): stejným příjemcům, s jednou výjimkou: oznámení skupiny do centra nedostane jeho autor, pro něj to není novinka (e-mail dostane dál). Krátká zpráva je první řádek e-mailu (náhled), skládá ji `domain/in-app.ts`; proklik podle druhu určí `notificationPath` (správa akce pro organizátora, detail akce, stránka nebo správa skupiny, žádosti o přátelství, profil). Zpráva se ukládá hotová, pozdější přejmenování akce ji nezmění. Když se zápis do centra nepovede, zaloguje se a e-maily odejdou dál. Druhy, texty a otevřené otázky: [`docs/navrh-upozorneni.md`](../../../../../docs/navrh-upozorneni.md).

API (jen přihlášený, vždy jen vlastní upozornění: dotazy jsou omezené na uživatele ze session, cizí id vrátí 404 `NOTIFICATION_NOT_FOUND`, stejně jako neexistující):

| Endpoint                              | Co vrátí                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET /api/notifications`              | 50 nejnovějších (`id`, `type`, `text`, `path`, `createdAt`, `readAt`) a `unreadCount` všech nepřečtených |
| `GET /api/notifications/unread-count` | `{ count }` pro číslo u zvonku                                                                           |
| `POST /api/notifications/:id/read`    | 204; přečtené už jednou zůstane se svým časem                                                            |
| `POST /api/notifications/read-all`    | `{ marked }`, kolik jich bylo nepřečtených                                                               |

Nový druh do centra: přidej hodnotu do `notification_type` (migrace) a `InAppType`, text do `domain/in-app.ts` a cestu do `notificationPath`.

## Výzva k hodnocení po akci (#65, B-043)

`RatingInvitationService` otevírá novou denní dávku ve **21:00 v Europe/Prague**. Plánovač běží každých 15 minut a jednou po startu: mezilehlé běhy opakují neúspěšná odeslání a dohánějí výpadek, neposílají výzvy pro akce z další denní dávky. Akce končící po 21:00 a akce bez `endsAt` (skončí až koncem pražského dne) přijdou na řadu další večer. Letní a zimní čas se řídí pražským kalendářem, ne časovým pásmem serveru.

Používá stejné podmínky jako hodnocení (#66): publikovaná, skončená akce s naplněným minimem a otevřenou lhůtou 14 kalendářních dní. Zrušené, skryté a smazané akce výzvu nedostanou. Při nasazení migrace jednou uloží čas aktivace. Po startu nebo výpadku se zpracují jen akce skončené od aktivace a nejvýš před 48 hodinami. Lhůta pro samotné hodnocení zůstává 14 kalendářních dní; e-mail uvádí její přesný konec.

- Schválení účastníci dostanou E-01 typ 11 „Jak se povedla akce {akce}?“, odkaz `/akce/:id/hodnoceni`. Docházka ani současné členství ve skupině nejsou podmínkou. Výzva se přeskočí, pokud účastník už hodnotil, včetně hodnocení odstraněného moderací.
- Zakladatel akce (`organizerUserId`, také u akce skupiny) dostane E-01 typ 12 „Ohodnoť účastníky: {akce}“, odkaz `/akce/:id/hodnoceni-ucastniku`. Potřebuje alespoň jednoho schváleného účastníka kromě sebe, jehož hodnocení ještě neexistuje. Organizátor přihlášený na vlastní akci dostane jen tuto variantu.
- Zablokovaným a smazaným uživatelům se nepíše. Před každým odesláním se znovu načte stav akce, účast a aktuální adresa příjemce.

`NotificationLog` má jedinečný klíč `rating-invitation:<role>:<eventId>:<userId>`. `sentAt = null` znamená čekající odeslání; vyplní se až po úspěšném návratu transportu. Atomický podmíněný zápis přidělí práci jednomu běhu i při více instancích backendu. Rezervace atomicky spotřebuje jeden ze tří pokusů. Chyba transportu uvolní rezervaci pro další pokus, pokud limit ještě nebyl dosažen a nezastaví ostatní příjemce. Po pádu procesu rezervace vyprší za hodinu. Původní záznamy migrace zachová jako odeslané.

Transport a zápis do databáze nemají společnou transakci: pád po přijetí zprávy SMTP/Resend, ale před uložením `sentAt`, může po vypršení rezervace vést k duplicitě. Totéž platí při nejednoznačné chybě transportu nebo při odesílání delším než hodinu. Evidence brání opakování již potvrzených odeslání; neslibuje přesně jedno doručení do schránky. Logy obsahují pouze interní ID, ne e-mailové adresy ani chybové zprávy poskytovatele.

Testy pokrývají příjemce a výběr denní dávky s pevným časem, obě změny času, půlnoc a lhůtu hodnocení, zrušení během dávky, selhání transportu/databáze, souběh běhů a obnovu po restartu. Připomínky den před akcí a upozornění na chybějící lidi zůstávají mimo scope sprintu 4.

## Omezení okamžitých upozornění

Okamžitá upozornění přes `NotificationService.notify` běží v paměti procesu: e-mail, který čeká při pádu nebo restartu backendu, se nedoručí a nezkouší se znovu. Evidence a opakování popsané výše se týkají výzvy k hodnocení; nejsou obecnou frontou pro všechny e-maily.
