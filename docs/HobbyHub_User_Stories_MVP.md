# HobbyHub – User stories MVP

Zdroj: Feature breakdown v3.4 po FB1 (9. 10. 2026) zkonzultovaný s PO, Lean Canvas v2 (12. 10. 2026) a upřesnění týmem 9. 10. Features s prioritou **MVP** a skupiny. Příbuzné features jsou sloučené do jedné story.

## Role

| Role                | Kdo to je                                                                                                                             | Label                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Návštěvník          | Kdokoli nepřihlášený. Akce jen prohlíží.                                                                                              | `role: návštěvník`      |
| Přihlášený uživatel | Hlásí se na akce, přidává se do skupin, hodnotí akce i organizátory, nahlašuje lidi a akce                                            | `role: uživatel`        |
| Organizátor akce    | Přihlášený uživatel, který založí akci sám za sebe. Není to zvláštní typ účtu. Předplatným organizátora si odemkne evidenci docházky. | `role: organizátor`     |
| Správce skupiny     | Kdo skupinu založil, nebo koho správce jmenoval. Všichni správci mají stejná práva (správce = admin skupiny).                         | `role: správce skupiny` |
| Superadmin          | Provozovatel / technická podpora: schvaluje nahlášení, blokuje, maže akce, potvrzuje platby                                           | `role: superadmin`      |

Každá role umí i všechno, co přihlášený uživatel. Správce skupiny řídí akce skupiny stejně jako organizátor svou akci (US-11 až US-14).

**Labely issue:** `epic: …` podle listu Epicy, `priorita: MVP`, `role: …`.

## Přehled

| ID    | Role                       | Story                                       | Feature                |
| ----- | -------------------------- | ------------------------------------------- | ---------------------- |
| US-01 | Návštěvník                 | Úvodní stránka s náhledem akcí              | F-68                   |
| US-02 | Návštěvník                 | Procházení a hledání akcí                   | F-01, F-02, F-03, F-04 |
| US-03 | Návštěvník                 | Detail akce a sdílený odkaz                 | F-05, F-06             |
| US-04 | Návštěvník                 | Registrace a přihlášení                     | F-10, F-12             |
| US-05 | Uživatel                   | Profil a správa účtu                        | F-11, F-14             |
| US-06 | Uživatel                   | Přihlášení na akci a odhlášení              | F-22, F-19, F-24       |
| US-07 | Uživatel                   | Moje akce                                   | F-25                   |
| US-08 | Uživatel                   | E-mailová upozornění                        | F-36, F-37             |
| US-09 | Uživatel                   | Hodnocení akce a organizátora               | F-42, F-41             |
| US-10 | Uživatel                   | Nahlášení uživatele nebo akce               | F-43                   |
| US-11 | Organizátor                | Založení akce s kapacitou                   | F-15, F-16, F-19, F-06 |
| US-12 | Organizátor                | Schvalování a správa účastníků              | F-22, F-23, F-38       |
| US-13 | Organizátor                | Úprava a zrušení akce                       | F-17                   |
| US-14 | Organizátor                | Předplatné organizátora a evidence docházky | F-69, F-56, F-55       |
| US-15 | Organizátor                | Topování akce se simulovanou platbou        | F-54, F-55             |
| US-16 | Správce skupiny            | Založení skupiny a jmenování správců        | F-28                   |
| US-17 | Uživatel / Správce skupiny | Členství ve veřejné a neveřejné skupině     | F-30, F-31             |
| US-18 | Správce skupiny            | Akce skupiny                                | F-28, F-15             |
| US-19 | Superadmin                 | Vyřízení nahlášení a zásah                  | F-43, F-44             |

---

# Návštěvník

### US-01 Úvodní stránka s náhledem akcí

`epic: objevování` `priorita: MVP` `role: návštěvník` · F-68

**Jako** návštěvník, který přišel poprvé, **chci** hned pochopit, k čemu HobbyHub je, a vidět akce ve svém okolí, **abych** se rozhodl, jestli pokračovat.

- [ ] Stránka jednou větou vysvětlí, co HobbyHub dělá.
- [ ] Ukazuje náhled nadcházejících akcí podle lokality z IP; když ji nejde zjistit, ukáže Prahu. Lokalita z IP se neukládá.
- [ ] Lokalitu jde ručně změnit bez registrace.
- [ ] Z náhledu se dostanu na detail akce i na celý přehled.

---

### US-02 Procházení a hledání akcí

`epic: objevování` `priorita: MVP` `role: návštěvník` · F-01, F-02, F-03, F-04

**Jako** návštěvník **chci** bez registrace procházet a filtrovat nadcházející akce v seznamu i na mapě, **abych** našel, co mi sedí časem i místem.

- [ ] Seznam i mapa jsou přístupné bez účtu. Na desktopu jsou vedle sebe, na mobilu je mapa přes celou obrazovku a seznam ve vysouvacím panelu (návrh týmu, potvrdit s PO).
- [ ] Položka ukazuje aktivitu, název, termín, místo a kolik lidí chybí; seznam jde řadit podle termínu a vzdálenosti.
- [ ] Na mapě jsou akce jako špendlíky; klepnutí ukáže náhled s proklikem na detail. GPS se nepoužívá.
- [ ] Filtry: lokalita, termín (rozsah od–do s rychlými volbami), typ aktivity (kategorie › aktivita), jen akce, kterým chybí lidé (návrh týmu, potvrdit s PO); doplňkově hledání podle názvu. Filtry platí pro seznam i mapu.
- [ ] Nezobrazují se proběhlé, zrušené, soukromé akce a akce skupin „jen pro členy“.
- [ ] Vše funguje na mobilu.

---

### US-03 Detail akce a sdílený odkaz

`epic: objevování` `priorita: MVP` `role: návštěvník` · F-05, F-06

**Jako** návštěvník (i ten, komu přišel odkaz do WhatsAppu) **chci** na detailu akce vidět vše potřebné bez registrace, **abych** se rozhodl, jestli se přihlásím.

- [ ] Detail ukazuje název, aktivitu, popis, místo na mapě, termín, cenu, úroveň, organizátora (osobu nebo skupinu), způsob přihlášení, počet přihlášených a kolik chybí.
- [ ] Odkaz na akci se otevře přímo na detailu, bez přihlašovací obrazovky.
- [ ] Návštěvník vidí jen počet přihlášených; přihlášený uživatel vidí i jména.
- [ ] Zrušená akce má štítek „Zrušeno“ s důvodem.

---

### US-04 Registrace a přihlášení

`epic: účet` `priorita: MVP` `role: návštěvník` · F-10, F-12

**Jako** návštěvník, který se chce přihlásit na akci, **chci** rychle založit účet nebo se přihlásit a vrátit se na tu samou akci, **abych** ji nemusel hledat znovu.

- [ ] Klepnutí na „Přihlásit se na akci“ nepřihlášeného nabídne přihlášení nebo registraci; po dokončení se vrátím na akci.
- [ ] Registrace e-mailem a heslem (přihlášení přes Google v MVP není): jméno, e-mail, silné heslo (validace na frontendu i backendu), potvrzení věku 18+, souhlas s podmínkami a GDPR.
- [ ] Ověřovací odkaz platí 24 h; bez ověřeného e-mailu se nejde hlásit na akce ani je zakládat.
- [ ] Přihlášení e-mailem a heslem; „Zapomenuté heslo“ pošle odkaz s omezenou platností.
- [ ] Jeden účet slouží k účasti i pořádání.

---

# Přihlášený uživatel

### US-05 Profil a správa účtu

`epic: účet` `priorita: MVP` `role: uživatel` · F-11, F-14

**Jako** uživatel **chci** vyplnit profil, rozhodnout, co z něj sdílím, a mít kontrolu nad svým účtem, **aby** mě organizátor poznal a moje údaje byly pod mou kontrolou.

- [ ] Profil: jméno, fotka, bio, zájmy, domovská lokalita (město / městská část); lokalita je výchozí ve filtrech.
- [ ] U fotky, bia a navštívených akcí volím, kdo je vidí: všichni / jen organizátoři mých akcí / nikdo; jméno vidí vždy organizátor akce, na kterou se hlásím.
- [ ] Změna hesla a e-mailu (nový e-mail platí po ověření).
- [ ] Export mých dat a smazání účtu; mé jméno u proběhlých akcí se anonymizuje.

---

### US-06 Přihlášení na akci a odhlášení

`epic: účast` `priorita: MVP` `role: uživatel` · F-22, F-19, F-24

**Jako** uživatel **chci** se přihlásit na akci a v případě potřeby se odhlásit, **abych** si zajistil místo a organizátor věděl, s kým počítat.

- [ ] U akce se schvalováním pošlu žádost s nepovinnou zprávou a vidím „Čeká na schválení“; žádost mohu stáhnout.
- [ ] U akce bez schvalování klepnu na „Přijdu“ a jsem rovnou účastník.
- [ ] Při naplněném maximu je přihlášení zavřené („Plno“).
- [ ] Odhlásit se mohu kdykoli před začátkem akce; místo se uvolní a „chybí X“ se přepočítá.
- [ ] Organizátor není účastníkem své akce automaticky, ale může se na ni přihlásit jako kdokoli jiný (bez schvalování); pak se počítá do obsazenosti. Dvakrát na tutéž akci se přihlásit nejde.

---

### US-07 Moje akce

`epic: účast` `priorita: MVP` `role: uživatel` · F-25

**Jako** uživatel **chci** mít na jednom místě akce, na které jdu, které pořádám, a ty proběhlé, **abych** měl přehled.

- [ ] Záložky: Přihlášen (schváleno + čeká), Pořádám (vč. akcí mých skupin), Proběhlé.
- [ ] U akce je stav mé účasti a termín; řazeno od nejbližší.
- [ ] Z pořádané akce se dostanu na její správu.

---

### US-08 E-mailová upozornění

`epic: komunikace` `priorita: MVP` `role: uživatel` `role: organizátor` · F-36, F-37

**Jako** účastník i organizátor **chci** dostávat e-maily o tom, co se s akcí děje, **abych** nic nepropásl a včas se rozhodl.

- [ ] Účastník: schválení / zamítnutí, změna termínu nebo místa, zrušení s důvodem, připomínka den před akcí.
- [ ] Organizátor: nová žádost o účast, odhlášení účastníka.
- [ ] Organizátor: 48 a 24 h před akcí přehled, kolik lidí chybí do minima, s nabídkou Sdílet / Topovat / Zrušit; při naplněném minimu nepřijde.
- [ ] Každý e-mail má odkaz na akci.

---

### US-09 Hodnocení akce a organizátora

`epic: důvěra` `priorita: MVP` `role: uživatel` · F-42, F-41

**Jako** účastník proběhlé akce **chci** ohodnotit akci a organizátora, **aby** ostatní věděli, komu a čemu věřit.

- [ ] Večer po akci přijde e-mail (dávkově na konci dne) s výzvou k hodnocení.
- [ ] Hodnotit mohu jen akci, na které jsem byl přihlášený.
- [ ] Akce: 1–5 hvězdiček + nepovinný komentář. Organizátor (osoba nebo skupina): 1–5 hvězdiček.
- [ ] Organizátor vidí hodnocení a komentáře své akce; průměr je u jeho profilu / u skupiny.
- [ ] Potvrzená docházka není podmínkou hodnocení.

---

### US-10 Nahlášení uživatele nebo akce

`epic: důvěra` `priorita: MVP` `role: uživatel` · F-43

**Jako** uživatel, který narazí na spam nebo nevhodné chování, **chci** uživatele nebo akci nahlásit, **aby** to superadmin prověřil.

- [ ] „Nahlásit“ je u akce, profilu, skupiny a hodnocení; jen pro přihlášené.
- [ ] Vyberu důvod (spam, podvod, nevhodný obsah, jiné) a mohu připsat komentář.
- [ ] Nahlášení jde ke schválení superadminovi (US-19); samo nic neskryje.
- [ ] Nahlášený se nedozví, kdo ho nahlásil.

---

# Organizátor akce

### US-11 Založení akce s kapacitou

`epic: správa akce` `priorita: MVP` `role: organizátor` · F-15, F-16, F-19, F-06

**Jako** uživatel **chci** založit akci s minimálním a maximálním počtem lidí, **abych** sehnal lidi na svou aktivitu a hledající viděli, kolik jich chybí.

- [ ] Povinné: název, aktivita, místo na mapě, datum a čas, min. a max. počet, způsob přihlašování. Nepovinné: popis, cena, úroveň, vybavení.
- [ ] Způsob přihlašování: „Bez schválení“ (výchozí), nebo „Schvaluji přihlášky“. Viditelnost: veřejná / soukromá (jen přes odkaz).
- [ ] Minimum ≥ 1, maximum ≥ minimum; datum v minulosti nejde zadat.
- [ ] Akce ukazuje „Chybí ještě X“ do minima, pak „Volná místa: Y“; počítají se schválení účastníci. Po naplnění maxima se přihlašování zavře.
- [ ] Po zveřejnění je veřejná akce v seznamu, na mapě a ve vyhledávání a aplikace nabídne „Sdílet odkaz“.
- [ ] Počet aktivních akcí není omezený.

---

### US-12 Schvalování a správa účastníků

`epic: účast` `priorita: MVP` `role: organizátor` `role: správce skupiny` · F-22, F-23, F-38

**Jako** organizátor **chci** vyřizovat žádosti, mít přehled účastníků a napsat jim, **abych** věděl, kdo přijde, a akci uřídil.

- [ ] Vidím čekající žádosti s profilem a zprávou; schválím nebo zamítnu jednotlivě i hromadně (při plné kapacitě schválit nejde).
- [ ] Vidím seznam schválených; účastníka mohu odebrat (dostane upozornění).
- [ ] Mohu poslat zprávu všem schváleným (e-mailem); chat u akce v MVP není.
- [ ] U akce skupiny to může dělat kterýkoli správce skupiny.

---

### US-13 Úprava a zrušení akce

`epic: správa akce` `priorita: MVP` `role: organizátor` `role: správce skupiny` · F-17

**Jako** organizátor **chci** akci upravit nebo zrušit, **aby** přihlášení měli aktuální informace.

- [ ] Údaje jde upravit do začátku akce; maximum nejde snížit pod počet schválených.
- [ ] Změna termínu nebo místa a zrušení (s povinným důvodem) pošlou přihlášeným e-mail.
- [ ] Zrušená akce zmizí z přehledu, přes odkaz je vidět se štítkem „Zrušeno“. Akce se nemaže, jen ruší.
- [ ] Aplikace akci sama neruší ani při nenaplnění minima.

---

### US-14 Předplatné organizátora a evidence docházky

`epic: monetizace` `epic: účast` `priorita: MVP` `role: organizátor` `role: správce skupiny` `role: superadmin` · F-69, F-56, F-55

**Jako** organizátor **chci** si zaplatit předplatné a po akci označit, kdo skutečně přišel, **abych** věděl, s kým příště počítat.

- [ ] Stránka předplatného organizátora ukazuje výhody (evidence docházky) a cenu 149 Kč měsíčně.
- [ ] Platba je simulovaná, bez platební brány: obrazovka platby → potvrzení → superadmin platbu v administraci potvrdí, v DB se nastaví „zaplaceno“ s platností a docházka se odemkne.
- [ ] Bez předplatného vidím u akce „Evidence docházky“ zamčenou s odkazem na předplatné.
- [ ] S předplatným od začátku akce do 7 dnů po ní odškrtávám v seznamu schválených „Přišel“ (ručně, na mobilu i tabletu; QR až po MVP).
- [ ] U žadatele na mé další akce vidím, kolikrát na mé akce přišel.
- [ ] Předplatné správce platí i pro akce jeho skupiny.
- [ ] Po vypršení předplatného se docházka zamkne; už zaznamenaná data zůstanou.

---

### US-15 Topování akce se simulovanou platbou

`epic: monetizace` `priorita: MVP` `role: organizátor` `role: superadmin` · F-54, F-55

**Jako** organizátor akce, které chybí lidé, **chci** akci topovat, **aby** ji vidělo víc lidí.

- [ ] Ve správě akce je „Topovat akci“ za 50 Kč jednorázově; topování platí do konání akce.
- [ ] Platba je simulovaná, bez platební brány: obrazovka platby → potvrzení → superadmin platbu v administraci potvrdí a v DB se nastaví „zaplaceno“.
- [ ] Topovaná akce je nahoře v seznamu a v doporučených a odlišená na mapě, se štítkem, který nepůsobí jako reklama.
- [ ] Topování skončí začátkem nebo zrušením akce.

---

# Správce skupiny

### US-16 Založení skupiny a jmenování správců

`epic: skupiny` `priorita: MVP` `role: správce skupiny` · F-28

**Jako** organizátor pravidelné party **chci** založit úzce zaměřenou skupinu (např. „Fotbal Pardubice“) a přizvat další správce, **aby** nás hledající našli jako stálou partu a skupinu jsme mohli řídit společně.

- [ ] Skupinu založí každý uživatel s ověřeným e-mailem a stává se jejím správcem.
- [ ] Povinné: název, právě jedna aktivita, právě jedna lokalita, typ veřejná / neveřejná. Nepovinné: popis, obrázek.
- [ ] Stránka skupiny ukazuje aktivitu, lokalitu, správce, počet členů a nadcházející akce; skupiny jdou najít ve vyhledávání.
- [ ] Správce může jmenovat dalšího člena správcem; všichni správci mají stejná práva. Poslední správce se role vzdát nemůže.
- [ ] Správce může skupinu upravit nebo deaktivovat. Skupina se nemaže ani neruší: zmizí z hledání, nejde se do ní přidat, členové dostanou upozornění, nadcházející akce skupiny se zruší a proběhlé zůstanou v historii.

---

### US-17 Členství ve veřejné a neveřejné skupině

`epic: skupiny` `priorita: MVP` `role: uživatel` `role: správce skupiny` · F-30, F-31

**Jako** uživatel **chci** se přidat do skupiny, **abych** viděl její akce a hlásil se na ně; **jako** správce **chci** u neveřejné skupiny rozhodnout, koho přijmu.

- [ ] Veřejná skupina: „Přidat se“ a jsem rovnou členem.
- [ ] Neveřejná skupina: „Požádat o členství“ s nepovinnou zprávou; kterýkoli správce žádost schválí nebo zamítne a žadatel dostane upozornění.
- [ ] Správce může člena odebrat nebo ve skupině zablokovat (nevidí akce skupiny a nemůže se znovu přidat).
- [ ] Neveřejná skupina je vidět ve vyhledávání; schvaluje se jen přidání.
- [ ] Člen může ze skupiny kdykoli odejít.

---

### US-18 Akce skupiny

`epic: skupiny` `priorita: MVP` `role: správce skupiny` · F-28, F-15

**Jako** správce skupiny **chci** zakládat akce jménem skupiny, **aby** je členové viděli a hlásili se na ně.

- [ ] Akci skupiny založí kterýkoli správce stejně jako v US-11; aktivita je předvyplněná a zamčená podle skupiny.
- [ ] Jako organizátor je u akce uvedena skupina s proklikem na její stránku; spravovat ji může kterýkoli správce (US-12 až US-14).
- [ ] Volím, zda je akce jen pro členy, nebo veřejná.
- [ ] Členové dostanou upozornění na novou akci a hlásí se na ni sami (automaticky přihlášení nejsou).

---

# Superadmin

### US-19 Vyřízení nahlášení a zásah

`epic: důvěra` `priorita: MVP` `role: superadmin` · F-43, F-44

**Jako** superadmin **chci** vidět nahlášení na jednom místě a rozhodnout o zásahu, **abych** rychle řešil spam a porušení pravidel.

- [ ] Administrace je dostupná jen roli superadmin.
- [ ] Fronta ukazuje typ (uživatel, akce, skupina, hodnocení), důvod, komentář, počet nahlášení a odkaz na obsah.
- [ ] Nahlášení zamítnu, nebo schválím a provedu zásah s důvodem: zablokovat uživatele / skrýt nebo smazat akci / smazat hodnocení.
- [ ] Zablokovaný se nepřihlásí a jeho nadcházející akce se zruší s upozorněním přihlášeným; organizátor smazané akce dostane důvod.
- [ ] Zásah jde vrátit; historie ukazuje, kdo a jak rozhodl.
