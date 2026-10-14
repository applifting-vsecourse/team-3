# Design – rozhodnutí a odchylky od wireframů

Design první obrazovky (seznam a mapa akcí) je ve [Figmě](https://www.figma.com/design/dGYGqD8BjC1rYlbfjCpxWD/HobbyHub-design). Vychází ze schválených [wireframů](https://www.figma.com/design/A6v5ZPmNULBOXfz1uBAcVd/HobbyHub-wireframy) A-02, A-03 a A-02d a z feature breakdownu. Tady jsou místa, kde se od wireframů vědomě liší.

| Kde | Wireframe | Design | Proč |
|---|---|---|---|
| Navigace návštěvníka | Akce, Mapa, Založit, Moje akce, Přihlásit | Akce, Mapa, Skupiny, Přihlásit | Zakládat akce a hlásit se jde až po registraci (F-01, F-15); skupiny jsou v happy path |
| Navigace přihlášeného | Akce, Mapa, Založit, Moje akce, Profil | Akce, Mapa, Skupiny, Moje akce, Profil | Zakládání přes plovoucí tlačítko „Založit akci“; skupiny dostupné odkudkoli |
| Hlavička desktopu (návštěvník) | Přihlásit se + Založit akci | Přihlásit se + Registrovat | F-15 jen pro přihlášené |
| Karta akce | Fotka akce | Ikona kategorie aktivity | Fotka akce je F-20 (Nice to have) |
| Plná akce | „Plno · náhradníci“ | „Plno“ | Náhradníci jsou F-26 (Nice to have) |
| Mapa | — | Bez tlačítka „moje poloha“ | GPS se nesbírá, lokalita z profilu / odhad z IP (F-08) |

## Brand
- **Barvy:** limetková pro hlavní akce, téměř černá zelená pro text. Tokeny v Figmě jsou pojmenované jako v `apps/frontend/src/styles/global.css` (shadcn).
- **Písmo:** Bricolage Grotesque pro nadpisy a značku, Geist pro UI.
- **Logo:** tři plné tečky a jedna prázdná – parta, které chybí jeden člověk.
- **Štítek obsazenosti:** „Chybí X“ (zvýrazněný), „Volná místa“, „Plno“.
