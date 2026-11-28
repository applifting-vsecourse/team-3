# HobbyHub – upozornění v aplikaci (#86)

**Issue:** #86 (F-40, B-044) · **PR:** #398 · **Navazuje na:** #177 (e-maily k účasti a akci), #307 (přátelé) · **Stav:** postaveno podle rozhodnutí týmu (21. a 22. 11. 2026); seznam událostí a texty rozhodl tým, PO je nedoplňuje

Planning sprintu 4 (`zapis-planning-sprint4.md`): notifikační centrum v aplikaci i e-maily, zpráva v centru je krátká („Na tvou akci se přihlásil…“) a vede na detail. Refinement 16. 11. upozornění neprobíral, otázky proto rozhodl tým. Tento dokument popisuje, co je postavené.

## Jak upozornění funguje

- **Jedna událost, dva kanály.** Upozornění v centru i e-mail vznikají ze stejné události (`NotificationService.notify`). Text v centru je první řádek e-mailu (náhled), aby si uživatel obojí spojil.
- **Krátká zpráva:** kdo, co a u které akce nebo skupiny. Čas („teď“, „před 5 min“, „před 2 h“, „včera“, „pá 20. 11.“) ukazuje centrum pod zprávou.
- **Klepnutí vede na detail** (správa akce, detail akce, stránka nebo správa skupiny, žádosti o přátelství, profil) a upozornění označí jako přečtené, i když ho uživatel otevře v nové záložce. „Označit vše jako přečtené“ přečte všechna najednou. Samotné otevření centra nic neoznačí.
- **Upozornění na žádost o přátelství zmizí**, jakmile se žádost přijme, odmítne nebo zruší (PO 26. 11., #430): jinak by vedlo na prázdný seznam žádostí. Ostatní upozornění zůstávají, jen přečtená / nepřečtená.
- **Autor události upozornění nedostane.** Organizátor, který akci zrušil, se o zrušení nedozví; správce, který napsal oznámení, ho do centra nedostane (e-mail ano, jako dosud).
- **Texty se neliší podle pohlaví** (stejně jako e-maily v #177): „už na akci nejde“, ne „se odhlásil/a“.
- **Vidí je jen adresát.** API vrací jen upozornění přihlášeného uživatele, cizí upozornění nejde přečíst ani označit (404), nepřihlášený dostane 401.
- **Text se ukládá hotový.** Když organizátor akci později přejmenuje, starší upozornění ukáže původní název; proklik vede na aktuální detail.

## Seznam událostí a texty

`{jméno}` je zobrazované jméno uživatele, `„{akce}“` a `„{skupina}“` jsou názvy v uvozovkách.

| Událost                                  | Komu                         | Upozornění v centru                                                                       | Proklik              | Předmět e-mailu                                                  |
| ---------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------- |
| Žádost o účast na akci se schvalováním   | organizátor                  | `{jméno} se chce zúčastnit akce „{akce}“.`                                                | správa akce          | Nová žádost o účast: {akce}                                      |
| Přihláška na akci bez schvalování        | organizátor                  | `{jméno} jde na akci „{akce}“.`                                                           | správa akce          | Nová přihláška: {akce} – jen když si ho organizátor u akce zapne |
| Odhlášení z akce                         | organizátor                  | `{jméno} už na akci „{akce}“ nejde.`                                                      | správa akce          | Odhlášení z akce: {akce}                                         |
| Žádost o účast schválena                 | žadatel                      | `Tvoje žádost o účast na akci „{akce}“ byla schválena.`                                   | detail akce          | Máš místo na akci: {akce}                                        |
| Žádost o účast zamítnuta                 | žadatel                      | `Tvoje žádost o účast na akci „{akce}“ nebyla přijata.`                                   | detail akce          | Žádost o účast nebyla přijata: {akce}                            |
| Žádost nevyřízená do začátku akce (#465) | žadatel                      | `Akce „{akce}“ začala dřív, než organizátor tvou žádost vyřídil.`                         | detail akce          | Žádost o účast už vyřídit nejde: {akce}                          |
| Změna termínu nebo místa                 | přihlášení a čekající        | `U akce „{akce}“ se změnil termín.` / `…se změnilo místo.` / `…se změnil termín i místo.` | detail akce          | Změna u akce: {akce}                                             |
| Zrušení akce                             | přihlášení a čekající        | `Akce „{akce}“ byla zrušena.`                                                             | detail akce          | Akce zrušena: {akce}                                             |
| Zpráva organizátora (#176)               | přihlášení                   | `Nová zpráva k akci „{akce}“: {předmět}`                                                  | detail akce          | {akce}: {předmět}                                                |
| Žádost o vstup do uzavřené skupiny       | aktivní správci skupiny      | `{jméno} chce do skupiny „{skupina}“.`                                                    | správa skupiny       | Nová žádost o vstup: {skupina}                                   |
| Žádost o vstup schválena                 | žadatel                      | `Tvoje žádost o vstup do skupiny „{skupina}“ byla schválena.`                             | stránka skupiny      | Jsi ve skupině: {skupina}                                        |
| Žádost o vstup zamítnuta                 | žadatel                      | `Tvoje žádost o vstup do skupiny „{skupina}“ nebyla přijata.`                             | stránka skupiny      | Žádost o vstup nebyla přijata: {skupina}                         |
| Oznámení správce (#194)                  | aktivní členové kromě autora | `Nové oznámení ve skupině „{skupina}“: {předmět}`                                         | stránka skupiny      | {skupina}: {předmět}                                             |
| Žádost o přátelství (i opakovaná)        | ten, koho žádám              | `{jméno} ti posílá žádost o přátelství.`                                                  | žádosti o přátelství | Žádost o přátelství: {jméno}                                     |
| Přijetí přátelství                       | ten, kdo žádal               | `{jméno} a ty jste teď přátelé.`                                                          | profil {jméno}       | Jste přátelé: {jméno}                                            |
| Nové hodnocení akce (#432)               | organizátor                  | `Tvoje akce {akce} má nové hodnocení.`                                                    | správa akce          | – (jen v centru)                                                 |
| Nové hodnocení od organizátora (#432)    | hodnocený účastník           | `Máš nové hodnocení od organizátora akce {akce}.`                                         | profil               | – (jen v centru)                                                 |

Výsledek žádosti o vstup do skupiny v zadání #86 není, je to protějšek schválení a zamítnutí přihlášky na akci. Odmítnutí a odebrání z přátel zůstávají tichá (#307). U hodnocení (#432, platí po merge PR #433) přijde upozornění jen k prvnímu hodnocení, ne k jeho úpravě, a e-mail k němu nechodí.

**Mimo #86:** upozornění na novou akci skupiny (#362), na obdržené hodnocení řeší #432 (v tabulce výše). Plánované e-maily (výzva k hodnocení #65) chodí jen e-mailem, do centra nepatří. Odebrání účastníka organizátorem (`removed`) neoznamuje ani e-mail. Podle zadání mimo rozsah: push notifikace, obecné nastavení upozornění, akce v okolí (#74).

## Rozhodnutí týmu

- **E-mail ke každé přihlášce (21. a 22. 11.):** u akce bez schvalování dostane organizátor upozornění v centru vždy; e-mail ke každé přihlášce si zvolí ve formuláři akce při založení i v úpravě („Posílat mi e-mail ke každé přihlášce“, `Event.emailOnJoin`, výchozí vypnuto). Volbu vidí a mění jen organizátor, protože e-mail chodí jemu; spolusprávce skupiny ji ve formuláři nemá. Zadání #86 v „Mimo rozsah“ vylučuje nastavení upozornění; tohle je volba u jedné akce, aby organizátor oblíbené akce nedostával desítky e-mailů.
- **Nová akce skupiny (21. 11.):** řeší #362, ne #86.

## Chování centra (Figma C-07, C-07a, C-07b, C-07d)

- **Zvonek** v hlavičce přihlášeného uživatele, na desktopu před avatarem, na mobilu před akcí obrazovky. Počet nepřečtených v limetkovém odznaku, nad 9 „9+“, bez nepřečtených jen zvonek. Mobilní stránky s lištou Header/Sub (detail, správa, formuláře) hlavičku nemají, zvonek tam není.
- **Desktop:** zvonek otevře panel pod sebou (400 px). **Mobil:** zvonek vede na stránku `/upozorneni`.
- **Seznam** od nejnovějších, posledních 50 upozornění. Nepřečtená mají tečku a tučný text (barva sama nestačí, DESIGN.md). Prázdný stav: „Zatím tu nic není. Až se u tvých akcí, skupin nebo přátel něco stane, dáme ti vědět.“
- **Obnovení:** počet nepřečtených se načte při otevření stránky, při návratu do okna a jednou za minutu. Živé spojení (WebSocket) v MVP neděláme.
- **Proklik na smazaný nebo skrytý cíl** (akce skrytá superadminem, deaktivovaná skupina) vede na detail, který ukáže svou obvyklou chybovou stránku.

Design je ve Figmě HobbyHub-design: sekce „Upozornění (#86) – schváleno 22. 11.“ na stránce Účet, komponenty Zvonek a Upozornění/Řádek v Design systemu.

## Datový model

Tabulka `notification` (podrobně v [`datovy-model.md`](datovy-model.md) › Upozornění): příjemce `userId`, druh `type` (`notification_type`), hotová zpráva `text`, cíl prokliku `targetType` + `targetId` bez cizího klíče, `createdAt` a `readAt` (nepřečtené = `null`). Indexy `(userId, createdAt)` pro seznam a `(userId, readAt)` pro počet nepřečtených. API a pravidla v [`modules/notification/README.md`](../apps/backend/src/modules/notification/README.md).
