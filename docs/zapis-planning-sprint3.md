# HobbyHub – zápis z planningu sprintu 3

**Kdy:** 28. 10. 2026, 16 minut, online (standup s PO) · **Kdo:** Jan Černý (product owner), Veronika Seyfriedová, Eliška Hřebíčková, Adéla Mitrová · **Sprint 3:** do 9. 11. 2026 · **Téma:** planning sprintu 3

Zápis rozlišuje, odkud věc je: **PO** = řekl nebo odsouhlasil product owner na standupu, **tým** = doplnil tým po standupu 28. 10. (potvrdí PO přes shrnutí v Teams).

## Cíl sprintu 3

Jdeme do šířky, ne do ladění jednotlivých funkcí (PO). Na konci sprintu má fungovat **celý životní cyklus akce** (PO):

> akci najdu na mapě → přihlásím se → organizátor mě schválí → před akcí mi organizátor napíše a přijde mi e-mail → jdu na akci → _(v dalším sprintu)_ akci ohodnotím.

Co nejdřív uděláme **bezpečnostní audit** a **UX audit** (PO).

## Scope sprintu 3

| Oblast                           | Co bereme                                                                                                                                                                                                    | Zdroj                         | Issue             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ----------------- |
| Bezpečnostní audit               | Aktualizace Node.js a balíčků kvůli zranitelnosti v Brotli, analýza kódu, audit; na prezentaci řekneme, co jsme našli a opravili                                                                             | PO                            | #172, #94         |
|                                  | Konkrétní verze Node (CVE-2026-111497), CSRF (#140), report v docs, průběžná kontrola v repu                                                                                                                 | tým                           |                   |
| UX audit                         | Víc brandu a „duše“, doladit; návrhy předem schválit s PO, pak implementovat, ne na poslední chvíli                                                                                                          | PO                            | #173              |
|                                  | Návrhy PO do Teams do pátku 30. 10.                                                                                                                                                                          | tým                           |                   |
| Mapa                             | Klepnutí na špendlík ukáže náhled (název, krátký popisek), detail až potom; shluky špendlíků a prokliky                                                                                                      | PO, Veronika                  | #56               |
|                                  | „Hledat v této oblasti“, hledání podle názvu i klíčových slov aktivit, řazení podle vzdálenosti, okolí +10 / 25 / 50 km                                                                                      | tým (plán ze sprintu 2, #167) | #56, #57          |
| Výchozí lokalita                 | Z profilu, bez profilu odhad podle IP, když selže, celé Česko; „Zrušit vše“ zruší i zvolenou lokalitu                                                                                                        | tým                           | #55               |
| Proběhlé akce                    | Filtr proběhlých akcí na `/akce`                                                                                                                                                                             | tým                           | #61               |
| Kdo jde na akci                  | Kdo není schválený účastník, vidí jen, jestli je plno a jestli se může přihlásit                                                                                                                             | PO                            | #174 (bug)        |
|                                  | U akce skupiny vidí jména i členové skupiny                                                                                                                                                                  | tým                           |                   |
| Zpráva k žádosti                 | Nepovinná zpráva k žádosti o účast na akci i o členství ve skupině                                                                                                                                           | Veronika, PO souhlasí         | #175              |
| Akce skupin                      | Propojit skupiny s akcemi (soukromé i veřejné akce skupiny); člen vidí, jaké akce skupina pořádala v minulosti                                                                                               | PO                            | #70               |
| Zprávy organizátora a upozornění | Organizátor pošle účastníkům zprávu, přijde e-mail / notifikace                                                                                                                                              | PO                            | #176, #177        |
|                                  | Zpráva je i na detailu akce; seznam upozornění (schválení, zamítnutí, změna, zrušení, nová žádost, odhlášení)                                                                                                | tým                           |                   |
| Můj profil                       | Základní informace, změna hesla, akce, které jsem pořádal, na kterých jsem byl a na které jsem přihlášený, moje skupiny, hodnocení, které jsem dostal, a kolik mám hvězdiček; hodnocení zatím jen z databáze | PO                            | #178 (z #64)      |
|                                  | Domovská lokalita, zájmy, změna e-mailu                                                                                                                                                                      | tým                           |                   |
| Veřejný profil                   | Jen základní informace: jméno a příjmení, případně průměrné hodnocení                                                                                                                                        | PO                            | #179 (z #64, #98) |
|                                  | Zájmy                                                                                                                                                                                                        | tým                           |                   |
| Testovací data                   | Verze dat, oblasti mimo Prahu                                                                                                                                                                                | Veronika                      | #181              |
|                                  | Víc proběhlých akcí, data pro nové funkce (hodnocení, akce skupin)                                                                                                                                           | tým                           |                   |
| Hodnocení v datovém modelu       | Hodnotit jde účastníka a akci (PO), dávání hodnocení je další sprint                                                                                                                                         | PO                            | #180              |
| Registrace                       | Skutečné ověřovací e-maily místo simulace, Google na stagingu, potvrzení 18+                                                                                                                                 | tým                           | #165, #154, #107  |
| Úvodní stránka                   | Další sekce akcí: v okolí, tento víkend, chybí lidé, podle mých zájmů, od dobře hodnocených organizátorů                                                                                                     | tým                           | #182              |
| Chyby z testu se 100 testery     | Jasné chyby z #167 jako bugy                                                                                                                                                                                 | tým                           | #183–#192         |

## Rozhodnutí

- **Hodnocení:** PO: „můžu hodnotit účastníka a můžu hodnotit ten event“ a v profilu vidím hodnocení, které jsem dostal. Tým: účastník hodnotí akci a organizátora (US-09), organizátor hodnotí účastníka. Dávat hodnocení PO navrhl až na další sprint, nebo jako dobrovolný bonus; **bonus ve sprintu 3 nebereme** (tým).
- **Veřejný profil:** PO: jen základní informace. Víc uvidí až propojení přátelé v budoucích sprintech. Tým: navíc zájmy; historii akcí a skupiny vidí jen uživatel sám; nastavení „kdo uvidí co“ až s přáteli.
- **Kdo jde (PO):** jména až pro schváleného účastníka, ostatní jen indikátory obsazenosti (inspirace u druhého týmu).
- **Výchozí lokalita (tým):** z profilu, bez profilu podle IP, jinak celé Česko. Nahrazuje „vždy Praha“ (#38, #170).
- **Organizátor na vlastní akci (tým):** se může přihlásit, platí Q12.

## Mimo scope sprintu 3

| Co                                                                                                                                       | Proč                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Náhradníci (#79)                                                                                                                         | PO: dobrý nápad, ale teď jdeme do šířky |
| Dávání hodnocení (#66)                                                                                                                   | PO: další sprint (bonus jsme nevzali)   |
| Přátelství a víc údajů ve veřejném profilu                                                                                               | PO: budoucí sprinty                     |
| Nastavení viditelnosti, fotka a bio, export a smazání účtu (#64)                                                                         | Tým: s přátelstvím / backlog            |
| Odebrání a blokace člena (#63), další správci (#62, #100), odebrání účastníka a hromadné schválení (#60), plánované e-maily (B-043, #65) | Na standupu nezazněly                   |

## Dohody (PO)

- Seznam domluveného pošleme PO do Teams a dáme ho na GitHub jako stories ve sprintu 3. Až tam budou, dáme PO vědět a schválí je.
- Stories, které považujeme za hotové, dáme do sloupce **Done**. PO je zkontroluje a přesune do **Accepted by PO**, nebo story vrátí, případně založí bug do dalšího sprintu.
- UX audit i bezpečnostní audit uděláme relativně brzo.

## Úkoly

| Úkol                                                    | Kdo             |
| ------------------------------------------------------- | --------------- |
| Poslat informace / článek k zranitelnosti v Brotli      | Jan Černý       |
| Poslat PO seznam domluveného do Teams                   | Tým             |
| Založit stories sprintu 3 na GitHubu a dát PO vědět     | Tým             |
| Poslat pozvánku na standup út 3. 11. 15:00–15:30        | Tým (Adéla)     |
| Poslat PO návrhy z UX auditu                            | Tým, do 30. 10. |
| Požádat o zadání klíčů pro e-maily a Google na stagingu | Tým             |

## Další schůzka

Standup s PO v úterý 3. 11. 15:00–15:30 (inovační týden).
