# UX audit – brand a „duše“ (#173)

**Stav:** rozhodnuto týmem 31. 10. 2026, návrhy jsou ve Figmě, ukážeme je PO na standupu út 3. 11. · **Kdo:** Veronika · **Implementace:** #195, **až po schválení PO** (co PO neschválí nebo odloží, jde do backlogu)

Podklady: [Figma HobbyHub-design](https://www.figma.com/design/dGYGqD8BjC1rYlbfjCpxWD/HobbyHub-design), [DESIGN.md](../DESIGN.md), [design-rozhodnuti.md](design-rozhodnuti.md), #167 (100 AI testerů, 26. 10.), [zápis planningu sprintu 3](zapis-planning-sprint3.md).

## Shrnutí

Aplikace byla čistá a konzistentní, ale působila jako dobře udělaná šablona: všechno bílé a zelené, karty akcí jedna jako druhá, texty věcné bez osobnosti. PO chtěl víc brandu a „duše“ a žádné prázdné plochy na desktopu.

Odpověď je koncept **„Koná se?“**. Akce pod minimem je otázka, akce s naplněným minimem se koná. Stavíme na prvku, který už máme a který nás odlišuje: šrafa v pruhu obsazenosti (#168) znamená „ještě se nekoná, chybí lidé“, plná limetková „koná se“. K tomu nový hlas aplikace a nová úvodní stránka.

Co jsme zvažovali a zamítli:

- **Tečky jako místa v partě** (motiv z loga). Tým 2 má obsazenost jako mřížku teček a „chybí N“, byli bychom k nerozeznání.
- **Barvy kategorií.** Seznam by byl přebarvený a soupeřil by s limetkovou „Chybí“. Zkouška zůstala ve Figmě na stránce „UX audit – zkoušky“.
- Barevné avatary a Bricolage Grotesque pro `h2`.

**Filtry na `/akce` zůstávají**, jak jsou (PO je hodnotil kladně).

## Rozhodnutí (tým, 31. 10.)

| #   | Co                                                                                                                                                                                                                                                              | Kde ve Figmě                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | **Koná se?** Na kartě malý pruh obsazenosti místo „3/12“ (šrafa = chybí lidé, plná = koná se, šedá = plno, značka = minimum). Štítek u akce s naplněným minimem říká počet volných míst („1 volné místo“, „4 volná místa“, „8 volných míst“), opravuje bug #189 | Komponenta Capacity bar/Mini, všechny karty akcí |
| 2   | **Razítko „Koná se“** jen na detailu akce, když je minimum naplněné. Na kartách ne: v seznamu by bylo skoro u každé akce a nic by neřeklo                                                                                                                       | Stamp/Koná se; A-05, A-05a, A-05b, A-05c, A-05ad |
| 3   | **Výraznější minimum** na detailu (stížnost testerů): značka 3 × 22 px a štítek „min. 6“ jako tmavá pilulka                                                                                                                                                     | Capacity bar, stránka zkoušek (varianta B)       |
| 4   | **Okamžik „Máš místo“** (A-05c): když tvé přihlášení naplní minimum, šrafa se změní na plnou barvu, objeví se razítko a „Díky tobě se akce koná“                                                                                                                | A-05c mobil i desktop                            |
| 5   | **„Kdo jde“** bez teček a míst: schválený vidí avatary a jména, ostatní jednu větu, kdy jména uvidí (#174)                                                                                                                                                      | A-05, A-05a, A-05d, A-05c                        |
| 6   | **Hlas aplikace** (B3 níže) a nadpis úvodu „Někde zrovna chybí jeden do party. Třeba ty.“                                                                                                                                                                       | Úvodní stránka, A-05c, DESIGN.md › Voice         |
| 7   | **Úvodní stránka**: panel „Teď chybí jeden“ (akce s nejmenším „chybí X“, pruh se šrafou, „Doplnit partu“), sekce podle #182, „Jak to funguje“ dole, výzva „Nic pro tebe? Založ vlastní akci a lidi se přidají.“                                                 | A-01 / A-01d (stará verze v Archiv – v3)         |
| 8   | **„Založit akci“**: ne do hlavičky (#139). Přihlášený má na `/akce` tichý odkaz „+ Založit akci“ vedle počtu akcí a dialog po ověření e-mailu nabízí „Založit akci“                                                                                             | A-02, A-02d, B-02                                |
| 9   | **Plná akce** má pod neaktivním „Plno“ odkaz „Podobné akce v okolí“                                                                                                                                                                                             | A-05 · Stavy tlačítka                            |
| 10  | **Prázdný seznam skupin** nabízí „Hledat v celém Česku“, „Zrušit typ aktivity“ a „Založit skupinu <aktivita> v <obci>“                                                                                                                                          | A-07e, A-07ed                                    |
| 11  | **Plovoucí „Založit akci“** v Moje akce nesmí zakrýt poslední kartu (ve Figmě je v řádku pod kartami, v kódu chybí rezerva)                                                                                                                                     | C-01, C-02                                       |
| 12  | **Štítky** „Jdu“, „Čeká na schválení“ (vlastní účast v Moje akce) a „Proběhlo“ (proběhlá akce, #61)                                                                                                                                                             | Status badge                                     |
| 13  | **Logo jako příběh:** prázdná čtvrtá tečka loga se doplní, když se přihlásíš – ten chybějící jsi ty. Okamžik „Máš místo“, načítání aplikace, hlavička e-mailu o schválení                                                                                       | Logo/Mark/Plná parta; A-05c, X-01, E-01a         |
| 14  | **„Máš místo“ jako vlastní blok**, ne šedý Alert s ikonou ⓘ: světle zelená plocha, logo s plnou partou, bez dovětku o změnách                                                                                                                                   | A-05c mobil i desktop                            |
| 15  | **„Sešlo se N“** místo „účast N“ u proběhlých akcí (karta, detail A-05h, stav tlačítka)                                                                                                                                                                         | A-02h, A-02hd, A-05h, A-08e                      |
| 16  | **Náhled sdíleného odkazu** (og:image): „Chybí 1 – třeba ty?“ s pruhem. Party se plní přes chaty, je to nejviditelnější místo značky mimo aplikaci. **Mimo sprint 3** – patří do #102 (Obrázek akce ke sdílení, backlog); návrh zůstává ve Figmě                | A-05s, #102                                      |
| 17  | **Naléhavost v panelu „Teď chybí jeden“:** relativní termín „(za 2 dny)“ a věta s čísly „5 z 10 už jde, do minima chybí 1. Přijď a hraje se.“                                                                                                                   | A-01, A-01d, A-01p, A-01pd                       |
| 18  | **Moje akce › Přihlášen:** u akce pod minimem „chybí N“ v údajích karty – štítek tam ukazuje vlastní účast, a jestli se akce bude konat, je pro účastníka nejdůležitější                                                                                        | C-01 (popis)                                     |
| 19  | **E-mail „Koná se“** organizátorovi i účastníkům, když akce dosáhne minima                                                                                                                                                                                      | E-01 · Texty upozornění, typ 9                   |

Rozhodnutí 13–19 vzešla z nezávislé kontroly auditu (níže) a tým je schválil 31. 10.; stejně jako 1–12 je ukážeme PO. Rozhodnutí 16 (náhled odkazu) do sprintu 3 nepatří, je v backlogu u #102.

### B3 Hlas aplikace

Pravidla: tykání, bez rodu, krátce a vždy s dalším krokem. Prázdný stav řekne jednou větou, co tu bude, druhá věta může mít osobnost.

| Kde                                 | Teď                                                                                               | Nově                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Úvod – nadpis                       | Najdi lidi na volnočasové akce ve svém okolí                                                      | Někde zrovna chybí jeden do party. Třeba ty.                                                                        |
| Úvod – podnadpis                    | Volejbal, deskovky, běh… Přidej se k akci, které chybí lidé, nebo založ vlastní a dej o ní vědět. | Volejbal, deskovky, běh… Najdi akci ve svém okolí, nebo založ vlastní a lidi se přidají.                            |
| Moje akce › Přihlášen, prázdno      | Zatím nejdeš na žádnou akci.                                                                      | Zatím nejdeš na žádnou akci. Mrkni, komu v okolí chybí lidé. (odkaz na /akce s filtrem Chybí lidé)                  |
| Moje akce › Pořádám, prázdno        | Zatím nepořádáš žádnou akci.                                                                      | Zatím nepořádáš žádnou akci. Stačí název, místo a čas – parta se sejde.                                             |
| Moje skupiny, prázdno               | Zatím nejsi v žádné skupině.                                                                      | Zatím nejsi v žádné skupině. Najdi partu, se kterou se budete potkávat pravidelně.                                  |
| Detail po přihlášení                | Jdu                                                                                               | Máš místo. Parta je o jednoho větší. (+ „Díky tobě se akce koná…“ jen když minimum naplnilo právě tvoje přihlášení) |
| Úvod, žádné akce v okolí            | Teď nejsou žádné nadcházející akce.                                                               | V okolí teď nic není. Buď první – založ akci a dej o ní vědět.                                                      |
| Úvod, výzva dole                    | –                                                                                                 | Nic pro tebe? Založ vlastní akci a lidi se přidají.                                                                 |
| Úvod, panel „Teď chybí jeden“       | Pět lidí už jde, šestý chybí do minima. Přijď a hraje se.                                         | 5 z 10 už jde, do minima chybí 1. Přijď a hraje se. (čísla, ne slova – jde to generovat)                            |
| Úvod, panel – nikde nic nechybí     | –                                                                                                 | Všechny akce v okolí mají svoje minimum. Mrkni, kde jsou ještě volná místa.                                         |
| Detail, žádost čeká                 | Organizátorka ji schválí nebo zamítne.                                                            | Až ji organizátor schválí, přijde ti e-mail.                                                                        |
| Detail, žádost zamítnutá            | – (stav chyběl)                                                                                   | Tentokrát to nevyšlo. Na tuhle akci tě organizátor nepřijal. Mrkni na podobné akce v okolí.                         |
| Detail, proběhlá akce               | Přišlo 8 lidí.                                                                                    | Sešlo se 8 lidí. Podobné akce najdeš v Akcích.                                                                      |
| Detail, akce jen pro členy (nečlen) | – (stav chyběl)                                                                                   | Tuhle akci pořádá skupina … pro své členy. Přidej se ke skupině a uvidíš ji i se všemi údaji.                       |
| E-mail o schválení                  | Organizátorka Petra Nováková schválila tvou žádost…                                               | Tvoje žádost o účast je schválená – na akci máš místo.                                                              |

## Nálezy podle dopadu

| #   | Nález                                                                                          | Kde                                 | Dopad                     | Řešení                                          |
| --- | ---------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------- | ----------------------------------------------- |
| N1  | Seznam akcí je monotónní, karty se od sebe neliší                                              | Karta akce                          | Vysoký                    | Rozhodnutí 1                                    |
| N2  | Značka se mimo logo neprojevuje                                                                | Celá aplikace                       | Vysoký                    | Rozhodnutí 1–4, 6                               |
| N3  | „Volná místa 12/20“ = 12 přihlášených, ne volných                                              | Karta akce, Moje akce               | Vysoký (11 testerů, #189) | Rozhodnutí 1                                    |
| N4  | „Založit akci“ organizátor nenajde                                                             | /akce, dialog po ověření            | Vysoký (36 testerů)       | Rozhodnutí 8                                    |
| N5  | Minimum na detailu je málo vidět                                                               | Detail akce                         | Střední                   | Rozhodnutí 3                                    |
| N6  | Prázdné stavy jsou suché nebo slepé uličky                                                     | Úvod, Moje akce, skupiny, plná akce | Střední                   | Rozhodnutí 6, 9, 10                             |
| N7  | Úvod neříká, proč by to mělo člověka zajímat                                                   | A-01, A-01d                         | Střední                   | Rozhodnutí 7                                    |
| N8  | Plovoucí „Založit akci“ zakrývá poslední kartu                                                 | Moje akce, mobil                    | Nízký                     | Rozhodnutí 11                                   |
| N9  | Štítky „Jdu“ a „Čeká“ chyběly v DESIGN.md                                                      | C-01                                | Nízký                     | Rozhodnutí 12                                   |
| N10 | Odkaz zpět na detailu nové akce má popisek „Akce“, ale vede do Moje akce (#187 to předalo sem) | Detail akce po zveřejnění           | Nízký                     | Popisek podle cíle („Moje akce“), patří do #195 |

## Nesoulady nalezené při auditu

1. **Figma A-05b** měla na pozadí obsah jiné akce (e17 místo e11). Opraveno 30. 10.
2. **Figma × kód – úvodní stránka**: kód má od #160 sekci oblíbených akcí, Figma ji neměla. Vyřešeno návrhem úvodu (rozhodnutí 7).
3. **Figma × kód – A-05 · Stavy tlačítka**: po #145 kód ukazuje „Jdu“ s poznámkou o změnách, Figma alert „Jdeš na akci“. Nově platí text z rozhodnutí 4 a 6 („Máš místo…“); Figma opravena 31. 10.
4. **Figma × kód – ověření e-mailu**: od PR #161 je to v kódu dialog nad stránkou, kde registrace začala; Figma B-02 kreslí stránku. Platí kód, B-02 ukazuje obsah dialogu.
5. **Otevřené issues s mergnutým PR** (přesunout do Done ke kontrole PO): #166 (PR #168), #157 (#158), #156 (#160), #155 (#161), #153 (#163), #118 (#134) – bez P labelu, práce ze sprintu 2. #154 (#164) je P3 ve sprintu 3, otevřená kvůli zapnutí na stagingu (#165).
6. **Zbytky z mergnutých PR bez issue** jsou rozepsané v `bugy-ze-zbytku-PR.md` (mimo repo, podklad pro založení na GitHubu).

## Nezávislá kontrola (31. 10.)

Druhý pohled na audit, Figmu a dokumenty před ukázkou PO. Všechno níže je ve Figmě opravené nebo doplněné.

**Chyby v grafice**

| Co                               | Bylo                                                                                                                                               | Teď                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Capacity bar/Mini, stav Chybí    | Šrafa pokračovala za značku minima (vizuálně „minimum je naplněné“, opak konceptu) a přetékala přes lokalitu – dráha 120 px v rámu 72 px bez ořezu | Dráha 72 px s ořezem, šrafa končí před značkou; srovnáno na všech 161 instancích                  |
| Capacity bar, varianty           | Volná i Plno měly text „Chybí ještě 2“ a čísla nesouhlasila se značkou                                                                             | Geometrie podle čísel; texty jsou vlastnosti instance, pravidla v popisu komponenty a v DESIGN.md |
| Pruh na detailu                  | „Volná místa: 4“, ale štítek „4 volná místa“                                                                                                       | Všude „4 volná místa“                                                                             |
| Avatar „Ty“ v Kdo jde            | Limetková výplň (lime jako dekorace)                                                                                                               | Kroužek `ring-foreground`                                                                         |
| „+ Založit akci“ na /akce        | Uprostřed mezi počtem a řazením                                                                                                                    | Hned vedle počtu akcí                                                                             |
| Úvod na desktopu                 | „Jak to funguje“ v jedné třetině šířky                                                                                                             | Tři kroky vedle sebe přes celou mřížku                                                            |
| Karty na registraci a přihlášení | Staré „Volná místa“ a „9/14 · Praha 9“                                                                                                             | „5 volných míst“ a lokalita                                                                       |
| Veřejný profil na desktopu       | Úzký sloupec, zbytek prázdný                                                                                                                       | Dva sloupce na mřížce 1200 px                                                                     |
| „Organizátorka“ v textech        | 18 výskytů (aplikace pohlaví nezná)                                                                                                                | „Organizátor“ / trpný rod; pravidlo v DESIGN.md › Copy                                            |

**Úplnost Figmy** – doplněno:

- Tmavý režim: sekce „Sprint 3 – Koná se?“ (mini pruh, razítko, všechny štítky, pilulka „min.“, Map preview, logo s plnou partou).
- Účet B-01/B-01d, B-03/B-03d podle kódu: heslo znovu, síla hesla, souhlasy, „Pokračovat přes Google“ (#153, #154, #163, #169).
- Nové stavy: detail proběhlé akce (A-05h), akce jen pro členy pro nečlena (A-05i), veřejná skupina pro nečlena (A-08f), žádost zamítnutá (A-05 · Stavy), panel „Teď chybí jeden“ bez akcí, náhled odkazu (A-05s), načítání (X-01).
- Desktopové dialogy, které chyběly: A-05bd, B-02d, D-02ad, D-07ad.
- E-01 · Texty upozornění: předmět, text a tlačítko pro všech 8 typů z planningu + návrh „Koná se“.

**Hlavní toky** (prošli jsme je ve Figmě obrazovku po obrazovce)

| Tok                                       | Obrazovky                                                  | Nález                                                                                   | Stav                                |
| ----------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------- |
| Najít akci a přihlásit se (bez schválení) | A-01 → A-02 → A-05 → B-03 → A-05c                          | Chyběl stav panelu bez akcí; „Jdeš na akci“ místo „Máš místo“ ve stavech                | Doplněno                            |
| Žádost o účast a schválení                | A-05 → A-05a → C-01 (Čeká) → D-03 → E-01a → A-05c          | Chyběl stav „Žádost zamítnutá“ a e-mail o zamítnutí; čekající nevěděl, že přijde e-mail | Doplněno (A-05 · Stavy, E-01 typ 2) |
| Plná akce                                 | A-05 (Plno) → Podobné akce v okolí → A-02                  | V pořádku                                                                               | –                                   |
| Proběhlá akce                             | A-02h → detail                                             | Detail nebyl nakreslený                                                                 | A-05h                               |
| Založit a spravovat akci                  | C-02 → D-01 → D-03 → D-04 → D-02 → D-02a                   | Desktopový dialog zrušení chyběl                                                        | D-02ad                              |
| Registrace a ověření e-mailu              | B-01 → pruh Ověř si e-mail → B-02                          | B-01 neodpovídal kódu; desktopový dialog chyběl                                         | Opraveno, B-02d                     |
| Skupina a její akce                       | A-07 → A-08 / A-08f → A-08a → D-07 → A-08e → D-01g → A-05g | Chyběl pohled nečlena na veřejnou skupinu a stav akce jen pro členy                     | A-08f, A-05i                        |
| Profil                                    | B-05 → B-06, B-07                                          | Veřejný profil na desktopu byl prázdný                                                  | Dva sloupce                         |

**K rozhodnutí PO na standupu 3. 11.**

1. Rozhodnutí 1–19 (zvlášť 13–19, které jsou nové).
2. Žádost zamítnutá: smí žadatel na stejnou akci poslat novou žádost? (A-05 · Stavy předpokládá, že ne.)
3. Veřejný profil: stačí jméno, hodnocení a zájmy, nebo přidat veřejné nadcházející akce, které člověk pořádá?
4. Akce jen pro členy otevřená nečlenem: ukázat stránku „jen pro členy“ s cestou do skupiny (A-05i), nebo 404?
5. E-mail „Koná se“ (typ 9) – posílat organizátorovi, účastníkům, nebo oběma?

## Figma – co je nového (31. 10.)

| Obrazovka                                             | Mobil                                                               | Desktop                       | Issue               |
| ----------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------- | ------------------- |
| Úvodní stránka – návštěvník                           | A-01                                                                | A-01d                         | #173, #182          |
| Úvodní stránka – přihlášený (Podle tvých zájmů)       | A-01p                                                               | A-01pd                        | #173, #182          |
| Detail akce: Koná se, Kdo jde, Zprávy od organizátora | A-05, A-05c                                                         | A-05d, A-05c                  | #173, #174, #176    |
| Žádost o účast se zprávou                             | A-05a                                                               | A-05ad                        | #175                |
| Náhled akce po klepnutí na špendlík                   | A-03a                                                               | A-03ad                        | #56                 |
| Lokalita s okolím, výchozí lokalita, vzdálenost       | A-02g                                                               | A-02gd                        | #55, #57            |
| Proběhlé akce                                         | A-02h                                                               | A-02hd                        | #61                 |
| Správa akce: zpráva u žádosti, „Napsat účastníkům“    | D-03                                                                | D-03d                         | #175, #176          |
| Napsat účastníkům (dialog)                            | D-04                                                                | D-04d                         | #176                |
| Založení akce skupiny                                 | D-01g                                                               | D-01gd                        | #70                 |
| Detail akce skupiny (pořádá skupina, jen pro členy)   | A-05g                                                               | A-05gd                        | #70, #174           |
| Stránka skupiny pro člena: akce skupiny, oznámení     | A-08e                                                               | A-08ed                        | #70, #194           |
| Požádat o členství se zprávou                         | A-08a                                                               | A-08ad                        | #175                |
| Správa skupiny: zpráva u žádosti, „Napsat členům“     | D-07                                                                | D-07d                         | #175, #194          |
| Napsat členům (dialog)                                | D-08                                                                | D-08d                         | #194                |
| Skupiny – nic nenalezeno                              | A-07e                                                               | A-07ed                        | #173                |
| Můj profil                                            | B-05                                                                | B-05d                         | #178                |
| Upravit profil                                        | B-06                                                                | B-06d                         | #178                |
| Veřejný profil                                        | B-07                                                                | B-07d                         | #179                |
| E-maily upozornění                                    | E-01 (jedna šablona, přizpůsobí se šířce) + E-01 · Texty upozornění |                               | #177, #176, #194    |
| Detail proběhlé akce                                  | A-05h                                                               | A-05h desktop                 | #61                 |
| Akce jen pro členy (nečlen)                           | A-05i                                                               | A-05i desktop                 | #70                 |
| Veřejná skupina (nečlen)                              | A-08f                                                               | A-08fd                        | #70                 |
| Panel „Teď chybí jeden“ bez akcí                      | A-01 · Panel – bez akce                                             | (stejný)                      | #173                |
| Náhled sdíleného odkazu                               | A-05s (og:image)                                                    |                               | #102, mimo sprint 3 |
| Načítání aplikace                                     | X-01                                                                | (stejné)                      | #173, návrh         |
| Dialogy na desktopu                                   | –                                                                   | A-05bd, B-02d, D-02ad, D-07ad | sprint 2, doplněno  |
| Tmavý režim – komponenty sprintu 3                    | stránka Tmavý režim › Sprint 3                                      |                               | #173                |
