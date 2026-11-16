# Upozornění k akcím (#177), zprávy organizátora (#176) a oznámení skupin (#194)

E-maily o tom, co se stalo s akcí nebo s něčí účastí (B-040, B-041), zprávy organizátora účastníkům (#176) a oznámení správce členům skupiny (#194). Služba, která změnu zapsala, po zápisu zavolá jedinou metodu:

```ts
this.notifications.notify({ type: 'event-cancelled', eventId });
```

`notify` se vrátí hned a nikdy nevyhodí chybu. Odesílání se naplánuje přes `setImmediate` a nečeká na něj doménová operace. Tím se nezaručuje pořadí vůči dokončení HTTP odpovědi. E-mail, který se nepodaří poslat, se zapíše do logu (id uživatele a druh chyby, nikdy adresa) a ostatní příjemci ho dostanou normálně. Chyba odeslání tedy nerozbije akci uživatele.

## Kdo co dostane

| Druh (`type`)        | Příjemci                                                  | Vyvolá ho                                                          |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| `request-decided`    | žadatelé, kterým organizátor žádost schválil/zamítl       | `EventsService.decideRequests`                                     |
| `event-changed`      | schválení a čekající účastníci, ne organizátor            | `EventsService.updateEvent` (jen když se změnil termín nebo místo) |
| `event-cancelled`    | schválení a čekající účastníci, ne organizátor; s důvodem | `EventsService.cancelEvent`                                        |
| `request-received`   | organizátor; se zprávou žadatele (#175)                   | `EventsService.join` (žádost čeká na schválení)                    |
| `participant-left`   | organizátor                                               | `EventsService.leave` (odhlásil se schválený účastník)             |
| `group-announcement` | všichni aktivní členové skupiny, správci i autor          | `GroupsService.sendAnnouncement` (#194)                            |
| `event-message`      | schválení účastníci, ne organizátor                       | `EventsService.sendMessage` (#176)                                 |

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

Přes sdílený `EmailService` jako ověřovací e-maily: Resend nebo SMTP, když jsou nastavené klíče (#165), jinak konzole (v produkci se do logu píše jen příjemce a předmět). Simulovaná schránka (#58) drží jen ověřovací e-mail, upozornění v ní nejsou. Centrum upozornění v aplikaci (zvonek) zatím není; přibude s #86 (B-044) ze stejných událostí jako e-maily.

## Omezení

Odesílání běží v paměti procesu: e-mail, který čeká při pádu nebo restartu backendu, se nedoručí a nezkouší se znovu. Fronta s opakováním a plánované e-maily (připomínka, chybí lidé) patří do #65 (B-043).
