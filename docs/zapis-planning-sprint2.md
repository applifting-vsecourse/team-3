# Zápis z planningu sprintu 2

**Kdy:** 13. 10. 2026, online, 22 min · **Kdo:** Jan Černý (PO), Veronika Seyfriedová (tým) · **Téma:** scope MVP pro sprint 2

Na konci sprintu 2 ukážeme živě na stagingu happy path pro akce i skupiny. Hodnocení a další funkce kolem zatím neřešíme.

## Happy path
1. **Úvodní stránka** – návštěvník pochopí, k čemu HobbyHub je.
2. **Registrace a přihlášení** – stane se uživatelem.
3. **Seznam akcí s mapou** – prochází nadcházející akce v seznamu nebo jako body na mapě.
4. **Detail akce** – vidí, o čem akce je, kdo ji pořádá a kolik lidí chybí.
5. **Přihlášení na akci** – dá najevo, že přijde (u akce se schvalováním čeká na organizátora).
6. **Správa akce** – organizátor akci vytvoří, upraví nebo smaže a vidí přihlášky.
7. **Seznam, detail a správa skupin** – stejné vzory jako u akcí, UX ukáže, že jsem v jiné části.
8. **Žádost o členství ve skupině** – uživatel požádá, správce přijme, uživatel je ve skupině.

## Scope sprintu 2
- Stories: US-01, US-02, US-03, US-04, US-06, US-07, US-11, US-12, US-13, US-16, US-17 a testovací data (F-64), osekané podle issues `user story`.
- Schvalování je ve scope.
- Mapa je nástřel: stačí zobrazit body. Při velkých problémech se přesune do sprintu 3.

## Mimo scope
E-maily a ověření e-mailu, profil a GDPR, hodnocení, akce skupin a správci, moderace, monetizace.

## Dohody
- **Design:** před zadáním agentovi schválit s PO design jedné typické obrazovky (seznam nebo detail akce), mobil i desktop. Hi-fi všech obrazovek nedělat. Aplikace má mít brand, ne jen výchozí shadcn.
- **Backlog:** user stories v GitHubu, posouvat Backlog → Ready → Done. PO projde popisy.
- **Testovací data:** vygenerovat AI podle oblastí zájmu z briefu a ručně zkontrolovat.
- **Komunikace:** průběžně, i asynchronně v Teams (návrh, dotazy, výsledek běhu agenta, chyby).
- **Konec sprintu:** verze nasazená na stagingu, otestovaná, v souladu se specifikací; demo živě bez PowerPointu.

## Otevřené otázky na PO
- Má mít schvalování přihlášek i akce, nebo jen žádost o členství ve skupině? (zatím počítáme s volbou u akce)
- Akce se smaže, nebo zruší se štítkem „Zrušeno“?

## Další schůzka
Pondělí 19. 10. 2026 v 15:30, asi 15 minut, po cvičení.
