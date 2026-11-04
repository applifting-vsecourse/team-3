# UX audit – nový brand (#173)

**Stav:** nový brand schválil PO 3.–4. 11. 2026, připomínky PO ze 4. 11. jsou zapracované ve Figmě · **Kdo:** Veronika · **Implementace:** #195 (přestavba aplikace podle Figmy) a navazující issues v tabulce [Co jde do kódu](#co-jde-do-kódu)

Tahle verze nahrazuje audit z 31. 10. (koncept „Koná se?“). Koncept zůstává, ale PO 31. 10. řekl, že v UX, UI ani identitě nevidí skutečný posun, takže jsme brand udělali znovu. Co z verze 31. 10. platí dál, je v [Rozhodnutí](#rozhodnutí).

Podklady: [Figma HobbyHub-design](https://www.figma.com/design/dGYGqD8BjC1rYlbfjCpxWD/HobbyHub-design) (stránky „Úvod a detail akce“, „Seznam akcí“, „Účet“, „Moje akce a správa akce“, „Skupiny“, „Design system“; návrhy pro PO na „Brand – návrhy pro PO (1. 11.)“, staré verze na stránkách „Archiv“), [DESIGN.md](../DESIGN.md), [design-rozhodnuti.md](design-rozhodnuti.md), [zápis planningu sprintu 3](zapis-planning-sprint3.md), bezpečnostní audit (#172, větev `docs/172-bezpecnostni-audit`), #167 (100 AI testerů).

## Shrnutí

Aplikace byla čistá, ale působila jako dobře udělaná šablona: bílá a zelená, karty jedna jako druhá, texty bez osobnosti. PO chtěl víc brandu, „duši“, něco výrazného a velkého, a žádné prázdné plochy na desktopu.

**Nový brand** stojí na čtyřech věcech:

1. **Tmavě zelený pás** nahoře na každé stránce s velkým motivem loga – parta, které chybí jeden. Na desktopu logo vychází zespodu pásu (limetkový kroužek je ten chybějící), na mobilu je znak před nadpisem.
2. **Fotky aktivit** na kartách a v detailu (jedna fotka na aktivitu z knihovny, ne fotky organizátorů) s datovou dlaždicí přes fotku.
3. **„Koná se?“** z verze 31. 10.: šrafa v pruhu obsazenosti = ještě se nekoná, chybí lidé; plná výplň = koná se; razítko „Koná se“ na detailu; okamžik „Máš místo“.
4. **Hlas aplikace**: tykání, bez rodu, čísla místo slov, osobní pojmenování („Tady chybíš“, „Jakube, tady se na tebe čeká.“).

Barevný tón „Hlubší les“ (tmavší zelená, sytější limetka). Limetka je jen signál – hlavní tlačítko, „Chybí“, razítko, aktivní stav – nikdy dekorace ani text.

**Jak jsme se k tomu dostali:** 31. 10. PO odmítl první verzi (málo změny) i „Plakát“ (matoucí, toxická zelená) a chtěl víc návrhů na jedné obrazovce. 1. 11. vybral kombinaci horní části návrhu 14 a karet z návrhu 12, ilustrace nahradit fotkami a osobní pojmenování. Tým pak místo vzoru z ikon zvolil velký motiv loga (návrh 16), tón Hlubší les, zvýrazňovač u nadpisů sekcí a špendlíky varianta B. PO nový brand viděl a schválil 3.–4. 11.

Co jsme zvažovali a zamítli: tečky jako místa v partě (tým 2 má obsazenost jako tečky – byli bychom k nerozeznání), barvy kategorií (seznam by byl přebarvený a soupeřil by s „Chybí“), vzor z ikon v pásu (návrh 14, zůstal jen jako záloha na stránce návrhů), „Plakát“.

**Filtry na `/akce` zůstávají**, jak jsou (PO je hodnotil kladně).

## Rozhodnutí

Číslování navazuje na verzi z 31. 10. **Stav:** platí / změněno / zrušeno.

| #   | Co                                                                                                                                                                                                                                     | Stav                                                                      | Kde ve Figmě                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | **Pruh obsazenosti na kartě** místo „3/12“ (šrafa = chybí lidé, plná = koná se, šedá = plno, značka = minimum). Štítek s naplněným minimem říká počet volných míst („1 volné místo“, „4 volná místa“, „8 volných míst“), opravuje #189 | platí; pruh je teď přímo v kartách (Capacity bar/Mini zrušen)             | Karta akce/Foto, Karta akce/Foto řádek        |
| 2   | **Razítko „Koná se“** jen na detailu akce s naplněným minimem, ne na kartách                                                                                                                                                           | platí                                                                     | Stamp/Koná se; A-05, A-05c, A-05g             |
| 3   | **Výraznější minimum** na detailu: značka přes dráhu a „min. N“ jako tmavá pilulka                                                                                                                                                     | platí                                                                     | Capacity bar                                  |
| 4   | **Okamžik „Máš místo“**: když tvé přihlášení naplní minimum, šrafa se změní na plnou výplň a „Díky tobě se akce koná“                                                                                                                  | platí                                                                     | A-05c                                         |
| 5   | **„Kdo jde“**: jména vidí organizátor, schválený účastník a u akce skupiny členové; ostatní jednu větu, kdy jména uvidí (#174)                                                                                                         | platí                                                                     | A-05, A-05c, A-05g                            |
| 6   | **Hlas aplikace** (níže)                                                                                                                                                                                                               | platí, rozšířeno                                                          | celá aplikace, DESIGN.md › Copy               |
| 7   | **Úvodní stránka**: panel „Teď chybí jeden“, sekce podle #182, „Jak to funguje“ (výraznější, zůstává), výzva „Nic pro tebe?“                                                                                                           | změněno 4. 11. – viz [úvodní stránka](#úvodní-stránka)                    | A-01, A-01d, A-01p, A-01pd                    |
| 8   | „Založit akci“ jako tichý odkaz na `/akce` vedle počtu akcí                                                                                                                                                                            | **zrušeno**: jen v Moje akce a v prázdném stavu `/akce`; nikdy v hlavičce | C-01, C-02, A-02 (popis)                      |
| 9   | **Plná akce** má pod „Plno“ odkaz „Podobné akce v okolí“                                                                                                                                                                               | platí; „Plno“ je obrysové tlačítko kvůli kontrastu                        | A-05 · Stavy tlačítka                         |
| 10  | **Prázdný seznam skupin** nabízí rozšířit hledání a „Založit skupinu“                                                                                                                                                                  | platí                                                                     | A-07e, A-07ed                                 |
| 11  | **Plovoucí „Založit akci“** v Moje akce nezakrývá poslední kartu                                                                                                                                                                       | platí                                                                     | C-01, C-02                                    |
| 12  | **Štítky** „Jdu“, „Čeká na schválení“, „Proběhlo“                                                                                                                                                                                      | platí                                                                     | Status badge                                  |
| 13  | **Logo jako příběh**: prázdná tečka se doplní, když se přihlásíš – ten chybějící jsi ty                                                                                                                                                | platí; motiv loga je teď i v pásu                                         | Logo/Mark/Plná parta; A-05c, X-01             |
| 14  | **„Máš místo“ jako vlastní blok** (secondary s obrysem, akcentový pruh, logo s plnou partou)                                                                                                                                           | platí                                                                     | Máš místo                                     |
| 15  | **„Sešlo se N lidí“** u proběhlých akcí                                                                                                                                                                                                | platí                                                                     | A-02h, A-05h, Karta akce/Proběhlá řádek       |
| 16  | Náhled sdíleného odkazu (og:image)                                                                                                                                                                                                     | mimo sprint 3, #102                                                       | A-05s                                         |
| 17  | **Naléhavost v panelu „Teď chybí jeden“**: „za 2 dny“ a věta s čísly                                                                                                                                                                   | platí                                                                     | A-01, A-01d, A-01p, A-01pd                    |
| 18  | **Moje akce › Přihlášen**: u akce pod minimem „chybí N“                                                                                                                                                                                | platí                                                                     | C-01                                          |
| 19  | **E-mail „Koná se“** organizátorovi i schváleným účastníkům                                                                                                                                                                            | platí (PO 4. 11.: oběma)                                                  | E-01 · Texty upozornění, typ 9                |
| 20  | **Tmavě zelený pás s motivem loga** na každé hlavní stránce; desktop: velké logo vychází zespodu, mobil: znak před nadpisem                                                                                                            | nové (1.–2. 11.)                                                          | všechny obrazovky                             |
| 21  | **Fotky aktivit** na kartách a v detailu, datová dlaždice přes fotku; karta bez fotky aktivity ukáže dlaždici kategorie                                                                                                                | nové (1. 11.)                                                             | Karta akce/Foto, Karta akce/Foto řádek        |
| 22  | **Rychlé výběry jako záložky s počty** v pásu `/akce` (Všechny akce, Tady chybíš, Tento víkend, Podle tvých zájmů, Kousek od tebe, Od dobře hodnocených); „Zrušit vše“ jen při ručně změněném filtru                                   | nové (2. 11.)                                                             | Tab/Rychlý výběr; A-02, A-02d                 |
| 23  | **Zvýrazňovač** pod klíčovým slovem nadpisu sekce (světlý režim), limetkové slovo v tmavém                                                                                                                                             | nové (2. 11.)                                                             | úvodní stránka                                |
| 24  | **Špendlíky varianta B**: nevybrané stejně velké, stav jen barvou; vybraný větší s prstencem a štítkem; shluk s limetkovým prstencem, když obsahuje akci, kde chybí lidé. Proběhlé akce na mapě jen s filtrem Proběhlé                 | nové (3. 11.)                                                             | Map pin, Map cluster; A-02d, A-03ad           |
| 25  | **Přepínač motivu** v hlavičce                                                                                                                                                                                                         | nové (2. 11.)                                                             | Header/App desktop                            |
| 26  | **Řazení** „Nejbližší termín“ / „Nejmenší vzdálenost“ (od středu zvolené lokality, ne pro celé Česko); hledání podle názvu i klíčových slov aktivit („Hledat akci nebo aktivitu“)                                                      | nové (4. 11., #57)                                                        | A-02j, A-02jd, A-02gd                         |
| 27  | **„Všechny akce“** = výchozí lokalita bez okolí; když si okolí (+10/25/50 km) zapneš, zahrnou ho Všechny akce i ostatní záložky                                                                                                        | nové (4. 11., #55, #57)                                                   | A-02, A-02gd (popis)                          |
| 28  | **Hodnocení**: účastník hodnotí akci a organizátora zvlášť (C-03), organizátor účastníky – nejdřív „Všem stejně“ (hvězdičky a jeden komentář), pak jednotlivě (D-05); komponenta Hodnocení/Hvězdičky                                   | nové (PO 4. 11.)                                                          | C-03, C-03d, D-05, D-05d; Hodnocení/Hvězdičky |
| 29  | **Veřejný profil**: hodnocení jako organizátor, průměr jeho akcí, hodnocení jako účastník a historie pořádaných veřejných akcí s hodnocením; na detailu akce u organizátora jeho hodnocení                                             | nové (PO 4. 11.)                                                          | B-07, B-07d; A-05* (Pořádá)                   |
| 30  | **Přihlášení jen s ověřeným e-mailem**: po registraci obrazovka „Ověř si e-mail“, přihlásí až odkaz z e-mailu; stav „přihlášený, neověřený“ v aplikaci není                                                                            | nové (PO 4. 11.)                                                          | B-01a, B-01ad; A-05 · Stavy, A-08 · Stavy     |
| 31  | **Akce jen pro členy, otevřená nečlenem**: stránka s cestou do skupiny (API 403 s údaji o skupině, ne 404); bez času, místa a fotky akce                                                                                               | nové (4. 11.)                                                             | A-05i                                         |
| 32  | **Kontrast všude**: text 4,5:1, každý negrafický prvek a hrana plochy 3:1 v obou režimech; zelené plochy s obrysem `tile-border`, limetka na světlé ploše s `primary-edge`                                                             | nové (2.–4. 11.)                                                          | celý design system                            |

## Úvodní stránka

Rozhodnutí PO ze 4. 11. a pravidla týmu:

- **Sekce pro návštěvníka:** panel „Teď chybí jeden“ → Tady chybíš → Jak to funguje → Tento víkend → Kousek od tebe → O tyhle akce je zájem → Od dobře hodnocených organizátorů → **Tyhle skupiny rozšiřují partu** → Nic pro tebe?
- **Přihlášený:** panel „Teď chybí jeden · z tvých zájmů“, rychlé výběry (Tady chybíš, Tento víkend, Podle tvých zájmů, Od dobře hodnocených…), skupiny, výzva.
- **Akce se ukáže jen v první sekci, kam patří**; panel nahoře je první (tým 4. 11.).
- **Akce jen pro členy na úvodní stránce nikdy nejsou.** Místo akcí skupin je sekce **„Tyhle skupiny rozšiřují partu“** (PO 4. 11.): aktivní skupiny v okolí, které se potkávají (mají nadcházející akci) a dá se do nich přidat (veřejné) nebo požádat o členství (neveřejné); řazené podle nejbližší akce skupiny.
- **„Od dobře hodnocených“** = organizátor nebo skupina s průměrem aspoň 4,5 z nejméně 3 hodnocení. U akcí skupin se hodnocení organizátora počítá skupině. Hodnocení smazaná superadminem a hodnocení akcí, které admin skryl nebo smazal, se nepočítají.
- **„Podle tvých zájmů“**: podle akcí, na kterých uživatel byl, nebo zájmů v profilu; když nemá ani jedno, náhodný výběr. Návštěvník tuhle sekci nemá.

## Hodnocení (PO 4. 11.)

- Akce se hodnotí zvlášť a zvlášť organizátor (účastník) nebo účastník (organizátor).
- **Rychlé hodnocení organizátora:** „Všem stejně“ – hvězdičky (výchozí 5) a jeden komentář, „Použít pro všechny“ je předvyplní; pak jednotlivcům dá individuální hodnocení – změní hvězdičky i komentář. Uloží se najednou. Kdo individuální komentář nedostane, má u svého hodnocení ten společný. Figma D-05 zatím ukazuje u jednotlivce jen hvězdičky – doplnit pole pro komentář. `ParticipantRating.comment` je na `main` od #180 (#239).
- Hodnotit jde jen po skončení akce a do 14 dnů, do té doby jde hodnocení změnit. Hvězdičky 1–5 povinné, komentář nepovinný. Organizátor nehodnotí sám sebe. Smazané superadminem jde jen vrátit, ne dát znovu.
- **Průměr** se ukazuje od prvního hodnocení i s počtem („★ 4,5 (6 hodnocení)“), bez hodnocení „zatím bez hodnocení“.
- **Veřejný profil:** hodnocení jako organizátor, průměr jeho akcí, hodnocení jako účastník a historie pořádaných veřejných akcí, u každé počet lidí a průměr hodnocení akce. Akce skupin se počítají skupině a v historii osoby nejsou.
- **Vstupy:** e-maily „Ohodnoť akci“ a „Ohodnoť účastníky“ (E-01 typy 11 a 12, večer po akci, B-043), karta „Ohodnotit“ v profilu › Proběhlé, tlačítko „Ohodnotit akci“ na detailu proběhlé akce (A-05h, jen schválený účastník). Obě obrazovky mají adresu `/akce/:id/hodnoceni`, obsah podle role.
- Dávání hodnocení (#66) jde do sprintu 3, když zbude čas; design je hotový.

## Hlas aplikace

Pravidla: tykání, bez rodu (aplikace pohlaví nezná – ani „organizátorka“), krátce a vždy s dalším krokem, čísla místo slov, osobní pojmenování výběrů.

| Kde                                 | Text                                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Úvod – nadpis (návštěvník)          | Někde chybí jeden do party. Třeba ty.                                                                                 |
| Úvod – nadpis (přihlášený)          | {Jméno}, tady se na tebe čeká.                                                                                        |
| Úvod – podnadpis                    | Volejbal, deskovky, běh… Najdi akci ve svém okolí, nebo založ vlastní a lidi se přidají.                              |
| Úvod – panel „Teď chybí jeden“      | 5 z 10 už jde, do minima chybí 1. Přijď a hraje se. · Doplnit partu                                                   |
| Úvod – panel bez akcí               | Všechny akce v okolí mají svoje minimum. Mrkni, kde jsou ještě volná místa.                                           |
| Úvod – sekce skupin                 | Tyhle skupiny rozšiřují partu · Pravidelně se potkávají a hledají nové členy                                          |
| Úvod – výzva dole                   | Nic pro tebe? Založ vlastní akci a lidi se přidají.                                                                   |
| Úvod – žádné akce v okolí           | V okolí teď nic není. Buď první – založ akci a dej o ní vědět.                                                        |
| Detail po přihlášení                | Máš místo. Parta je o jednoho větší. (+ „Díky tobě se akce koná…“ jen když minimum naplnilo právě tvoje přihlášení)   |
| Detail, žádost čeká                 | Až ji organizátor schválí, přijde ti e-mail.                                                                          |
| Detail, žádost zamítnutá            | Tentokrát to nevyšlo. Na tuhle akci tě organizátor nepřijal. Mrkni na podobné akce v okolí.                           |
| Detail, proběhlá akce               | Sešlo se 8 lidí. Podobné akce najdeš v Akcích.                                                                        |
| Detail, akce jen pro členy (nečlen) | Tuhle akci pořádá skupina … pro své členy. Přidej se ke skupině a uvidíš ji se všemi údaji.                           |
| Detail – organizátor                | Organizátor · ★ 4,5 (6 hodnocení) / Organizátor · zatím bez hodnocení                                                 |
| Registrace hotová                   | Zkontroluj e-mail · Poslali jsme ti odkaz na {e-mail}. Klikni na něj do 24 hodin a rovnou tě přihlásíme.              |
| Moje akce › Přihlášen, prázdno      | Zatím nejdeš na žádnou akci. Mrkni, komu v okolí chybí lidé.                                                          |
| Moje akce › Pořádám, prázdno        | Zatím nepořádáš žádnou akci. Stačí název, místo a čas – parta se sejde.                                               |
| Moje skupiny, prázdno               | Zatím nejsi v žádné skupině. Najdi partu, se kterou se budete potkávat pravidelně.                                    |
| Hodnocení – účastník                | Jak se akce povedla? · Jak hodnotíš organizátora?                                                                     |
| Hodnocení – organizátor             | Všem stejně · Vyber hvězdičky a napiš jeden komentář pro všechny. Kdo si zaslouží jiné hodnocení, tomu ho níž změníš. |

E-maily (předmět, text, tlačítko) pro všech 12 typů jsou ve Figmě v „E-01 · Texty upozornění“: schválení, zamítnutí, změna akce, zrušení, nová žádost, odhlášení, zpráva od organizátora, oznámení ve skupině, Koná se, **deaktivace skupiny** (všem aktivním členům kromě správce, který deaktivoval; přihlášení na zrušené veřejné akce skupiny dostanou e-mail o zrušení), **Ohodnoť akci** a **Ohodnoť účastníky**. Upozornění v aplikaci (zvonek) jsou mimo MVP.

## Kontrast a tmavý režim

- Text aspoň 4,5:1, velký text 3:1, **každý negrafický prvek a hrana plochy aspoň 3:1** vůči okolí – ikony, štítky, dráha pruhu, špendlíky, hvězdičky, oddělovače, okraj dlaždice, karty, obrysového tlačítka, dialogu i spodního panelu nad překryvem. Bez výjimek „vypadá to dobře“ (tým 2.–3. 11.).
- Nové tokeny kvůli kontrastu: `tile-border`, `primary-edge`, `control-border`, `card-border`, `badge-neutral`, `capacity-fill` (ve světlém režimu tmavě zelená – limetka na béžové dráze má 1,03:1), `band-edge`.
- **Kontrola 4. 11.:** automatický audit všech obrazovek (světlý i tmavý režim) – text, okraje a plochy. Opraveno: přepsané barvy radio karet (36 instancí), okraj dialogu v tmavém režimu, překryv pod spodními panely, neaktivní „Plno“, zástupné pole bez fotky, rámečky v e-mailech. Poté bez nálezů (mimo dekorativní plochy mapy).

## Nálezy

| #   | Nález                                                                           | Dopad                     | Řešení                                          |
| --- | ------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------- |
| N1  | Seznam akcí je monotónní, karty se od sebe neliší                               | Vysoký                    | Rozhodnutí 1, 21                                |
| N2  | Značka se mimo logo neprojevuje                                                 | Vysoký                    | Rozhodnutí 2–4, 13, 20, 23                      |
| N3  | „Volná místa 12/20“ = 12 přihlášených, ne volných                               | Vysoký (11 testerů, #189) | Rozhodnutí 1                                    |
| N4  | „Založit akci“ organizátor nenajde                                              | Vysoký (36 testerů)       | Rozhodnutí 8, 11                                |
| N5  | Minimum na detailu je málo vidět                                                | Střední                   | Rozhodnutí 3                                    |
| N6  | Prázdné stavy jsou suché nebo slepé uličky                                      | Střední                   | Rozhodnutí 6, 9, 10                             |
| N7  | Úvod neříká, proč by to mělo člověka zajímat                                    | Střední                   | Rozhodnutí 7, [úvodní stránka](#úvodní-stránka) |
| N8  | Hrany světle zelených ploch, limetky a obrysových prvků nemají 3:1              | Střední                   | Rozhodnutí 32                                   |
| N9  | Odkaz zpět na detailu nové akce má popisek „Akce“, ale vede do Moje akce (#187) | Nízký                     | Popisek podle cíle, #195                        |
| N10 | Rodové tvary v textech („organizátorka“) – aplikace pohlaví nezná               | Nízký                     | DESIGN.md › Copy                                |

## Review 4. 11.

Kontrola celé Figmy proti GitHubu (zápisy, BACKLOG, mergnuté PR, bezpečnostní audit). Opravené rozpory:

- Úvodní stránka ukazovala návštěvníkovi akci jen pro členy → nahrazena, akce skupin na úvodu nahradila sekce skupin.
- Akce jen pro členy měla víc účastníků než skupina členů a člen s místem neviděl jména → opraveno (8 z 8, jména).
- A-05i na mobilu ukazovalo čas, fotku a razítko akce, kterou nečlen nemá vidět → odstraněno; texty mobil × desktop sjednocené.
- Stavy „přihlášený, neověřený e-mail“ (A-05, A-08) po rozhodnutí PO o přihlášení jen s ověřeným e-mailem → odstraněny, nová obrazovka B-01a; řeší i nález S-5 bezpečnostního auditu.
- Název akce „Volejbal na Pankráci – chybí jeden“ sjednocen podle testovacích dat; D-01d popis aktivní položky hlavičky; zbylé „potvrdit s PO“ uzavřené (tým rozhoduje sám).
- Popisy obrazovek na stránkách Účet, Moje akce a Skupiny byly uvnitř rámce obrazovky → samostatné rámce „Popis obrazovky – …“ jako na ostatních stránkách.

## Figma – obrazovky

Každá obrazovka je ve světlém i tmavém režimu, na mobilu i desktopu, s popisem nad sebou.

| Obrazovka                                                    | Mobil                  | Desktop                     | Issue                  |
| ------------------------------------------------------------ | ---------------------- | --------------------------- | ---------------------- |
| Úvodní stránka – návštěvník / přihlášený                     | A-01, A-01p            | A-01d, A-01pd               | #173, #182             |
| Akce – seznam a mapa, rychlé výběry                          | A-02                   | A-02d                       | #55, #56, #57          |
| Akce – celé Česko (poloha neznámá)                           | A-02 · celé Česko      | A-02d · celé Česko          | #55                    |
| Filtry: typ aktivity, termín, obsazenost, lokalita s okolím  | A-02a–c, A-02f, A-02g  | A-02d · Filtr, A-02gd       | #57                    |
| Řazení                                                       | A-02j                  | A-02jd                      | #57                    |
| Náhled akce na mapě                                          | A-03a                  | A-03ad                      | #56                    |
| Proběhlé akce                                                | A-02h                  | A-02hd                      | #61                    |
| Detail akce, stavy tlačítka, Máš místo, žádost, odhlášení    | A-05, A-05a–c          | A-05d, A-05ad–bd, A-05c     | #173, #174, #175, #176 |
| Detail akce skupiny / jen pro členy (nečlen)                 | A-05g, A-05i           | A-05gd, A-05i               | #70                    |
| Detail proběhlé akce                                         | A-05h                  | A-05h                       | #61, #66               |
| Registrace, Ověř si e-mail, e-mail ověřen, přihlášení, heslo | B-01, B-01a, B-02–B-04 | B-01d, B-01ad, B-02d, B-03d | #153, #154, #165       |
| Můj profil, upravit profil, veřejný profil                   | B-05, B-06, B-07       | B-05d, B-06d, B-07d         | #178, #179             |
| E-maily a texty upozornění                                   | E-01                   |                             | #176, #177, #194       |
| Moje akce, založení a úprava akce, zrušení, správa, zprávy   | C-01, C-02, D-01–D-04  | C-01d, C-02d, D-01d–D-04d   | #44, #176              |
| **Ohodnotit akci** (účastník)                                | C-03                   | C-03d                       | #66                    |
| **Ohodnotit účastníky** (organizátor)                        | D-05                   | D-05d                       | #66                    |
| Skupiny, stránka skupiny, členství, správa, deaktivace       | A-07, A-08, D-06–D-08  | A-07d, A-08d, D-06d–D-08d   | #70, #175, #194        |
| Načítání aplikace, náhled odkazu                             | X-01, A-05s            |                             | #173, #102             |

## Co jde do kódu

| Co                                                                                                                                                                    | Kam                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Tokeny nového brandu do `global.css` (tabulka v DESIGN.md), test kontrastů v `tokens.test.ts`, odstranit nepoužívané                                                  | #195                     |
| Komponenty: pás s motivem loga, karty s fotkou a datovou dlaždicí, pruh obsazenosti, štítky, razítko, Máš místo, špendlíky, rychlé výběry, hvězdičky, přepínač motivu | #195                     |
| Přestavba obrazovek podle Figmy, texty podle Hlasu aplikace                                                                                                           | #195                     |
| Úvodní stránka: sekce, pravidla, sekce skupin                                                                                                                         | #182                     |
| Řazení podle vzdálenosti, hledání podle klíčových slov, okolí ve Všech akcích                                                                                         | #57                      |
| Přihlášení jen s ověřeným e-mailem (`requireEmailVerification`, obrazovka B-01a; demo účet Eva zůstává neověřený a ukazuje B-01a)                                     | nové issue (B-011)       |
| Akce jen pro členy pro nečlena: 403 s údaji o skupině místo 404                                                                                                       | #70 (B-026)              |
| Hodnocení: `ParticipantRating.comment`, průměr skupiny, pravidla pro skrytá a smazaná hodnocení, profil podle PO                                                      | #66, #179 (B-060, B-013) |
| E-maily typ 10–12 (deaktivace skupiny, výzvy k hodnocení)                                                                                                             | #177, B-043              |

## Mimo sprint 3

- Náhled sdíleného odkazu (A-05s) – #102.
- Záložka „Proběhlé“ v Moje akce – zatím ne, proběhlé jsou ve filtru `/akce` a v profilu.
- Upozornění v aplikaci (zvonek) – mimo MVP, jen e-maily.
- Vylepšení z tohoto auditu, která se do sprintu nevejdou, jdou do backlogu (PO 4. 11.: hlavní věci opravit, méně kritické později).
