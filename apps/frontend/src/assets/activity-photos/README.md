# Fotky aktivit

Knihovna fotek na kartách akcí (DESIGN.md › Event card, #248): **jedna fotka na aktivitu**, pojmenovaná podle `slug` aktivity z katalogu, nikdy fotka od organizátora. Aktivita bez fotky ukáže na kartě dlaždici aktivity.

Každá fotka je tu ve dvou šířkách, poměr 3 : 2, WebP:

- `<slug>-480.webp` – 480 px
- `<slug>-960.webp` – 960 px

Barvy se na fotky nepečou: jednotný color grade (sytost −14 %, kontrast +10 %, proběhlá akce sytost −60 %) dává karta filtrem, stejně jako Figma.

## Původ

Dnes vzorové fotky z Figmy HobbyHub-design (stránky „Seznam akcí“, „Úvod a detail akce“) pro aktivity `badminton`, `beh`, `deskove-hry`, `florbal`, `jazykovy-tandem`, `joga`, `karetni-hry`, `stolni-tenis`, `turistika`, `unikove-hry`, `volejbal`. Jsou vygenerované v Claude (Anthropic), ne fotky třetích stran, takže je můžeme mít v repu jako demo data. Novou fotku přidej stejně: vygenerovanou nebo s licencí, která dovoluje použití v projektu, a sem napiš, odkud je.
