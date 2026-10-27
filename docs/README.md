# HobbyHub – dokumentace

Rozcestník podkladů k projektu. Agent i lidé začínají tady.

## Zadání a rozsah

| Dokument                                                     | Co v něm je                                                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [HobbyHub_User_Stories_MVP.md](HobbyHub_User_Stories_MVP.md) | User stories US-01 až US-19 s akceptačními kritérii (zdroj pro issues `user story`)           |
| [../BACKLOG.md](../BACKLOG.md)                               | Rozpad stories na úkoly B-0xx pro agenta, pořadí a závislosti                                 |
| [zapis-planning-sprint2.md](zapis-planning-sprint2.md)       | Zápis z planningu s PO 13. 10. 2026 a změny ze standupu 19. 10.: happy path a scope sprintu 2 |
| [design-rozhodnuti.md](design-rozhodnuti.md)                 | Kde se design vědomě liší od wireframů a proč                                                 |
| [datovy-model.md](datovy-model.md)                           | Datový model MVP: ER diagram, přehled tabulek a pravidla, která hlídá backend                 |
| [prihlaseni-pres-google.md](prihlaseni-pres-google.md)       | Jak zapnout přihlášení přes Google: OAuth klient v Google Cloud Console a proměnné v Coolify  |
| Feature breakdown v3.4                                       | `HobbyHub_Feature_Breakdown_FINAL_sablona.xlsx` ve sdílené složce „Agilni vyvoj“ (čísla F-xx) |

## Odkazy

- **Board sprintu:** https://github.com/orgs/applifting-vsecourse/projects/16
- **Design a design systém (Figma):** https://www.figma.com/design/dGYGqD8BjC1rYlbfjCpxWD/HobbyHub-design
- **Lo-fi wireframy (Figma, aktualizované 20. 10.):** https://www.figma.com/design/A6v5ZPmNULBOXfz1uBAcVd/HobbyHub-wireframy
- **Sitemapa (FigJam):** https://www.figma.com/board/fPmS1iWbq2EAYS4uNJeemW/HobbyHub-sitemapa?node-id=103-648 (v3)
- **Feature breakdown v3.4:** https://vse-my.sharepoint.com/:x:/r/personal/mita05_vse_cz/_layouts/15/Doc.aspx?sourcedoc=%7B0BD89393-AE98-496B-8A9A-9AAD68E51119%7D&file=HobbyHub_Feature_Breakdown_FINAL_sablona.xlsx&action=default&mobileredirect=true&share=cQqTk9gLmK5rSYqamq1o5REZEgUClNZoRR7RsjYRRJYgXF5iKg
- Starší verze: design a wireframy do 19. 10. jsou ve Figmě na stránkách „Archiv – v1“, sitemapa v2 na stránce „v2 Hackathon“.
- **UI pravidla pro kód:** [../DESIGN.md](../DESIGN.md), konvence repa: [../CLAUDE.md](../CLAUDE.md)

## Jak s tím pracujeme

1. User story = issue se štítkem `user story`, úkoly B-0xx jsou její sub-issues.
2. Úkol bere ten, kdo si ho přiřadí (Assignee) a přesune do In progress.
3. Jeden úkol = jeden PR s `Refs #číslo` v popisu, ne `Closes` (issue zavírá PO po akceptaci na stagingu); PR projde review nezávislým agentem (`/review-branch`) a schválí ho spoluhráč.
4. Hotové se nasazuje na staging průběžně, ne až před demem.
