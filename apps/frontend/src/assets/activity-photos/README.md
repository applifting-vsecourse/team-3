# Fotky aktivit

Knihovna fotek na kartách akcí (DESIGN.md › Event card, #248): **jedna fotka na aktivitu**, pojmenovaná podle `slug` aktivity z katalogu, nikdy fotka od organizátora. Aktivita bez fotky ukáže na kartě dlaždici aktivity.

Každá fotka je tu ve dvou šířkách, poměr 3 : 2, WebP:

- `<slug>-480.webp` – 480 px
- `<slug>-960.webp` – 960 px

Barvy se na fotky nepečou: jednotný color grade (sytost −14 %, kontrast +10 %, proběhlá akce sytost −60 %) dává karta filtrem, stejně jako Figma.

## Původ

Všechny fotky jsou vygenerované AI, ne fotky třetích stran, takže je můžeme mít v repu jako demo data:

- `badminton`, `beh`, `deskove-hry`, `florbal`, `jazykovy-tandem`, `joga`, `karetni-hry`, `stolni-tenis`, `turistika`, `unikove-hry`, `volejbal` – vzorové fotky z Figmy HobbyHub-design (stránky „Seznam akcí“, „Úvod a detail akce“), vygenerované v Claude (Anthropic).
- ostatních 55 aktivit katalogu (9. 11. 2026) – vygenerované ve Figmě (Figma AI, model gpt-image-2.5-flare) do souboru HobbyHub-design, ve stejném stylu: dokumentární fotka 3 : 2, parta amatérů různého věku v českém prostředí, přirozené světlo, bez textu, log a detailů obličejů. Z PNG 1536 × 1024 ořez na 3 : 2 a zmenšení na 480 a 960 px (WebP, kvalita 78).

Každá aktivita v katalogu teď má fotku. Novou fotku přidej stejně: vygenerovanou nebo s licencí, která dovoluje použití v projektu, a sem napiš, odkud je.
