# HobbyHub – zápis z planningu sprintu 2

**Kdy:** 13. 10. 2026, 22 minut, online · **Kdo:** Jan Černý (product owner), tým HobbyHub · **Téma:** planning sprintu 2, scope MVP

Na konci sprintu 2 ukážeme živě na stagingu happy path pro akce i skupiny: objevení v seznamu a na mapě, vyhledání podle základních kritérií, detail, správu (vytvořit / upravit / zrušit), přihlášení na akci (i se schválením organizátora) a žádost o členství ve skupině se schválením. Hodnocení a další funkce kolem zatím neřešíme.

**Aktualizováno 20. 10.** podle standupu s PO 19. 10. (viz [Změny scope 19. 10.](#změny-scope-19-10)), nového designu seznamu a mapy a změn z 20. 10. (viz [Změny scope 20. 10.](#změny-scope-20-10)).

## Happy path

![Happy path sprintu 2 – akce i skupiny, schvalování u akcí i skupin (stav k 20. 10.)](img/happy-path-sprint2.png)

Happy path je průchod, který si v aplikaci ověří základní věci: „objevil jsem aplikaci, přihlásil se, viděl něčí akci, přečetl si, o čem je, a dal najevo, že přijdu.“ Skupina funguje podobně, liší se schvalovacím procesem.

**Potvrzeno PO 14. 10.:** _„Najdeš appku, zaregistruješ se a přihlásíš, vyhledáš si event nebo skupinu, co se ti líbí, podle různých kritérií, a přihlásíš se na event / požádáš o schválení do skupiny.“_

1. **Úvodní stránka:** návštěvník pochopí, k čemu HobbyHub je.
2. **Registrace a přihlášení:** stane se uživatelem.
3. **Seznam akcí s mapou:** prochází nadcházející akce v seznamu a jako body na mapě a filtruje je podle lokality, termínu, typu aktivity a toho, jestli akci chybí lidé.
4. **Detail akce:** vidí, o čem akce je, kdo ji pořádá a kolik lidí chybí.
5. **Přihlášení na akci:** dá najevo, že přijde. U akce bez schválení klepne „Přijdu“, u akce se schvalováním pošle žádost a organizátor ji schválí (změna 19. 10., viz níže).
6. **Správa akce:** organizátor akci vytvoří, upraví nebo zruší, vidí přihlášené a vyřizuje žádosti.
7. **Seznam skupin s filtrem, detail a správa skupiny:** stejné vzory jako u akcí, UX jen jasně ukáže, že jsem v jiné části. Skupinu jde založit, upravit a deaktivovat.
8. **Žádost o členství ve skupině:** uživatel požádá, správce žádost přijme, uživatel je ve skupině. Co člen ve skupině dál dělá, zatím neřešíme.

## Scope sprintu 2

User stories z [HobbyHub_User_Stories_MVP.md](HobbyHub_User_Stories_MVP.md), které happy path pokrývají, osekané na to, co sprint potřebuje. Na GitHubu jsou jako issues #36–#54 se štítkem `ready`. Schvalování je ve scope u členství ve skupinách i u přihlášek na akce (změna 19. 10.). Mapa je nástřel s filtry (PO 19. 10.); náhled po klepnutí na špendlík, shluky, „Hledat v této oblasti“, hledání podle názvu a řazení podle vzdálenosti jsou sprint 3. Design ve Figmě ukazuje cílový stav, implementuje se postupně.

| Story                      | Původní | Bereme ve sprintu 2                                                                                                                                                        | Vynecháváme                                                                                                               |
| -------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Úvodní stránka             | US-01   | Landing page: věta, co HobbyHub dělá, náhled nadcházejících akcí, vstup do registrace                                                                                      | Lokalita z IP (výchozí Praha)                                                                                             |
| Registrace a přihlášení    | US-04   | E-mail + heslo, návrat na akci po přihlášení, ověření e-mailu odkazem (simulované přes bezplatnou e-mailovou službu) a zapomenuté heslo (PO 20. 10.)                       | Potvrzení 18+ a souhlasy (změna 19. 10.)                                                                                  |
| Seznam a mapa akcí         | US-02   | Seznam a mapa na jedné stránce (mobil: mapa + vysouvací panel se seznamem, desktop vedle sebe), filtry lokalita, termín, typ aktivity (kategorie › aktivita), „Chybí lidé“ | Náhled po klepnutí na špendlík, shluky, „Hledat v této oblasti“, hledání podle názvu, řazení podle vzdálenosti (sprint 3) |
| Detail akce                | US-03   | Detail na vlastní URL bez přihlášení, „chybí ještě X“, organizátor, způsob přihlášení                                                                                      | Sdílení a náhled odkazu ve WhatsAppu                                                                                      |
| Založení akce              | US-11   | Formulář s min./max., místo na mapě + adresa, volba schvalování přihlášek (výchozí „Bez schválení“)                                                                        | Cena, úroveň, vybavení (nepovinné, pokud zbude čas), soukromá akce                                                        |
| Úprava a zrušení akce      | US-13   | Úprava do začátku akce, zrušení s povinným důvodem a štítkem „Zrušeno“ (akce se nemaže)                                                                                    | E-maily přihlášeným                                                                                                       |
| Přihlášení na akci         | US-06   | „Přijdu“, žádost o účast u akce se schvalováním a její stažení, odhlášení, „Plno“                                                                                          | Zpráva k žádosti                                                                                                          |
| Účastníci akce             | US-12   | Seznam přihlášených a čekajících žádostí, schválení / zamítnutí jednotlivě                                                                                                 | Hromadné schválení, odebrání účastníka, zpráva účastníkům, e-maily                                                        |
| Moje akce                  | US-07   | Záložky Přihlášen (i čekající žádosti) a Pořádám, odkaz v navigaci (přidáno 18. 10., schválil PO)                                                                          | Záložka Proběhlé                                                                                                          |
| Skupiny: založení a správa | US-16   | Založení, úprava, deaktivace (změna 19. 10.); seznam skupin s filtrem aktivita + lokalita, detail skupiny                                                                  | Jmenování dalších správců, obrázek                                                                                        |
| Členství ve skupině        | US-17   | Veřejná: „Přidat se“; neveřejná: žádost → schválení / zamítnutí; odchod                                                                                                    | Blokace člena, upozornění                                                                                                 |
| Testovací data             | F-64    | Seed akcí, skupin a účastí podle kategorií aktivit (B-002) s demo účty a případy pro happy path, ručně zkontrolovaný                                                       | –                                                                                                                         |

**Změny scope 18. 10.:**

- **Moje akce (US-07) přidány:** bez nich přihlášený uživatel nemá kde najít akce, na které se přihlásil, ani ty, které pořádá, a navigace by vedla do prázdna. V původní happy path od PO nebyly; rozšíření scope PO schválil 18. 10.
- ~~**Schvalování přihlášek u akcí odebráno**~~ – zrušeno změnou 19. 10.

### Změny scope 19. 10.

Ze standupu s PO 19. 10. a z rozhodnutí týmu 20. 10.:

- **Schvalování přihlášek u akcí je zpátky ve sprintu 2** (PO). Organizátor při založení volí „Bez schválení“ (výchozí) nebo „Schvaluji přihlášky“; u akce se schvalováním uživatel pošle žádost a organizátor ji schválí nebo zamítne (#53). Ruší změnu z 18. 10.
- **Potvrzení věku 18+ a souhlasy při registraci nejsou ve sprintu 2** (PO). V MVP zůstávají, udělají se spolu s právními stránkami (B-016, B-081).
- **Skupina se deaktivuje, nemaže ani neruší** (PO). Skupina zmizí z hledání a nejde se do ní přidat, nadcházející akce skupiny se zruší, proběhlé zůstanou v historii. Odpovídá na otázku 3 u skupin.
- **Akce se také jen ruší, nemažou** (tým, stejný princip jako u skupin; potvrdit s PO). Zrušená akce má štítek „Zrušeno“ s důvodem.
- **Mapa: nástřel s filtry** (PO). Tým navrhl filtry a rozložení podle nového designu (lokalita, termín, typ aktivity ve dvou úrovních, „Chybí lidé“; mapa na mobilu přes celou obrazovku se seznamem ve vysouvacím panelu). Co z designu je až sprint 3, je v tabulce výše.
- **Organizátor není automaticky účastníkem své akce, ale může se na ni přihlásit** (tým 20. 10., dodatek k US-06). Jeho přihláška se neschvaluje a počítá se do obsazenosti. Potvrdit s PO.
- **Typy aktivit ve dvou úrovních** (tým): kategorie › aktivita, jen aktivity, kde se skládá parta (ne koncerty, trhy, kulturní akce). Seznam je v BACKLOG.md › B-002.

### Změny scope 20. 10.

Změna odsouhlasená s PO a rozhodnutí týmu 20. 10.:

- **Ověření e-mailu a zapomenuté heslo jsou ve sprintu 2** (PO, #58). E-maily jdou přes bezplatnou e-mailovou službu (simulace, repo má adaptéry pro Resend a SMTP). Bez ověřeného e-mailu se nejde hlásit na akce ani zakládat akce a skupiny (B-011, B-012).
- **Kategorie aktivit navrhl tým** (tým; PO je neschvaloval): 8 vyvážených kategorií po 5–6 aktivitách, v každé navíc „Jiné“ pro aktivity, které v seznamu chybí, a u aktivit klíčová slova pro hledání. Seznam je v BACKLOG.md › B-002, s PO ho prokonzultujeme na standupu.
- **Skupina se deaktivuje** (tým, upřesnění změny 19. 10.) – v UI i v backlogu „Deaktivovat skupinu“ místo „Zrušit“, aby se to nepletlo se zrušením akce (#54, B-051).
- **Testovací data** (#47, tým) obsahují demo účty (hledající, organizátorka, správce skupin, neověřený účet) a připravené případy pro průchod happy path na demu.

### Změny scope 24. 10.

- **Moje skupiny** (tým, B-056): záložky Všechny / Moje na `/skupiny`, navazuje na #46. Bez nich se člen ani správce ke své skupině nedostane jinak než přes výpis.
- **Zapomenuté heslo není ve sprintu 2** (PO, zpráva 24. 10.). Ověření e-mailu ve sprintu zůstává (#58).

## Mimo scope

PO teď nechce řešit hodnocení a funkce kolem, rozšiřovaly by scope bez vlivu na happy path.

| Oblast                    | Stories             | Proč ne teď                                                                                                                |
| ------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| E-mailová upozornění      | US-08               | Plánovač a e-maily ke změnám akcí (ověření e-mailu je ve sprintu 2, změna 20. 10.)                                         |
| Profil a GDPR             | US-05               | Viditelnost údajů, export a smazání účtu                                                                                   |
| Hodnocení                 | US-09               | PO: zatím nechceme                                                                                                         |
| Akce skupin a správci     | US-18, US-16 (část) | Skupina zatím jen ověřuje členství a schvalování                                                                           |
| Moderace                  | US-10, US-19        | Role superadmin a administrace                                                                                             |
| Monetizace                | US-14, US-15        | Simulované platby; závisí na administraci                                                                                  |
| Interaktivní mapa         | US-02 (část)        | Náhled po klepnutí na špendlík, shluky, „Hledat v této oblasti“, hledání podle názvu a řazení podle vzdálenosti – sprint 3 |
| Potvrzení věku a souhlasy | US-04 (část)        | Změna 19. 10.: spolu s právními stránkami po sprintu 2                                                                     |

## Dohody

**Design**

- Před zadáním agentovi navrhneme a s PO schválíme design jedné typické obrazovky (seznam nebo detail akce) na mobilu i desktopu. Ne landing page, ta vypadá jinak než zbytek aplikace.
- Hi-fi všech obrazovek nedělat. Stačí ukázka seznamu, detailu a formuláře; agent další obrazovky odvodí.
- Wireframy jsou dobrý základ. Primární zařízení je mobil, superadmin jen desktop.
- Aplikace má mít trochu brandu, nejen shadcn s barevnými tlačítky. Design systém s tokeny (např. shadcn) je doporučený, ne povinný.
- Design schvalovat průběžně, i asynchronně v Teams, ne až na poslední chvíli.

**Backlog**

- Relevantní user stories dáme do GitHubu a posouváme Backlog → Ready / Sprint backlog → Done.
- Backlog sprintu 2 (user stories a úkoly): <https://github.com/orgs/applifting-vsecourse/projects/16>
- PO projde popisy úkolů a upozorní na nesmysly od AI.
- Feature breakdown a backlog držíme aktuální a reagujeme na nová zjištění; Lean Canvas dál neladíme.

**Testovací data**

- Necháme AI vygenerovat data podle oblastí zájmu z briefu a ručně zkontrolujeme, jestli dávají smysl.

**Komunikace**

- Průběžně informovat PO: návrh, dotazy, výsledek běhu agenta, nalezené chyby. Klidně asynchronně v Teams.

**Co ukážeme na konci sprintu**

- Verzi nasazenou na stagingu; nasazovat průběžně a nerozbít ji těsně před demem.
- Otestovanou, bez chyb „na první pohled“, v souladu se schválenou specifikací.
- Demo jako živý průchod aplikací, bez PowerPointu.

## Úkoly

| Úkol                                                           | Kdo                                    |
| -------------------------------------------------------------- | -------------------------------------- |
| Poslat do Teams průlet happy path jako záznam scopingu         | Jan Černý (hotovo 14. 10.)             |
| Založit úkoly sprintu jako issues na GitHubu a rozdělit je     | Tým (založeno 14. 10., zbývá rozdělit) |
| Navrhnout design první obrazovky a poslat PO do Teams k review | Tým (hotovo 14. 10.)                   |
| Vygenerovat a zkontrolovat testovací data                      | Tým (QA)                               |
| Potvrdit schůzku 19. 10. ve stejném mailovém vlákně            | Tým (hotovo)                           |
| Překreslit obrázek happy path podle změn 19. 10.               | Tým (hotovo 20. 10.)                   |
| Přesunout #53 a novou issue 18+ a souhlasy na boardu           | Tým                                    |

## Otázky na PO z 19. 10.

1. **Moje akce (US-07):** vyřešeno, PO 18. 10. schválil zařazení do sprintu 2.
2. **Kritéria vyhledávání:** vyřešeno 19. 10.: PO chce nástřel mapy s filtry. Konkrétní filtry navrhl tým v designu (viz Změny scope 19. 10.); u skupin zůstává filtr aktivita + lokalita.
3. **Smazání, nebo zrušení:** u skupin vyřešeno 19. 10. (deaktivace, ne zrušení). U akcí tým navrhuje taky jen zrušení – potvrdit na příštím standupu.
4. **Schvalování u akcí:** vyřešeno 19. 10.: ve sprintu 2 je (ruší změnu z 18. 10.).
5. **Odchylky designu od wireframů:** přesunuto na příští standup, seznam se rozšířil (viz níže).

## K prokonzultování na příštím standupu

1. **Filtr „Chybí lidé“:** tým ho přidal do designu i do sprintu 2 (hlavní hodnota produktu, ve wireframech nebyl). Odsouhlasit.
2. **Zapomenuté heslo:** má být ve scopu sprintu 2 i zapomenuté heslo? máme to teď jako jednu issue dohromady s ověřením emailu.
3. **Mobil – výchozí pohled /akce (US-02):** mapa přes celou obrazovku a seznam ve vysouvacím panelu místo „výchozí je seznam, na mapu se přepíná“. Odpovídá na otázku z wireframu A-03. Odsouhlasit.
4. **Zrušení akce místo smazání:** stejně jako u skupin (bod 3 výše).
5. **Kategorie aktivit:** nový seznam týmu z 20. 10. (8 kategorií + „Jiné“, BACKLOG.md › B-002). Ukázat PO a vyslechnout připomínky.
6. **Organizátor a vlastní akce:** organizátor není automaticky účastníkem, ale může se na svou akci přihlásit; jeho přihláška se neschvaluje a počítá se do obsazenosti (minima i maxima). Odsouhlasit.
7. **Odchylky designu od wireframů:** [design-rozhodnuti.md](design-rozhodnuti.md). Wireframy jsou od 20. 10. aktualizované podle designu, původní verze je ve Figmě na stránce „Archiv“.
8. **Akce skupin (US-18, #70):** ve sprintu 2 skupiny akce nemají, takže po přijetí do skupiny člen nemá co dělat (na demu slepá ulička). Probrat s PO, jestli zakládání akcí za skupinu vzít jako první věc sprintu 3, případně v jakém rozsahu (správce založí akci za skupinu, akce jen pro členy / veřejná).

## Další schůzka

Příští standup s PO, body výše.
