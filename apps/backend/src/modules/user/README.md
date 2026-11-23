# Veřejný profil (#179)

`GET /api/users/:userId` je veřejný a vrací stejnou omezenou projekci každému návštěvníkovi. Neexistující, zablokovaný nebo smazaný účet má shodnou odpověď 404.

**Přátelé (#307):** přihlášenému navíc pošle `friendship`, jeho vztah k profilu (`friends` / `outgoing` / `incoming` / `none` / `self`, pravidla v modulu [`friendship`](../friendship/README.md)); nepřihlášenému `null`. Jen příteli pošle `upcomingEvents`, „Kam jde“: nejvýš 3 nejbližší akce, které ještě neskončily, kam má člověk schválené místo nebo které pořádá, a jen ty, které by návštěvník viděl i sám: veřejné a akce jen pro členy aktivní skupiny, kde je aktivním členem; soukromé (jen přes odkaz) nikdy, zrušené ani skryté nikdy (`friendUpcomingEventsWhere` v [`domain/friend-events.ts`](domain/friend-events.ts)). Ostatním `null` a dotaz na akce se vůbec nespustí. Akce mají tvar karet z `GET /api/events`.

Odpověď obsahuje jméno, zájmy, přijatá hodnocení účastníka, průměr organizátora a jeho akcí s počty a historii osobně pořádaných veřejných proběhlých akcí s jejich hodnocením a `approvedCount` (počet schválených účastí, nikoliv potvrzená docházka). Neobsahuje e-mail, domovskou lokalitu, nastavení viditelnosti, auth účty ani členství skupin.

Smazaná hodnocení a hodnocení nepublikovaných nebo neukončených akcí se nepočítají. Hodnocení organizátora a jeho akcí nezahrnuje akce skupin. Agregáty zahrnují i osobní neveřejné akce, ale jejich identita se nezveřejňuje. Historie akcí je užší: jen publikované, veřejné, osobní a ukončené akce.

Seznam přijatých hodnocení obsahuje jen hodnocení z veřejných akcí. Hodnocení ze soukromé akce nebo akce jen pro členy se započítá jen do průměru: v seznamu by prozradilo organizátora, datum a že tam uživatel byl. Autor smazaného nebo zablokovaného účtu je `author=null`. Průměr bez hodnocení je `null`, nikoliv nula. Základní pravidla průměrů používají existující doménové funkce #180.

**Fotka, bio a navštívené akce (B-014, #64):** `photoKey` (fotka na `GET /api/images/{photoKey}`), `bio` a `pastEvents` dostane jen ten, komu je člověk ukazuje (`photoVisibility`, `bioVisibility`, `pastEventsVisibility`). Okruhy jsou vnořené: `everyone` vidí všichni; `friends` přátelé a organizátoři akcí, na které se člověk hlásí (čekající nebo schválená přihláška); `organizers` jen ti organizátoři; `nobody` jen on sám. Ostatním přijde `null`. Rozhodují čisté funkce `canSee` ([`domain/profile-visibility.ts`](domain/profile-visibility.ts)) a `visibleDetails`. Dotaz, jestli návštěvník pořádá akci člověka, se spustí, jen když na odpovědi něco závisí, a navštívené akce se načtou, jen když je návštěvník smí vidět. `pastEvents` jsou veřejné ukončené akce se schváleným místem, které pořádal někdo jiný (vlastní jsou v `organizedEvents`), nejvýš 10 posledních. Jméno je veřejné vždy, takže ho organizátor akce, na kterou se člověk hlásí, vidí taky. Adresa fotky je náhodné UUID: kdo ji nedostal v odpovědi, nezná ji.

Vlastní profil a změny účtu řeší samostatná #178.

Počet účastníků se načítá filtrovaným databázovým `_count`; pro historii se jména, ID ani samotné záznamy účastníků nenačítají a neposílají. Čekající žádosti se do počtu nezahrnují.
