# Upozornění k akcím (#177) a oznámení skupin (#194)

E-maily o tom, co se stalo s akcí nebo s něčí účastí (B-040, B-041), a oznámení správce členům skupiny (#194). Služba, která změnu zapsala, po zápisu zavolá jedinou metodu:

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
| `group-announcement` | aktivní členové skupiny včetně správců, ne autor oznámení | `GroupsService.sendAnnouncement` (#194)                            |

Oznámení skupiny není o akci: e-mail má předmět „{skupina}: {předmět}“, nadpis a text jsou slova správce (odstavce podle prázdných řádků) a tlačítko „Stránka skupiny“ (Figma E-01, typ 8).

Nikdo nedostane e-mail o tom, co udělal sám. Zablokovaní (`blockedAt`) a smazaní (`deletedAt`) uživatelé e-mail nedostanou. Organizátor se o stažení čekající žádosti nedozví: žádost mu jen zmizí ze seznamu.

## Jak přidat další druh (např. zprávu organizátora, #176)

1. Přidej variantu do `Notification` v `domain/notification.ts`.
2. V `NotificationService.audienceOf` řekni, kdo ji dostane.
3. V `domain/messages.ts` (`composeMessage`) řekni, co se v e-mailu píše. Šablona `EventNotificationEmail` (`core/email/templates/`) se pro všechny druhy sdílí, mění se jen text.

Texty jsou česky a tykáním; žádný text nepředpokládá pohlaví organizátora („žádost byla schválena“, ne „organizátor schválil“).

## Kam e-maily jdou

Přes sdílený `EmailService` jako ověřovací e-maily: Resend nebo SMTP, když jsou nastavené klíče (#165), jinak konzole (v produkci se do logu píše jen příjemce a předmět). Simulovaná schránka (#58) drží jen ověřovací e-mail, upozornění v ní nejsou.

## Omezení

Odesílání běží v paměti procesu: e-mail, který čeká při pádu nebo restartu backendu, se nedoručí a nezkouší se znovu. Fronta s opakováním a plánované e-maily (připomínka, chybí lidé) patří do #65 (B-043).
