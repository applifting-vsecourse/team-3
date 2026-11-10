# HobbyHub – zápis z planningu sprintu 4

**Kdy:** 10. 11. 2026, 26 minut, online (standup s PO) · **Kdo:** Jan Černý (product owner), Martin Bartoň, Eliška Hřebíčková, Adéla Mitrová · **Sprint 4:** 10. 11. – 24. 11. 2026 · **Téma:** zpětná vazba ke sprintu 3 a planning sprintu 4

Zápis vychází z automatického přepisu nahrávky (neověřený poslechem) a z poznámek týmu. Rozlišuje, odkud věc je: **PO** = řekl nebo odsouhlasil product owner na standupu, **tým** = doplnil tým po standupu (potvrdí PO na refinementu 16. 11.).

## Cíl sprintu 4

Dotáhnout, co je rozdělané ze sprintu 3, a přidat čtyři velké funkce (PO):

> **dodělávky ze sprintu 3** → **onboarding** po registraci → **hodnocení** → **notifikace** (centrum v aplikaci + e-maily) → **přátelé**.

Akce a skupiny mají fungovat „křížem krážem“: kdo si něco založí, může to s vlastním obsahem spravovat a všechno dává smysl uživateli, který aplikaci vidí poprvé (PO).

## Zpětná vazba PO ke sprintu 3

- **Kvalita (PO):** celkově dobré, design hodně pomohl, ale zůstávají UX nedodělávky (text splývá s pozadím, špatně čitelné texty). Máme roli QA, takové věci si máme odchytávat sami dřív, než je uvidí PO.
- **Tmavý režim (PO):** vynechat, nevypadá dobře a ladit dva režimy nemá smysl. Děláme jen světlý režim a v něm dořešit kontrast (některá písmena splývají s designem).
- **Prázdný výpis akcí (PO):** po registraci PO viděl „žádné akce“, protože aplikace odhadla lokalitu Police nad Metují (jeho poloha je jiná). Ověřit odhad lokality a místo prázdného výpisu ukázat nejbližší místo, kde se něco děje, aby první dojem nebyl „nic tu není“.
- **Mapa (PO):** při hodně oddálené mapě klepnutí na body nic nedělá, dokud uživatel mapu nepřiblíží. Promyslet výchozí přiblížení (např. rovnou na lokalitu) nebo chování shluků.
- **Filtr Obsazenost (PO):** rozdíl mezi „Volná místa“ a „Chybí lidé“ uživatel bez vysvětlení nepozná a hledajícího nezajímá, jestli je naplněné minimum. Filtr v této podobě nedává smysl, kriticky přehodnotit (Q9).
- **Formulář akce (PO):** není jasný rozdíl mezi lokalitou a adresou (mohou být dvě různá místa). Po umístění špendlíku se nepředvyplní adresa a naopak.
- **Obrázek akce (PO):** uživatel si má moct dát vlastní obrázek, jinak se předvyplní obrázek aktivity. Tým: úprava vlastní fotky je v návrhu na tabuli.
- **Zrušení akce (PO):** zrušení a zpráva účastníkům jsou v pořádku; že zrušení nejde vrátit, nevadí.
- **Moje sekce (PO):** v „Moje“ chce vidět akce i skupiny, ne jen akce.
- **Přihlášení e-mailem (PO):** PO se po ověření e-mailu nepřihlásil e-mailem a heslem (přes Google ano). Ověřit, jestli je chyba v aplikaci. E-maily mu chodí do spamu.
- **GitHub (PO):** PO má k projektu jen náhled, nemůže přesouvat karty na boardu. Potřebuje přístup do organizace.
- **Sprint Review (PO):** ukazovat funkce storytellingem na připravených use casech („uživatel založí akci, pak se stane…“) a na GitHubu ukázat hlavní funkce, jak jsme je nadefinovali a jak jsme je udělali.

## Scope sprintu 4

| Oblast                 | Co bereme                                                                                                                                           | Zdroj      | Issue                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| Dodělávky ze sprintu 3 | Rozdělané stories a bugy ze sprintu 3, PO je ještě proklikává a případně založí další                                                               | PO         | #61, #165, #272                                                              |
|                        | Otevřené bugy a drobnosti                                                                                                                           | tým        | #184, #192, #197, #198, #199, #200, #202, #242, #266, #281, #288, #289, #291 |
|                        | Zbylé nálezy bezpečnostního auditu (nízká priorita)                                                                                                 | tým        | #224, #226, #228, #230                                                       |
| Onboarding             | Po registraci krokový průvodce: domovská lokalita, zájmy, případně další údaje; po dokončení se ukážou akce podle nastavení                         | PO         | nové (B-013, Figma B-08)                                                     |
| Hodnocení              | Dotáhnout dávání hodnocení: účastník hodnotí akci a organizátora, organizátor hodnotí účastníka (datový model je hotový z #180)                     | PO         | #66                                                                          |
| Notifikace             | Notifikační centrum v aplikaci: krátká zpráva („Na tvou akci se přihlásil…“), proklik na detail                                                     | PO         | #86                                                                          |
|                        | E-mailové notifikace (např. někdo se přihlásil na akci, akce byla zrušena); tým navrhne, které notifikace a jak je psát                             | PO         | #177, #65                                                                    |
| Přátelé                | Na veřejném profilu tlačítko „Přidat do přátel“, žádost přijde jako notifikace, sekce lidí, které znám; u přátel vidím, kam chodí                   | PO         | nové (B-014)                                                                 |
| Akce dotáhnout         | Vlastní obrázek akce (jinak obrázek aktivity)                                                                                                       | PO         | #77                                                                          |
|                        | Sjednotit lokalitu a adresu; špendlík předvyplní adresu a adresa posune špendlík                                                                    | PO         | nové                                                                         |
|                        | Proběhlé a zrušené akce (souvisí s hodnocením)                                                                                                      | tým        | #61, #272                                                                    |
| Skupiny dotáhnout      | Projít celý tok skupin, „Moje“ ukazuje akce i skupiny                                                                                               | PO         | #118                                                                         |
| Obsazenost             | Přehodnotit filtr Obsazenost a texty obsazenosti z pohledu hledajícího                                                                              | PO         | nové (Q9)                                                                    |
| Světlý režim           | Tmavý režim vypnout, ve světlém opravit kontrast textů                                                                                              | PO         | nové; #201 už není potřeba                                                   |
| První dojem a mapa     | Ověřit odhad lokality, při prázdném výpisu ukázat nejbližší akce; výchozí přiblížení mapy a klepnutí na body při oddálení                           | PO         | nové (#55, #56)                                                              |
| Přihlášení e-mailem    | Ověřit přihlášení e-mailem a heslem po ověření e-mailu                                                                                              | PO         | nové (bug)                                                                   |
| Superadmin (bonus)     | První nástřel role superadmina: upravit nebo deaktivovat jakoukoli akci; blokace uživatelů a správa superadminů později. Bereme, jen když zbude čas | tým, PO OK | #71 (B-062, B-063)                                                           |

## Rozhodnutí

- **Tmavý režim (PO):** vynecháváme, aplikace má jen světlý režim. Mění pravidlo „Every screen must work in both modes“ v DESIGN.md.
- **Filtr Obsazenost (PO):** v současné podobě nedává hledajícímu smysl. Tým navrhne jednodušší řešení (odpověď na Q9).
- **Obrázky (PO):** uživatel si nahraje vlastní obrázek akce. Mění Q3 („V MVP jen URL obrázku“).
- **Zrušení akce (PO):** zrušená akce nejde vrátit, je to v pořádku (Q11).
- **Notifikace (PO):** centrum v aplikaci i e-maily, zpráva v centru je krátká a vede na detail. Mění „Mimo MVP: upozornění v aplikaci (zvonek)“ v BACKLOG.md.
- **Přátelé (PO):** nová sekce, aplikace má lidi i propojovat. Veřejný profil ukazuje méně, osobní profil a přátelé víc (navazuje na B-014).
- **Superadmin (PO):** můžeme začít už teď jako bonus, funkce budou přibývat.

## Pořadí ve sprintu (tým)

Doplní tým po refinementu 16. 11. a označí issues štítky P1 až P3.

## Mimo scope sprintu 4

| Co                                                            | Proč                                  |
| ------------------------------------------------------------- | ------------------------------------- |
| Tmavý režim                                                   | PO: vynechat                          |
| Blokace uživatelů a správa superadminů                        | PO: zatím neděláme, jen první nástřel |
| Náhradníci (#79), opakované akce (#76), soukromé zprávy (#85) | Na standupu nezazněly                 |

## Dohody (PO)

- Bugy ze sprintu 3 klidně dodělat; PO aplikaci ještě proklikává a případné chyby založí nebo napíše týmu.
- Stories, které považujeme za hotové, dáme do sloupce **Done**. PO je zkontroluje a přesune do **Accepted by PO**, nebo story vrátí.
- Místo pondělní hodiny bude **refinement**: hlubší diskuze o hlavních funkcích do budoucna, aby se řešily koncepčně, ne lepením. Tým si předem připraví otázky, co není jasné a jak na sebe funkce navazují.

## Úkoly

| Úkol                                                                        | Kdo |
| --------------------------------------------------------------------------- | --- |
| Pustit PO do GitHub organizace s právy k boardu                             | Tým |
| Založit issues pro nové věci ze scope a zařadit je do sprintu 4             | Tým |
| Ověřit přihlášení e-mailem a heslem po ověření e-mailu                      | Tým |
| Připravit otázky na refinement (onboarding, notifikace, přátelé, hodnocení) | Tým |
| Navrhnout seznam notifikací a jejich texty                                  | Tým |
| Zajistit místnost nebo připojení na refinement                              | Tým |

## Další schůzka

Refinement s PO v pondělí 16. 11. 2026 v 16:15, 45 minut, online (PO se připojí, tým může sedět v učebně).
