# HobbyHub – zápis z planningu sprintu 4

**Kdy:** 10. 11. 2026, 26 minut, online (standup s PO) · **Kdo:** Jan Černý (product owner), Martin Bartoň, Eliška Hřebíčková, Adéla Mitrová · **Sprint 4:** 10. 11. – 24. 11. 2026 · **Téma:** zpětná vazba ke sprintu 3 a planning sprintu 4

Zápis vychází z automatického přepisu nahrávky (neověřený poslechem), z poznámek týmu a ze seznamu, který PO poslal po standupu. Rozlišuje, odkud věc je: **PO** = řekl nebo odsouhlasil product owner, **tým** = doplnil tým po standupu (potvrdí PO na refinementu 16. 11.).

## Cíl sprintu 4

Dotáhnout, co je rozdělané ze sprintu 3, a přidat čtyři velké funkce (PO):

> **dodělávky ze sprintu 3** → **onboarding** po registraci → **hodnocení** → **notifikace** (centrum v aplikaci + e-maily) → **přátelé**.

Akce a skupiny mají fungovat „křížem krážem“: kdo si něco založí, může to s vlastním obsahem spravovat, zakládání, správa a schvalování členů fungují u akcí i u skupin stejně a všechno dává smysl uživateli, který aplikaci vidí poprvé (PO).

K tomu první nástřel **superadmina**: upraví nebo deaktivuje libovolnou akci; blokace uživatelů je volitelný bonus, další funkce přibývají postupně (PO).

## Zpětná vazba PO ke sprintu 3

- **Kvalita (PO):** celkově dobré, design hodně pomohl, ale zůstávají UX nedodělávky (text splývá s pozadím, něco ho překrývá, špatně čitelné texty). Máme roli QA, takové věci si máme odchytávat sami dřív, než je uvidí PO.
- **Tmavý režim (PO):** vynechat, nevypadá dobře a ladit dva režimy nemá smysl. Děláme jen světlý režim a v něm dořešit kontrast (některá písmena splývají s designem).
- **Prázdný výpis akcí (PO):** po registraci PO viděl „žádné akce“, protože aplikace odhadla lokalitu Police nad Metují (jeho poloha je jiná). „Filtr se mi sám nastavil, i když jsem ho nevybíral.“ Ověřit odhad lokality a předvyplněné filtry a místo prázdného výpisu ukázat nejbližší místo, kde se něco děje, aby první dojem nebyl „nic tu není“.
- **Mapa (PO):** při hodně oddálené mapě klepnutí na body nic nedělá, dokud uživatel mapu nepřiblíží. Promyslet výchozí přiblížení (např. rovnou na lokalitu) nebo chování shluků.
- **Filtr Obsazenost (PO):** rozdíl mezi „Volná místa“ a „Chybí lidé“ uživatel bez vysvětlení nepozná a hledajícího nezajímá, jestli je naplněné minimum. Filtr v této podobě nedává smysl, kriticky přehodnotit (Q9).
- **Formulář akce (PO):** není jasný rozdíl mezi lokalitou a adresou; vyjasnit ho, jsou to zřejmě dvě nezávislé hodnoty. Po umístění špendlíku se nepředvyplní adresa a naopak. Tým: PR #295 propojuje lokalitu, adresu a špendlík (lokalita se odvodí z místa akce a dá se upravit ručně); co lokalita a co adresa znamená, rozhodne PO (Q14).
- **Obrázek akce (PO):** uživatel si má moct dát vlastní obrázek, jinak se předvyplní obrázek aktivity. Tým: úprava vlastní fotky je v návrhu na tabuli; nahrává se soubor, ne URL (Q3).
- **Úprava a zrušení akce (PO):** správa akcí – úprava, zrušení a vlastní obrázky. Zrušení a zpráva účastníkům jsou v pořádku; že zrušení nejde vrátit, nevadí. Tým: úprava (#41) a zrušení (#52) jsou v Done a čekají na kontrolu PO.
- **Proběhlé a zrušené akce (PO):** mají být vidět i v souvislosti s hodnocením. Tým: #61 a #272 zatím řeší jen proběhlé, #272 doplníme o zrušené.
- **Moje sekce (PO):** v „Moje“ chce vidět akce i skupiny, ne jen akce.
- **Skupiny (PO):** ověřit, kde organizátor vidí zprávu od žadatele o vstup do skupiny a jestli se po schválení správně ukazuje propojení skupiny s akcemi.
- **Přihlášení e-mailem (PO):** při registraci e-mailem neprošlo ověření odkazem (tokenem) a ani po ověření se PO nepřihlásil e-mailem a heslem (přes Google ano). E-maily mu chodí do spamu. Tým: #236 (přihlášení jen s ověřeným e-mailem, PR #267) je na stagingu od 9. 11., ověříme, jestli chybu nezpůsobuje.
- **GitHub (PO):** PO má k projektu jen náhled, nemůže přesouvat karty na boardu. Potřebuje přístup do organizace.
- **Sprint Review (PO):** ukazovat funkce storytellingem na připravených use casech („uživatel založí akci, pak se stane…“) a na GitHubu ukázat hlavní funkce, jak jsme je nadefinovali a jak jsme je udělali.

## Scope sprintu 4

Nová issues ze sprintu 4 jsou založená (#296–#308) a v tabulce jsou uvedená čísly.

| Oblast                 | Co bereme                                                                                                                                                                                                                  | Zdroj   | Issue                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------- |
| Dodělávky ze sprintu 3 | Stories ze sprintu 3 v Done čekají na kontrolu PO, PO je ještě proklikává a případně založí další: úprava a zrušení akce, Google a e-maily na stagingu                                                                     | PO      | #41, #52, #165 (hotové)                  |
|                        | Otevřené bugy a drobnosti                                                                                                                                                                                                  | tým     | #191, #200, #266, #281, #288, #289, #291 |
|                        | Zbylé nálezy bezpečnostního auditu (nízká priorita)                                                                                                                                                                        | tým     | #226, #228, #230                         |
| Kvalita                | UX nedodělky odchytit dřív než PO: story před přesunem do Done projde QA, nálezy v designu (překryté a splývající texty) sbírat do jednoho bugu                                                                            | PO, tým | #298                                     |
| Onboarding             | Po prvním přihlášení (e-mailem po ověření, nebo přes Google) krokový průvodce: domovská lokalita, zájmy, případně další údaje; po dokončení se ukážou akce podle nastavení                                                 | PO      | #296 (B-013, Figma B-08)                 |
| Hodnocení              | Dotáhnout dávání hodnocení: účastník hodnotí akci a organizátora, organizátor hodnotí účastníka (datový model je hotový z #180); e-mail s výzvou k hodnocení                                                               | PO      | #66, #65                                 |
| Notifikace             | Notifikační centrum v aplikaci: krátká zpráva („Na tvou akci se přihlásil…“), proklik na detail                                                                                                                            | PO      | #86 (B-044)                              |
|                        | E-mailové notifikace (např. někdo se přihlásil na akci, akce byla zrušena); tým navrhne, které notifikace a jak je psát. Upozornění k účasti a akci už posílá #177                                                         | PO      | #177 (hotové), #65                       |
| Přátelé                | Rozlišit veřejný a osobní profil; na veřejném profilu „Přidat do přátel“, žádost přijde jako notifikace, sekce lidí, které znám; u přátel vidím, kam chodí                                                                 | PO      | #307 (B-017, navazuje na B-014)          |
| Akce dotáhnout         | Vlastní obrázek akce (jinak obrázek aktivity)                                                                                                                                                                              | PO      | #77                                      |
|                        | Vyjasnit, co znamená lokalita a co adresa (zřejmě dvě nezávislé hodnoty, Q14); špendlík předvyplní adresu a naopak                                                                                                         | PO      | #303 (souvisí s #200, PR #295)           |
|                        | Proběhlé a zrušené akce (souvisí s hodnocením); #272 doplnit o zrušené                                                                                                                                                     | PO      | #61, #272                                |
| Skupiny dotáhnout      | Zakládání, správa a schvalování členů fungují u akcí i skupin stejně; sekce „Moje“ ukazuje akce i skupiny; organizátor skupiny vidí zprávu od žadatele o vstup; po schválení se správně ukazuje propojení skupiny s akcemi | PO      | #304 (navazuje na #118)                  |
| Obsazenost             | Přehodnotit filtr Obsazenost z pohledu hledajícího                                                                                                                                                                         | PO      | #305 (Q9)                                |
| Světlý režim           | Tmavý režim vypnout (kód, testy; DESIGN.md a CLAUDE.md jsou upravené s tímto zápisem), ve světlém opravit texty, které splývají s pozadím                                                                                  | PO      | #297 (navazuje na #201)                  |
| První dojem            | Ověřit odhad lokality podle IP; filtr, který si uživatel sám nevybral, výpis nevyprázdní; při prázdném výpisu ukázat nejbližší akce                                                                                        | PO      | #299 (navazuje na #55)                   |
| Mapa                   | Výchozí přiblížení na lokalitu; klepnutí na body a shluky funguje i při oddálené mapě                                                                                                                                      | PO      | #306 (navazuje na #56)                   |
| Přihlášení e-mailem    | Ověření e-mailu odkazem (tokenem) neprojde                                                                                                                                                                                 | PO      | #300                                     |
|                        | Po ověření e-mailu nejde přihlášení e-mailem a heslem                                                                                                                                                                      | PO      | #301 (souvisí s #236)                    |
|                        | E-maily chodí do spamu: zkontrolovat SPF, DKIM a DMARC odesílatele                                                                                                                                                         | PO, tým | #302 (navazuje na #165)                  |
| Superadmin             | První nástřel role superadmina: upravit nebo deaktivovat jakoukoli akci (deaktivace = `status = hidden`, ne zrušení). Bonus: blokace uživatelů                                                                             | PO      | #308 (část B-063 bez B-062)              |

## Rozhodnutí

- **Tmavý režim (PO):** vynecháváme, aplikace má jen světlý režim. Mění pravidlo „Every screen must work in both modes“ v DESIGN.md.
- **Filtr Obsazenost (PO):** v současné podobě nedává hledajícímu smysl. Tým navrhne jednodušší řešení (odpověď na Q9); do schválení návrhu zůstává filtr beze změny.
- **Obrázek akce (PO):** organizátor k akci nahraje vlastní obrázek jako soubor (ne URL); bez něj se ukáže obrázek aktivity. Mění Q3 pro akce, fotka profilu a obrázek skupiny zatím zůstávají jako URL.
- **Zrušení akce (PO):** zrušená akce nejde vrátit, je to v pořádku (Q11).
- **Notifikace (PO):** centrum v aplikaci i e-maily, zpráva v centru je krátká a vede na detail. Mění „Mimo MVP: upozornění v aplikaci (zvonek)“ v BACKLOG.md.
- **Přátelé (PO):** nová sekce, aplikace má lidi i propojovat. Veřejný profil ukazuje méně, osobní profil a přátelé víc (navazuje na B-014).
- **Superadmin (PO):** začínáme už ve sprintu 4, funkce budou přibývat; blokace uživatelů je volitelný bonus. Tým: nástřel nečeká na frontu nahlášení (B-062, mimo scope); bere z ní jen `AdminGuard` a admin zasahuje přímo z detailu akce. Deaktivace není zrušení: akci skryje (`status = hidden`, zásah `hide_event`) a jde vrátit; zrušení posílá e-mail účastníkům a vrátit nejde.

## Otevřené otázky pro PO

- **Q14 Lokalita a adresa (tým):** co znamená lokalita a co adresa akce? PO je považuje za dvě nezávislé hodnoty. Do rozhodnutí platí chování z PR #295: lokalita se odvodí z místa akce (špendlík nebo vybraná adresa) a dá se upravit ručně bez přesunu špendlíku. Rozhodnutí řekne, jestli to tak zůstane.

- **Přátelé po odmítnutí (tým):** může odmítnutý člověk požádat o přátelství znovu (třeba po čase), nebo odmítnutí platí natrvalo? Návrh datového modelu má jednu žádost na dvojici se stavem `rejected` (#307).

## Pořadí ve sprintu (tým)

Všechno níže je ve sprintu 4, priorita určuje jen pořadí. Issues mají label:

- **P1: nejdřív** – chyby a první dojem, které PO viděl, a funkce s hotovým zadáním: #300 „Bug: ověření e-mailu tokenem neprojde“, #301 „Bug: po ověření e-mailu nejde přihlášení e-mailem a heslem“, #302 „E-maily ve spamu“, #297 „Jen světlý režim a kontrast“, #298 „Bug: Design – překryté a splývající texty“, #299 „Prázdný výpis /akce“, jedno pravidlo pro „proběhlou akci“ a zrušené akce (#272, stojí na něm #61 i #66), filtr proběhlých akcí na /akce (#61), hodnocení (#66), #296 „Onboarding po registraci“.
- **P2: jádro sprintu** – notifikační centrum (#86), #307 „Přátelé“, #303 „Formulář akce: lokalita a adresa“, obrázek akce (#77), #305 „Filtr Obsazenost“, #306 „Mapa při oddálení“, #304 „Moje: akce i skupiny“, výzva k hodnocení (#65, po #66), #308 „Superadmin: první nástřel“ (blokace uživatelů jen jako bonus). Přátelé stojí na notifikačním centru (žádost přijde jako upozornění), proto #86 dřív. Notifikace a přátelé: tým připraví návrh do refinementu 16. 11. a hned po něm implementuje; ostatní se dá začít hned.
- **P3: po P1 a P2** – bugy #191, #200, #266, #281, #288, #289, #291; bezpečnostní audit #226, #228, #230. U #191 a části #288 z #192 nejdřív ověřit, jestli ještě platí.

Ze sprintu 3 jsou zamergované a čekají v **Ready for Testing** na QA: #199 (PR #293) a #202 (PR #292). Hotové a v **Done** čekají na kontrolu PO: #41, #52, #165.

## Mimo scope sprintu 4

| Co                                                                                                                    | Proč                                              |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Tmavý režim                                                                                                           | PO: vynechat                                      |
| Správa superadminů, fronta nahlášení a nahlášení (B-062, #67, #71)                                                    | PO: zatím neděláme, jen první nástřel superadmina |
| Náhradníci (#79), opakované akce (#76), soukromé zprávy (#85)                                                         | Na standupu nezazněly                             |
| Cena a úroveň akce (#59), odebrání účastníka (#60), další správci (#62, #100), blokace člena (#63), fotka a bio (#64) | Na standupu nezazněly, backlog                    |
| Odstranění záložního dekódování odkazů (#220)                                                                         | Až staré odkazy nikdo nepoužívá                   |

## Úklid boardu (tým)

- Issues Brand (#245–#251) na board nepatří: zavřené jako „not planned“, práce je v #195 (PR #252, #253, #259, #269, #276, #279).
- Související bugy jsou sloučené: #184 do #200 (formulář akce), #192 do #288 (mobil /akce), #224 do #230 (rate limit), #242 do #304 (tok skupin); bod o lokalitě z #200 přešel do #303.
- #236 je zamergované (PR #267, 9. 11.), přesuneme ho do Done.
- U #77 a #86 změníme štítek „nice to have“ na „MVP“.
- Popisy labelů P1–P3 přepíšeme ze sprintu 3 na sprint 4.
- Stories a bugy sprintu 3 se zmergovaným PR zůstávají v **Done**, dokud je PO nepřijme.

## Dohody

- Bugy ze sprintu 3 klidně dodělat; PO aplikaci ještě proklikává a případné chyby založí nebo napíše týmu (PO).
- Stories, které považujeme za hotové, dáme do sloupce **Done**. PO je zkontroluje a přesune do **Accepted by PO**, nebo story vrátí (PO).
- Před přesunem do **Done** projde story QA ve sloupci **Ready for Testing**: jiný člen týmu ji proklikne na stagingu na mobilu i desktopu proti kritériím a DESIGN.md. Nálezy v designu jdou do #298 „Bug: Design – překryté a splývající texty“ (tým).
- Místo pondělní hodiny bude **refinement**: hlubší diskuze o hlavních funkcích do budoucna, aby se řešily koncepčně, ne lepením. Tým si předem připraví otázky, co není jasné a jak na sebe funkce navazují (PO).

## Úkoly

| Úkol                                                                                                                     | Kdo         |
| ------------------------------------------------------------------------------------------------------------------------ | ----------- |
| Pustit PO do GitHub organizace s právy k boardu                                                                          | Tým         |
| Založit nová issues ze scope, dát jim štítek priority a zařadit je do sprintu 4                                          | Tým (Adéla) |
| Rozdělit si issues P1 (Assignee)                                                                                         | Tým         |
| Navrhnout seznam notifikací a jejich texty a koncept přátel na refinement                                                | Tým         |
| Připravit otázky na refinement (onboarding, notifikace, přátelé, hodnocení, lokalita a adresa Q14, přátelé po odmítnutí) | Tým         |
| Zajistit místnost nebo připojení na refinement                                                                           | Tým         |

## Další schůzka

Refinement s PO v pondělí 16. 11. 2026 v 16:15, 45 minut, online (PO se připojí, tým může sedět v učebně).
