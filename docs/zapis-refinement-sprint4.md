# HobbyHub – zápis z refinementu (sprint 4)

**Kdy:** 16. 11. 2026, online s PO · **Téma:** hlubší diskuze o hlavních funkcích do budoucna (dohoda z [planningu sprintu 4](zapis-planning-sprint4.md#dohody))

Zápis vychází z poznámek týmu. Rozlišuje, odkud věc je: **PO** = řekl nebo odsouhlasil product owner, **tým** = doplnil tým po schůzce. Kritéria označená v issues jako [návrh] jsou návrh týmu, PO je potvrdí nebo změní.

Zápis má čtyři části: co jsme na refinementu probrali, rozhodnutí, jak jsme podle toho změnili backlog a proč, a návrhy týmu na další vylepšení.

## Ověřit hned (sprint 4)

| Co                                                                                                                                      | Zdroj | Issue                 |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------- |
| Funguje zapomenuté heslo? Ověřit na stagingu celý tok.                                                                                  | PO    | #345 (nové, P1)       |
| Po potvrzení registrace odkazem (tokenem) se uživatel rovnou přihlásí a pokračuje onboardingem. Bez ověření dál přihlášený není (#236). | PO    | #300 (doplněné), #301 |
| E-maily ve spamu není potřeba řešit.                                                                                                    | PO    | #302 (zavřené)        |

## Sprint 4 a Sprint Review

- **Onboarding (PO):** hezký, líbivý a osobní průvodce po první registraci. U každé aktivity ikonka, stačí za kategorii (kategorie ikonu v katalogu mají). Uživatel vyplní jen základ (lokalita, zájmy), zbytek může dodělat později v profilu. Kolik aktivit jde vybrat, rozhodne assignee. Doplněno do #296.
- **Přátelé (PO, tým):** základ zůstává ve sprintu 4 (#307): žádost o přátelství, seznam přátel v Můj profil, akce přátel. Návrhy přátel a propojování s dalšími lidmi jsou na další sprinty (#347).
- **Sprint Review 4 (PO):** interaktivní prezentace. Jeden ukazuje na mobilu, obraz se v reálném čase promítá na počítač, druhý zadává. Ukážeme registraci nového uživatele i s onboardingem; tým k tomu připraví příběh (flow). Příprava je samostatné issue, aby šla přidělit: #357.

## Backlog na další sprinty

| Oblast    | Co                                                                                                                                                                            | Zdroj   | Issue                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------ |
| Účet      | Jméno, příjmení a přezdívka. Přezdívku vidí všichni; celé jméno jen organizátor akce, na kterou se uživatel přihlásil, správce skupiny, ve které je, a přátelé (anonymizace). | PO      | #346 (nové)                          |
| Přátelé   | Ve svém profilu vidět přátele a propojit se s dalšími lidmi.                                                                                                                  | PO, tým | #307 (sprint 4), #347 (nové)         |
| Akce      | Typ aktivity na kartách a dlaždicích ve výpisu akcí.                                                                                                                          | PO      | #348 (nové)                          |
|           | Filtry: dva pásy vyřešit intuitivněji, horního pásu (záložky rychlého výběru) si člověk skoro nevšimne. Jak, zatím nevíme; předělat v kódu i ve Figmě.                        | PO      | #349 (nové)                          |
|           | **Příští sprint:** podobné akce („More events like this“) na detailu akce.                                                                                                    | PO      | #351 (nové)                          |
|           | **Příští sprint:** oblíbené akce (něco jako bookmark akce).                                                                                                                   | PO      | #80 (doplněné, priorita MVP)         |
| Hodnocení | Hodnocení v aplikaci můžou být v modálním okně.                                                                                                                               | PO      | #350 (nové), souvisí s #332          |
|           | Po akci přijde e-mail, že se akce konala, s výzvou k hodnocení.                                                                                                               | PO      | #65 (doplněné, zůstává ve sprintu 4) |
| Skupiny   | Veřejné a privátní akce: privátní akci vidí jen člen skupiny, veřejně vidět není. To už umí akce „jen pro členy“ (#70, hotové).                                               | PO, tým | #70                                  |
|           | U skupin chybí filtry, které jsou u akcí, i rychlé filtry (nabíráme / volné místo). Vymyslet, jak se i ve skupinách orientovat podle místa, případně s mapou.                 | PO      | #81 (doplněné)                       |
|           | Odkaz s pozvánkou do skupiny; kdo přijde přes pozvánku od správce, nemusí čekat na schválení.                                                                                 | PO      | #352 (nové)                          |
|           | Dát někomu roli správce, moct vyhodit člena skupiny.                                                                                                                          | PO      | #62, #63 (doplněné)                  |

## Rozšíření (možnost pro případné další sprinty)

| Co                                                                                                                                                                                                                                                                                    | Zdroj | Issue                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------- |
| Najdi parťáka: 10 lidí v dosahu s podobnými aktivitami, případně swipe. Není priorita.                                                                                                                                                                                                | PO    | #84 (doplněné)              |
| Superadmin: reporting. První nástřel superadmina je už ve sprintu 4 (#308), reporting až po něm.                                                                                                                                                                                      | PO    | #353 (nové)                 |
| Docházka (s otazníkem).                                                                                                                                                                                                                                                               | PO    | #68, #82                    |
| Monetizace, zatím jen návrh: funkce za paywallem, tarify (simulace), formulář pro platební kartu a animace zaplacení. Za paywall by šlo: tvorba privátních akcí ve skupinách, hledání parťáka, propagace akce (zobrazení relevantním uživatelům) a topování (vyšší pozice v seznamu). | PO    | #354 (nové), #69, #104, #84 |

## Rozhodnutí

- **Přihlášení po ověření (PO):** kliknutí na ověřovací odkaz uživatele rovnou přihlásí. Doplňuje B-011 a #236: bez ověření se uživatel dál nepřihlásí.
- **E-maily ve spamu (PO):** neřešíme, #302 zavřené jako not planned.
- **Privátní akce skupiny (PO):** privátní = vidí ji jen člen skupiny a veřejně vidět není. To je dnešní akce „jen pro členy“ (#70), nic nového se nestaví: nečlen ji nenajde ve výpisu, na mapě, na úvodní stránce ani na stránce skupiny a na přímý odkaz se dozví jen to, že je pro členy skupiny.
- **Přátelé (tým, podle PO):** ve sprintu 4 jen základ (#307), propojování a návrhy přátel později (#347).
- **Monetizace (tým, podle PO):** zatím jen návrh do budoucna. Platba je simulovaná (formulář na číslo karty a animace, že platba proběhla), jak přesně bude fungovat, se vyřeší s plánováním. Paywall by se týkal jen nově zakládaných funkcí, akce jen pro členy, které už skupiny mají, zůstanou.
- **Pořadí (PO):** podobné akce (#351) a oblíbené (#80) jdou do sprintu 5. Rozšíření nejsou priorita.

## Tým navrhne: skupiny podle místa

Skupina pořádá akce na různých místech, ale přesnou polohu nemá. Má jen povinnou lokalitu na úrovni obce, kterou vybírá zakladatel. Návrh týmu do #81: na mapě a ve filtru okolí je skupina podle své lokality (obce). [návrh] V náhledu na mapě a na stránce skupiny je navíc vidět, kde se konají její nadcházející akce, takže se uživatel orientuje i podle skutečných míst. Vzhled podle našeho designu, ukážeme ve Figmě. Sekce skupin (v okolí, podle zájmů) jsou u nás filtry a rychlé filtry v #81, samostatné sekce nepotřebujeme.

## Změny v backlogu a proč

### Nová issues

| Issue | Co                                                                   | Proč                                                                                                                    |
| ----- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| #345  | Ověřit zapomenuté heslo na stagingu (Sprint 4, P1)                   | PO: ověřit hned; od sprintu 2 se změnilo přihlašování (#236) a e-maily na stagingu.                                     |
| #357  | Příprava Sprint Review 4 (Sprint 4)                                  | PO chce interaktivní demo s registrací a onboardingem; samostatně, aby šlo přidělit.                                    |
| #346  | Přezdívka vidí všichni, celé jméno jen blízcí                        | PO: anonymizace, celé jméno není veřejně vidět.                                                                         |
| #347  | Přátelé: návrhy a propojení s dalšími lidmi                          | PO řadí propojování do dalších sprintů; základ přátel zůstává ve sprintu 4 v #307.                                      |
| #348  | Typ aktivity na kartě akce                                           | PO: na kartách chybí typ aktivity.                                                                                      |
| #349  | Filtry na /akce: horní pás s rychlým výběrem si nikdo nevšimne       | PO: horního pásu si nikdo nevšimne; řešení zatím nevíme, navrhne ho tým.                                                |
| #350  | Hodnocení v modálním okně                                            | PO: hodnocení může být v modalu místo samostatných stránek (#66).                                                       |
| #351  | Podobné akce na detailu akce                                         | PO: „More events like this“ v příštím sprintu.                                                                          |
| #352  | Pozvánka do skupiny odkazem                                          | PO: pozvánka od správce se nemusí schvalovat.                                                                           |
| #353  | Superadmin: reporting                                                | PO: rozšíření; navazuje na první nástřel #308.                                                                          |
| #354  | Monetizace: tarify, paywall a simulovaná platba kartou               | PO: možná monetizace do budoucna; zatím návrh.                                                                          |
| #359  | Sledovat organizátora nebo skupinu                                   | Návrh na vylepšení (níže).                                                                                              |
| #360  | Organizátor zablokuje účastníka na svých akcích                      | Návrh na vylepšení; dnes umíme blokaci jen ve skupině (#63).                                                            |
| #361  | Podobné skupiny na stránce skupiny                                   | Návrh na vylepšení; obdoba #351.                                                                                        |
| #362  | Akce mých skupin mezi prvními a upozornění na novou akci skupiny     | Návrh na vylepšení; dotahuje otevřené kritérium z #70 (upozornění na novou akci).                                       |
| #363  | Hledání akcí i podle organizátora a skupiny                          | Návrh na vylepšení; #57 hledá jen v názvu a aktivitě a je hotové.                                                       |
| #364  | Upozornění na obdržené hodnocení                                     | Návrh na vylepšení; upozornění při odhlášení účastníka už máme, na hodnocení ne. #86 je rozpracované, proto samostatně. |
| #365  | Kontrola: veřejný profil bez přihlášení a nepoužité hodnoty v modelu | Kontrola častých chyb: jen to, co nešlo potvrdit nebo platí (níže).                                                     |

### Doplněná issues

| Issue          | Co se změnilo                                                                                                           | Proč                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| #296           | Líbivý a osobní průvodce, ikonky za kategorii, povinný jen základ, počet aktivit na assignee, spuštění hned po ověření. | PO k onboardingu; přihlášení po ověření z #300.       |
| #300           | Platný ověřovací odkaz uživatele rovnou přihlásí a pokračuje onboardingem.                                              | PO: přihlášení po potvrzení přes token.               |
| #307           | Seznam přátel v Můj profil; mimo rozsah návrhy přátel (#347) a celé jméno (#346).                                       | PO: vidět přátele v profilu; propojování až později.  |
| #65            | E-mail po akci řekne, že akce proběhla, a vyzve k hodnocení. Zůstává ve sprintu 4.                                      | PO; výzva k hodnocení už byla v plánu sprintu 4.      |
| #80            | User story a kritéria, priorita „nice to have“ → MVP.                                                                   | PO: oblíbené v příštím sprintu.                       |
| #81            | Filtry a rychlé filtry jako u akcí, skupiny na mapě podle lokality (návrh týmu).                                        | PO: u skupin chybí filtry a orientace podle místa.    |
| #62, #63       | Zdroj z refinementu.                                                                                                    | PO: role správce, vyhodit člena.                      |
| #84            | Zdroj z refinementu; [návrh] počítat i se společně navštívenými akcemi.                                                 | PO: Najdi parťáka, není priorita; návrh na vylepšení. |
| #347           | Návrhy přátel řadit podle počtu společných akcí.                                                                        | Návrh na vylepšení.                                   |
| #352           | [návrh] pozvánka i e-mailem.                                                                                            | Návrh na vylepšení.                                   |
| #353           | [návrh] možné funkce superadmina.                                                                                       | Návrh na vylepšení.                                   |
| #354           | Měsíční/roční tarif, platnost v profilu, potvrzovací e-mail, vstupy k tarifům; paywall jen pro nově založené.           | PO; návrh na vylepšení.                               |
| #68, #69, #104 | Zdroj z refinementu (docházka, paywall); u #69 zůstává štítek „Topováno“.                                               | PO; placené zvýhodnění neskrýváme.                    |
| #332           | Hodnocení v modálním okně (#350) by dotaz při zavření převzalo.                                                         | PO: hodnocení v modalu.                               |

### Zavřená issues

- **#302 E-maily ve spamu:** not planned, PO: není potřeba řešit.

## Návrhy na vylepšení (tým)

Po refinementu jsme prošli aplikaci a sepsali, co by se v ní ještě hodilo. Vše je návrh, přizpůsobený našemu designu; PO ho uvidí v backlogu.

### Co navrhujeme

| Návrh                                                                         | U nás     |
| ----------------------------------------------------------------------------- | --------- |
| Sledovat organizátora nebo skupinu a dostat upozornění na jeho novou akci     | #359      |
| Organizátor zablokuje účastníka na svých akcích                               | #360      |
| Podobné skupiny pod stránkou skupiny                                          | #361      |
| Členové vidí akce svých skupin mezi prvními a dozví se o nové akci skupiny    | #362      |
| Hledání i podle organizátora a skupiny                                        | #363      |
| Upozornění na obdržené hodnocení                                              | #364      |
| Pozvánka do skupiny i e-mailem                                                | #352      |
| Návrhy lidí podle společně navštívených akcí                                  | #84, #347 |
| Měsíční/roční tarif, platnost v profilu, potvrzovací e-mail, vstupy k placení | #354      |
| Superadmin: přehled akcí a skupin, deaktivace skupiny, vyloučení účastníka    | #353      |

### Co jsme zvážili a nepotřebujeme

- **Sekce skupin „Ve tvém okolí“ a „Mohlo by tě zajímat“:** u nás to řeší filtry a rychlé filtry (#81).
- **Neoznačené topování:** topované akce vždy označujeme („Topováno“, #69), placené zvýhodnění neskrýváme.
- **Upozornění organizátorovi, když se účastník odhlásí:** už máme (#177).
- **Osud akcí a skupin po zrušení účtu:** popisuje B-080: nadcházející akce se zruší, jméno se anonymizuje a skupina bez dalšího správce se deaktivuje.
- **Počet aktivit v onboardingu:** rozhodne assignee #296.

### Kontrola častých chyb

17. 11. jsme prošli kód na časté bezpečnostní a datové chyby:

| Chyba                                                     | U nás                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Akce jen pro skupinu jde na přímý odkaz přečíst komukoli  | V pořádku: 403 `MEMBERS_ONLY` jen s odkazem na skupinu, testy.                        |
| Zakládání, úprava a mazání akce bez přihlášení            | V pořádku: `VerifiedUserGuard` / `AuthenticatedUserGuard` a kontrola organizátora.    |
| Kapacita se při přihlášení nekontroluje                   | V pořádku: `EVENT_FULL`, schválení pod zámkem řádku akce.                             |
| E-mail a role ve veřejných údajích uživatele              | V pořádku: veřejný profil je nevrací, test (#179).                                    |
| Koncepty a skryté akce ve výpisu                          | V pořádku: výpis bere jen zveřejněné veřejné akce.                                    |
| Detail akce posílá všem seznam přihlášených i se zprávami | V pořádku: jména jen oprávněným (#174), zprávy `NOT_PARTICIPANT`.                     |
| Ladicí endpointy a natvrdo zapsaný e-mail v produkci      | V pořádku: žádné; simulovaná schránka běží jen bez skutečného posílání e-mailů.       |
| Hodnocení včetně textů jde číst bez přihlášení            | **Platí:** veřejný profil je bez přihlášení i s komentáři a jmény hodnotících → #365. |
| Hodnoty v modelu, se kterými nepracuje žádný kód          | **Platí:** `EventVisibility.private` a pole viditelnosti profilu → #365.              |

## Úkoly

| Úkol                                                                                             | Kdo |
| ------------------------------------------------------------------------------------------------ | --- |
| Ověřit zapomenuté heslo na stagingu (#345)                                                       | Tým |
| Připravit Sprint Review 4: příběh s registrací a onboardingem, mobil promítaný na počítač (#357) | Tým |
| Návrh, jak zviditelnit horní pás filtrů, ve Figmě (#349)                                         | Tým |
| Návrh skupin na mapě a podle okolí ve Figmě (#81)                                                | Tým |
| Kontrola veřejného profilu a mrtvých hodnot v modelu (#365)                                      | Tým |
