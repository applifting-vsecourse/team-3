# HobbyHub – zápis z planningu sprintu 5

**Kdy:** 25. 11. 2026 · **Sprint 5:** 24. 11. – 7. 12. 2026, předposlední sprint

## Cíl sprintu 5

Nové funkce pro objevování akcí a hledání lidí, první verze monetizace a nahlašování pro superadmina. Stejnou váhu má kvalita: opravit chyby z minulých sprintů a projít aplikaci z produktového pohledu (PO).

## Shrnutí pro PO

- **Oblíbené akce:** uložení akce jako záložky.
- **Podobné akce:** na detailu akce.
- **Najdi parťáka:** lidé v okolí s podobnými aktivitami, procházení swipem ve stylu Tinderu.
- **Přezdívka a celé jméno:** veřejně jen přezdívka.
- **Monetizace:** tarify, paywall a simulovaná platba kartou. Za paywall navrhujeme akce jen pro členy skupiny, hledání parťáka, propagaci a topování akce.
- **Superadmin:** nahlašování uživatelů a akcí.

## Scope sprintu 5

**Funkce**

- Oblíbené akce (#80), podobné akce (#351)
- Najdi parťáka, swipe; pokrývá i návrhy přátel (#84, #347)
- Přezdívka a celé jméno (#346)
- Monetizace a topování (#354, #69, #104)
- Superadmin: nahlašování, reporting, sekce Správa a blokace uživatelů (#67, #71, #353, #440)
- Odebrání a blokace člena skupiny (#63)
- Plánované e-maily před akcí s odkazem Topovat (#405)
- Pozvánka od kamaráda (#406) a pozvánka do skupiny (#352)
- Lišta filtrů na /akce (#349), skupiny podle místa (#81)
- Hodnocení v modálním okně, když zbude čas (#350, #332)

**Kvalita**

- Bugfixing z minulých sprintů (#455) a opravy výtek PO (níže)
- Použitelnost na mobilu (#95): každá změna se ověřuje na telefonu i desktopu
- Produktová revize – Adéla (#456)
- QA – Martin a Eliška (#457)
- Revize Figmy – Veronika (#458)
- Dokumentace (#459), demo data (#460)
- Test hlavního toku přes API v CI, část smoke testu z #50 (#467, tým 27. 11.)

## Výtky PO ke sprintu 4

PO hodnotil sprint 4 26. 11., den po planningu. Kvůli množství chyb aplikaci přestal kontrolovat a čeká, že zapracujeme všechny připomínky, sami projdeme mobilní verzi a chyby budeme hledat dřív než on.

| Výtka                                                                | Issue | PR   |
| -------------------------------------------------------------------- | ----- | ---- |
| Superadmin nemá sekci v menu a nemůže blokovat uživatele             | #440  | #441 |
| Superadmin nevidí deaktivaci akce                                    | #461  |      |
| Akce skupiny nejde založit ze správy skupiny ani zvolit ve formuláři | #438  | #439 |
| Ze seznamu akcí zmizelo „Založit akci“                               | #420  | #421 |
| Trvalý banner „Máš místo“ místo krátkého potvrzení                   | #422  | #423 |
| Mapa na detailu je malá a nejde posunout                             | #373  | #416 |
| Horní lišta na telefonu poskakuje a mizí                             | #447  | #448 |
| Upozornění na žádost o přátelství zůstává po vyřízení                | #430  | #431 |
| Moje › Proběhlé bez věty pod nadpisem                                | #426  | #427 |
| Tlačítka „Jste přátelé“ a „Odebrat z přátel“                         | #428  | #429 |
| Hodnocení v profilu jako „4 z 5“ místo hvězdiček                     | #414  | #415 |
| Kdy a jak hodnotit, organizátor hodnotí jen ze správy                | #434  | #435 |
| Hvězdičky, komentář a jeho uložení                                   | #369  | #444 |
| Text příliš blízko tlačítka (onboarding)                             | #296  | #408 |
| Limetková tlačítka na bílém                                          | #445  | #446 |
| Výběr zájmů v profilu jinak než v onboardingu                        | #418  | #419 |
| Lokalita a adresa jako dvě nezávislé hodnoty                         | #303  | #417 |
| Maximum účastníků povinné                                            | #424  | #425 |
| Toasty s tlačítky a na různých místech                               | #442  | #443 |
| Zbytečná mezistránka správy (nejdřív návrh ve Figmě)                 | #458  |      |
| Psaní účastníkům jen ze správy, nevýrazné zprávy organizátora        | #436  | #437 |
| Pořádaná akce po skončení chybí v Proběhlých                         | #436  | #437 |
| Po obdržení hodnocení nepřijde upozornění                            | #432  | #433 |

## Dohody (tým)

- **Review:** připomínka v review je tvrzení, ne příkaz. Kdo ji píše, uvede zdroj (kritérium issue, rozhodnutí PO, BACKLOG.md, DESIGN.md, Figma) a co se kvůli tomu pokazí uživateli, a podívá se, jak věc v aplikaci funguje teď. Popis issue nemusí být do detailu aktuální. Kdo ji zapracovává, ji nejdřív ověří proti stejným zdrojům a aplikaci, a když nesedí, odpoví v PR, místo aby ji slepě zapracoval. Pravidlo je v `AGENTS.md` › Reviews a v `docs/definition-of-ready-a-done.md`.

## MVP mimo scope sprintu 5

- Zbytek smoke testu (#50), monitoring, logy a zálohy (#51) – sprint 6
- Kontrola veřejného profilu a nepoužitých hodnot v modelu (#365)
- Bezpečnost a ochrana osobních údajů (#94)
- Jeden účet pro účast i pořádání (#75)
- Fotka, bio, viditelnost profilu a správa účtu, smazání účtu a export dat (#64, B-080)
- Další správci skupiny (#62, #100), profil skupiny s historií akcí (#98)
- Odebrání účastníka a hromadné schválení (#60)
- Cena, úroveň, vybavení a soukromé akce (#59)
