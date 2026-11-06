# Veřejný profil (#179)

`GET /api/users/:userId` je veřejný a vždy vrací stejnou omezenou projekci, bez ohledu na přihlášení návštěvníka. Neexistující, zablokovaný nebo smazaný účet má shodnou odpověď 404.

Odpověď obsahuje jméno, zájmy, přijatá hodnocení účastníka, průměr organizátora a jeho akcí s počty a historii osobně pořádaných veřejných proběhlých akcí s jejich hodnocením a `approvedCount` (počet schválených účastí, nikoliv potvrzená docházka). Neobsahuje e-mail, domovskou lokalitu, profilovou viditelnost, auth účty, historii účasti ani členství skupin.

Smazaná hodnocení a hodnocení nepublikovaných nebo neukončených akcí se nepočítají. Hodnocení organizátora a jeho akcí nezahrnuje akce skupin. Agregáty zahrnují i osobní neveřejné akce, ale jejich identita se nezveřejňuje. Historie akcí je užší: jen publikované, veřejné, osobní a ukončené akce.

U přijatého hodnocení z neveřejné akce je `event=null`: profil tak nevyzradí její název ani ID. Autor smazaného nebo zablokovaného účtu je `author=null`. Průměr bez hodnocení je `null`, nikoliv nula. Základní pravidla průměrů používají existující doménové funkce #180.

Není potřeba migrace. Vlastní profil a změny účtu řeší samostatná #178.

Počet účastníků se načítá filtrovaným databázovým `_count`; pro historii se jména, ID ani samotné záznamy účastníků nenačítají a neposílají. Čekající žádosti se do počtu nezahrnují.
