# HobbyHub – upozornění v aplikaci (návrh na refinement 16. 11. 2026)

**Issue:** #86 (F-40, B-044) · **Navazuje na:** #177 (e-maily k účasti a akci), #307 (přátelé) · **Stav:** návrh týmu; na refinementu 16. 11. se neprobíral, otázky rozhodne tým, případně je písemně položí PO

Planning sprintu 4 (`zapis-planning-sprint4.md`): notifikační centrum v aplikaci i e-maily, zpráva v centru je krátká („Na tvou akci se přihlásil…“) a vede na detail. Tým měl na refinement připravit seznam událostí a jejich texty. Tady je.

## Co z refinementu 16. 11. se upozornění týká

Seznam událostí a texty se na refinementu neschvalovaly. Otázky Q1–Q5 níže proto rozhodne tým, nebo je písemně položí PO. Do té doby platí návrh týmu. Z refinementu se upozornění týká:

- **Přátelé** jsou v backlogu na další sprinty (PO). Řádky 13 a 14 proto do sprintu 4 nepatří a přibudou s přáteli (#307).
- **Jméno a přezdívka** (backlog): přezdívku uvidí všichni, celé jméno jen organizátor akce, správce skupiny a přátelé. Až to přijde, `{jméno}` v upozornění bude to, co smí vidět adresát. Upozornění dnes chodí jen organizátorům, správcům a dotčeným uživatelům, takže se texty měnit nebudou, jen zdroj jména.
- **Výzva k hodnocení** po akci přijde e-mailem (#65), viz Q4.
- **Skupiny** dostanou pozvánku odkazem, předání role správce a vyhození člena (backlog). Upozornění k nim jsou mimo #86 a přibudou s nimi.

## Jak upozornění funguje

- **Jedna událost, dva kanály.** Upozornění v centru i e-mail vznikají ze stejné události, ze které dnes posílá e-maily #177 (`NotificationService.notify`). Text v centru odpovídá prvnímu řádku e-mailu (náhledu), aby si uživatel obojí spojil.
- **Krátká zpráva:** kdo, co a u které akce nebo skupiny. Čas („před 5 min“, „včera“) ukazuje centrum vedle zprávy, v textu není.
- **Klepnutí vede na detail** (akce, správa akce, skupina, profil) a upozornění označí jako přečtené. „Označit vše jako přečtené“ přečte všechna najednou. Samotné otevření centra nic neoznačí.
- **Autor události upozornění nedostane.** Organizátor, který akci zrušil, se o zrušení nedozví, správce, který napsal oznámení, ho nedostane sám sobě.
- **Texty se neliší podle pohlaví** (stejně jako e-maily v #177): „už na akci nejde“, ne „se odhlásil/a“.
- **Vidí je jen adresát.** API vrací jen upozornění přihlášeného uživatele, cizí upozornění nejde přečíst ani označit (backend, testy).

## Seznam událostí a texty

`{jméno}` = zobrazované jméno uživatele, `„{akce}“` a `„{skupina}“` = název v uvozovkách. Sloupec **E-mail** říká, jestli e-mail ke stejné události už chodí.

### Organizátor akce

| #   | Událost                                    | Text v centru                              | Proklik     | E-mail                     |
| --- | ------------------------------------------ | ------------------------------------------ | ----------- | -------------------------- |
| 1   | Nová žádost o účast (akce se schvalováním) | `{jméno} se chce zúčastnit akce „{akce}“.` | správa akce | ano, „Nová žádost o účast“ |
| 2   | Nová přihláška (akce bez schvalování)      | `{jméno} jde na akci „{akce}“.` (Q1)       | správa akce | ne, viz Q1                 |
| 3   | Účastník se odhlásil                       | `{jméno} už na akci „{akce}“ nejde.`       | správa akce | ano, „Odhlášení z akce“    |

### Účastník akce (přihlášený nebo s žádostí)

| #   | Událost                       | Text v centru                                                                             | Proklik     | E-mail                       |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------- | ----------- | ---------------------------- |
| 4   | Žádost schválena              | `Tvoje žádost o účast na akci „{akce}“ byla schválena.`                                   | detail akce | ano, „Máš místo“             |
| 5   | Žádost zamítnuta              | `Tvoje žádost o účast na akci „{akce}“ nebyla přijata.`                                   | detail akce | ano, „Žádost nebyla přijata“ |
| 6   | Změna termínu nebo místa      | `U akce „{akce}“ se změnil termín.` / `…se změnilo místo.` / `…se změnil termín i místo.` | detail akce | ano, „Akce se změnila“       |
| 7   | Zrušení akce                  | `Akce „{akce}“ byla zrušena.`                                                             | detail akce | ano, „Akce byla zrušena“     |
| 8   | Zpráva od organizátora (#176) | `Nová zpráva k akci „{akce}“: {předmět}`                                                  | detail akce | ano, text organizátora       |

### Skupiny

| #   | Událost                              | Komu            | Text v centru                                                                      | Proklik         | E-mail            |
| --- | ------------------------------------ | --------------- | ---------------------------------------------------------------------------------- | --------------- | ----------------- |
| 9   | Žádost o vstup do uzavřené skupiny   | správci skupiny | `{jméno} chce do skupiny „{skupina}“.`                                             | správa skupiny  | **nový**          |
| 10  | Žádost o vstup schválena / zamítnuta | žadatel         | `Tvoje žádost o vstup do skupiny „{skupina}“ byla schválena.` / `…nebyla přijata.` | stránka skupiny | **nový**          |
| 11  | Nová akce skupiny                    | aktivní členové | `Ve skupině „{skupina}“ je nová akce „{akce}“.`                                    | detail akce     | **nový** (Q2)     |
| 12  | Oznámení správce (#194)              | aktivní členové | `Nové oznámení ve skupině „{skupina}“: {předmět}`                                  | stránka skupiny | ano, text správce |

Řádek 10 v zadání #86 není, doplňujeme ho jako protějšek řádků 4 a 5: kdo o vstup požádal, má se dozvědět, jak to dopadlo.

### Přátelé (až s #307, další sprint)

| #   | Událost             | Komu    | Text v centru                            | Proklik              | E-mail   |
| --- | ------------------- | ------- | ---------------------------------------- | -------------------- | -------- |
| 13  | Žádost o přátelství | adresát | `{jméno} ti posílá žádost o přátelství.` | žádosti o přátelství | **nový** |
| 14  | Žádost přijata      | žadatel | `{jméno} a ty jste teď přátelé.`         | profil {jméno}       | **nový** |

Zamítnutou žádost o přátelství neoznamujeme, stejně jako to dělají jiné sociální sítě.

### Co do centra nedáváme

- **Plánované e-maily** (připomínka den před akcí, „akci chybí lidé“, výzva k hodnocení #65): zůstávají jen e-mailem. Do centra by přibyly nejdřív s #65, pokud o to PO stojí (Q4).
- **Odebrání účastníka organizátorem** (`removed`): dnes nechodí ani e-mail, nechává se mimo rozsah #86.
- Mimo rozsah podle zadání: push notifikace, nastavení, která upozornění chci, upozornění na akce v okolí (#74).

## Chování centra

- **Zvonek** v hlavičce na desktopu i na mobilu, s počtem nepřečtených, nad 9 ukazuje „9+“. Bez nepřečtených je zvonek bez čísla.
- **Desktop:** klepnutí otevře panel pod zvonkem. **Mobil:** samostatná stránka `/upozorneni` se zpětnou šipkou.
- **Seznam** od nejnovějších, posledních 50 upozornění. Nepřečtená jsou odlišená tečkou a tučným textem (barva sama nestačí, DESIGN.md). Prázdný stav: „Zatím tu nic není. Až se u tvých akcí nebo skupin něco stane, dáme ti vědět.“
- **Obnovení:** počet nepřečtených se načte při otevření stránky, při návratu do okna a jednou za minutu. Živé spojení (WebSocket) v MVP neděláme.
- **Proklik na smazaný nebo skrytý cíl** (akce skrytá superadminem, deaktivovaná skupina) vede na detail, který ukáže svou obvyklou chybovou stránku. Upozornění samo nezmizí.

## Datový model

Podle návrhu v `datovy-model.md` › Návrh pro sprint 4, doplněný o čas vzniku a indexy:

| Sloupec      | Typ                        | Poznámka                                                              |
| ------------ | -------------------------- | --------------------------------------------------------------------- |
| `id`         | string                     |                                                                       |
| `userId`     | FK → `User`                | příjemce; smazáním uživatele se smažou i jeho upozornění              |
| `type`       | `notification_type`        | druh události z tabulek výše                                          |
| `targetType` | `event` / `group` / `user` | kam vede proklik                                                      |
| `targetId`   | string                     | bez cizího klíče, stejně jako `Report`; cíl ověří detail při prokliku |
| `text`       | string                     | hotová krátká zpráva, uložená při vzniku (Q3)                         |
| `createdAt`  | datetime                   | řazení a „před 5 min“                                                 |
| `readAt`     | datetime, nullable         | nepřečtené = `null`                                                   |

Indexy `(userId, createdAt)` pro seznam a `(userId, readAt)` pro počet nepřečtených.

## Wireframy

Wireframy zvonek ani centrum nemají: stránka C ve Figmě uvádí, že „zvonek… přijde po schválení MVP“, a komponenty `Header/Mobile` a `Header/Desktop` ho neobsahují. Návrh proto popisuje chování slovy. Zbývá rozhodnout, jestli stačí tento popis a design podle DESIGN.md, nebo se wireframe zvonku a centra nejdřív doplní do Figmy (Q5).

## Otevřené otázky (tým, případně PO)

- **Q1 Přihláška na akci bez schvalování:** má organizátor dostat upozornění na každou přihlášku? Návrh týmu: ano v centru, e-mail ne, aby organizátor oblíbené akce nedostával desítky e-mailů. Zadání #86 přitom říká, že ke stejným událostem chodí e-mail.
- **Q2 Nová akce skupiny e-mailem:** upozornění v centru ano. Posílat i e-mail všem členům? Návrh týmu: ano, je to hlavní důvod, proč člověk ve skupině je.
- **Q3 Text uložený při vzniku:** když organizátor akci později přejmenuje, staré upozornění ukáže původní název. Návrh týmu: nevadí, upozornění je záznam o tom, co se stalo, a proklik vede na aktuální detail.
- **Q4 Plánované e-maily v centru:** připomínka den před akcí a výzva k hodnocení jen e-mailem (návrh), nebo i v centru?
- **Q5 Wireframe:** stačí popis výše, nebo doplnit zvonek a centrum do Figmy před implementací UI?

## Postup

- **Teď (nezávisí na otázkách):** tabulka `Notification` s migrací, API (seznam, počet nepřečtených, označit přečtené, označit vše), zápis upozornění z událostí, které už posílají e-mail (řádky 1, 3–8, 12), zvonek a centrum.
- **Po rozhodnutí Q1 a Q2:** nové události (řádek 2 a skupiny v řádcích 9–11) včetně e-mailů.
- **S přáteli (#307, další sprint):** řádky 13 a 14.
