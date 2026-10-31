# Design contract

Read this before writing or changing any UI — human or agent.

These are rules, not suggestions. When a rule and a "nicer looking" idea disagree, the rule wins. Consistency across every screen beats a clever one.

`src/components/ui/**` is vendored shadcn — treat it as a third-party kit and restyle via tokens rather than rewriting it.

**Tokens live in `apps/frontend/src/styles/global.css`.** That file is the only source of truth for colour, radius, shadows and fonts. This file says how to _use_ them. The values come from the Figma collection „HobbyHub tokens“ in [HobbyHub-design](https://www.figma.com/design/dGYGqD8BjC1rYlbfjCpxWD/HobbyHub-design) (page „Design system“), with the same names. When Figma changes, update `global.css` — never patch a colour in a component.

## Colour

- **Never hardcode a colour.** No `#hex`, no `bg-blue-500`, no `rgb()`. Use the semantic classes only: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-primary`, `bg-secondary`, `border-border`, `bg-destructive`.
- **`primary` is for actions, not decoration.** One primary button per view. Everything else is `outline`, `ghost` or a plain link.
- **`primary` (lime) is a fill, never a text or icon colour.** Lime on white fails contrast. Text on a lime fill is `primary-foreground`. The only non-button uses of lime are the brand elements below: the capacity bar fill, the „Chybí“ badge, the „Chybí“ map pin, the active bottom-nav pill and the logo.
- **`secondary` (light green) is for quiet brand labels** — the activity tag, the „N volných míst“ badge and the „Máš místo“ block (A-05c) — with `secondary-foreground` text.
- **`destructive` only for destructive actions and errors.** Never for emphasis. In dark mode it is lighter (`#f97066`), because error text needs 4.5:1 on a dark card; the token test in `src/styles/tokens.test.ts` checks the text pairs in both modes.
- **`accent` is a hover/active surface, not a brand colour.** It tints menu items and ghost buttons on hover, so it must stay quiet. The brand colour is `primary`.
- Body text is `foreground`; supporting text is `muted-foreground`. There is no third level.
- **Every screen must work in both modes.** Never use `text-white`/`bg-black` or the kit's default `dark:` overrides; text and icons on a filled surface use that surface's `-foreground` token, and a selected/on state must restate its `dark:` classes if the default state has any. Check dark mode in Figma by switching the frame to mode „Dark“ (page „Tmavý režim“ shows all components). The one exception is the kit's `bg-black/50` overlay behind dialogs and drawers: Figma has no overlay token, and darkening the page works in both modes.

## Layout

- **Cards are for separable items in a list** — an event, a group, a search result. They are not page sections and not layout tools.
- **Never nest a card inside a card.** If content needs grouping inside a card, use spacing and a hairline divider.
- **A page is not a card.** Page content sits on `background` in a centred column (`max-w-2xl` for reading, `max-w-4xl` for wide layouts), not inside a floating panel.
- **A detail's action panel is the one bordered section** (Figma: Panel akce A-05d, Panel skupiny A-08d). On desktop the facts and the main action sit on the right in `w-100 rounded-lg border border-border bg-card p-6`; on a phone there is no panel, the facts follow the title and the main action sits in a bar above the bottom navigation (`sticky bottom-16`, Figma: Lišta s akcí). It holds no cards. The landing page has its own one bordered section, the panel „Teď chybí jeden“ (A-01, A-01d) — same styling, no cards inside either.
- **Every page keeps the app chrome.** The header is present on every route, including login and sign-up. Pages never render as standalone islands.
- Forbidden by default: the centred-hero-plus-three-feature-cards layout, carousels, and any section whose only purpose is to look full.
- **No big empty areas on desktop** (PO). Pages sit on the 1200 px grid (`PAGE` in `src/lib/pageLayout.ts`). Use the width for real content: a form gets two columns (D-01d: „Co a kdy“ | „Kde“ with the map, D-06d), sign-in and sign-up show the nearest events next to the form, lists go into three columns. A narrow column with half the screen blank is a bug, not whitespace.

## Spacing

Use the scale only: `1, 2, 3, 4, 6, 8, 12, 16` (Tailwind units — 4px…64px). No arbitrary values like `p-[13px]`. Related things get `gap-2`/`gap-3`; separate blocks get `gap-6`/`gap-8`.

## Type

- One `h1` per page. Headings step down without skipping.
- **Two typefaces.** `h1` and the HobbyHub wordmark use Bricolage Grotesque (`font-heading`, applied to `h1` globally); everything else is Geist (`font-sans`). Don't put `font-heading` on body text, buttons or card titles.
- Sizes come from the scale: `text-sm` supporting, `text-base` body, `text-lg`/`text-xl` subheads, `text-2xl`+ page titles. Headings get `tracking-tight`; body does not.
- Sentence case everywhere. No ALL CAPS except a single small label style (`text-xs uppercase tracking-widest`), used sparingly.

## Copy

- **The app says „ty“ (tykání), everywhere** — buttons, errors, empty states, toasts, API messages the app shows: „Zkontroluj připojení a zkus to znovu.“, „Ověř si e-mail“. Never „vy“.
- **Keep it gender-neutral.** Past tense and adjectives in the second person give away a gender („jsi přihlášený“, „odhlásil ses“). Rephrase around them: „Máš na akci místo.“, „Na akci už nejdeš.“, „Zapomenuté heslo?“.
- **The app does not know anyone's gender, so other people are named by role, not by guess**: „organizátor“, „správce“ (also in labels like Person row „Organizátor“), and their actions in the passive or present tense — „Žádost je schválená.“, „Až ji organizátor schválí, přijde ti e-mail.“, „{jméno} už na akci nejde.“ Never „organizátorka schválila“, „Petra se odhlásila“.
- **Numbers decline.** „1 volné místo / 2–4 volná místa / 5+ volných míst“, „sešel se 1 člověk / sešli se 2–4 lidé / sešlo se 5+ lidí“. One helper per phrase, tested for 1, 2, 5 and 0.
- Content people write themselves (event and group descriptions) stays as they wrote it.

## Surfaces

- **Borders are hairlines**: `border border-border`. One border, not two adjacent ones.
- **Shadows are rare.** Only for things that genuinely float above the page — dropdowns, dialogs, toasts. Cards and inputs do not get shadows.
- Radius comes from the token (`rounded-lg`/`rounded-md`). Never mix radii in one component.
- **Every button is `rounded-lg`** (Figma Button, `radius/lg`), floating ones included. Pills (`rounded-full`) are for chips, badges, tags and avatars, never for a button.

## Forms

- Every input has a visible `<label>`. Placeholders are examples, never labels.
- Validation runs client-side _and_ server-side. The client message appears under the field.
- The submit button shows a pending state and is disabled while submitting.
- Never disable a submit button just because the form is untouched — let the user try and show them what's wrong.

## Every list has three states

Loading, empty, and error — all three, always. An empty list renders an empty state with one sentence saying what would appear here, not a blank area. An error renders the message and a way to retry.

Data refreshes itself: refetch when the tab regains focus, and invalidate the query after a mutation. A manual "reload" button in normal UI means one of those is missing — retry belongs in the error state only.

## Accessibility (the floor, not the ceiling)

- Buttons are `<button>`, links are `<a>`/`<Link>`. Never a `div` with `onClick`.
- Every icon-only control has an `aria-label`.
- Focus rings are never removed. If you restyle focus, it must stay clearly visible.
- Text contrast at least 4.5:1 — the tokens are chosen to satisfy this; hardcoded colours are how you break it.

## HobbyHub components

The Figma page „Design system“ is the reference. Build these once in `src/components/` and reuse them — never restyle them per screen.

- **Capacity bar** (Figma: Capacity bar) — the main brand element of an event. The fill is approved participants / maximum; a marker shows the minimum needed for the event to happen. Above the bar: the status on the left (`text-sm`), „6 z 10“ on the right (`text-xs text-muted-foreground`). Under the marker: „min. 8“ as a dark pill (`rounded-full bg-foreground text-background text-xs px-1.5`), centred on it — within 10 % of an end it aligns to the marker instead, so it never leaves the bar. The pill exists because testers missed the minimum (UX audit #173). Three states:
  - **Chybí** (below the minimum): status semibold „Chybí ještě 2“, the fill **hatched** (`capacity-hatch` — not confirmed yet), marker and label visible.
  - **Volná místa** (minimum reached — from exactly the minimum — and spots left): status regular „4 volná místa“ (the same phrase as the badge, not „Volná místa: 4“), the fill solid `bg-primary`, marker and label visible.
  - **Plno**: status „Plno“, status and count `text-muted-foreground`, full fill `bg-muted-foreground`, no marker, no label.
  - Below the minimum the fill always ends before the marker; from the minimum it reaches or passes it. The Figma variants share one set of placeholder texts — the texts above are the rule.
  - Track `bg-muted`, height 8px, `rounded-full`. Hatch (`@utility capacity-hatch` in `global.css`): `repeating-linear-gradient(-45deg, var(--primary) 0 3px, color-mix(in srgb, var(--primary-foreground) 55%, var(--primary)) 3px 6px)` — tokens only, one definition for both modes; the dark stripe is at least 3:1 against the track and against lime (`tokens.test.ts`). Stripes never move (moving stripes read as „loading“); if the fill width ever animates, only under `motion-safe:`.
  - Marker 3px wide and 22px tall (7px past the track on each side), `rounded-full bg-foreground` with a 2px `ring-background` gap (a gap, not a shadow), drawn above the fill: one style that shows on the track, the hatch and lime in both modes — the marker or its gap is at least 3:1 against each (`tokens.test.ts`). Widths and positions are computed from the numbers, never hardcoded.
- **Status badge** (Figma: Status badge) — `rounded-full`, `text-xs font-semibold`, `px-2 py-0.5`. Chybí = `bg-primary text-primary-foreground` (the only highlighted one); Volná = `bg-secondary text-secondary-foreground`; Plno = `bg-muted text-muted-foreground`; Zrušeno = `bg-foreground text-background`. Labels: „Chybí X“ (X = people missing to the minimum), „N volných míst“ with Czech plural — „1 volné místo“, „2–4 volná místa“, „5+ volných míst“ (free places, bug #189), „Plno“, „Zrušeno“.
  - In Moje akce › Přihlášen the badge shows the user's own place instead of occupancy: **Jdu** = `bg-secondary text-secondary-foreground`, **Čeká na schválení** = `bg-muted text-muted-foreground` (Figma variants Jdu and Čeká, `StatusBadge` kinds `going` / `pending`). Never use them for occupancy.
  - A past event (filter Proběhlé, #61) shows **Proběhlo** = `border border-border text-muted-foreground`, no fill; instead of the occupancy bar the card says „sešlo se N“ (approved participants, declined — see Copy). The past event's detail (A-05h) has the badge and „Sešlo se N lidí“ instead of the bar, no stamp, no Kdo jde, and „Podobné akce v okolí“ as its action.
- **Koná se?** — the brand idea: an event below its minimum is a question, an event at its minimum is happening. The hatch of the capacity bar means „not happening yet, people are missing“, the solid lime fill means „it's on“. Everything below builds on that, nothing else (no dots, no colours per category — UX audit #173).
  - **Capacity bar/Mini** (Figma) on the event card, after the status badge: 72 × 6 px, same three states as the capacity bar (hatch / lime / `bg-muted-foreground`), marker 2 × 14 px at the minimum, no texts. After it only the locality (`Facts`, e.g. „Praha 7“), or the distance when the list is sorted by distance (A-02g, #57); the number „3/12“ is gone from the card (#189). _Pending PO:_ in Moje akce › Přihlášen, where the badge says Jdu / Čeká, an event below its minimum starts the facts with „chybí N“ („chybí 1 · Praha 9“) — that is what a participant wants to know there. The bar is `aria-hidden`; the card carries the sentence for screen readers: „3 z 12 přihlášených, do minima chybí 1“. A cancelled event shows no bar.
  - **Stamp „Koná se“** (Figma: Stamp/Koná se) — Bricolage Grotesque 13 px, `text-secondary-foreground` with a 1.5 px `border-secondary-foreground` ring, `rounded-md`, rotated −6°. Only on the event detail, above the capacity bar, when the minimum is reached (Volná místa or Plno). Never on cards (a list full of stamps says nothing).
  - **The join moment** (A-05c): when the viewer's own join reaches the minimum, the hatch turns solid, the stamp appears and the panel shows the **„Máš místo“ block** — not an `Alert`: `rounded-lg bg-secondary text-secondary-foreground p-4`, Logo/Mark/Plná parta (28 px) on the left, „Máš místo. Parta je o jednoho větší.“ (`font-semibold`) and „Díky tobě se akce koná – sešlo se 6 lidí, minimum je 6.“ (declined: „sešli se 3 lidé“). Otherwise only the first sentence. Animation (the fourth dot filling, the stamp landing) only under `motion-safe:`.
  - **„Kdo jde · 5 z 10“** on the detail: a viewer who may see names (#174) sees `Avatar`s and the names; everyone else only one sentence — „Jména uvidíš, až budeš na akci.“ / „Jména uvidíš, až tě organizátor schválí.“ — no placeholder seats. The viewer's own avatar comes first, labelled „Ty“, marked with `ring-2 ring-foreground` — never a lime fill.
- **Logo/Mark/Plná parta** (Figma) — the logo with its empty fourth dot filled: the party is complete and the missing one is you. Only in the join moment, the loading screen (X-01: the dot fills and empties while loading, `motion-safe:` only, otherwise the static logo) and the header of the approval e-mail (E-01a). Everywhere else the normal logo.
- **Landing panel „Teď chybí jeden“** (A-01, A-01d) — the event with the fewest people missing in the locality: activity tile, title, „Ne 25. 10. (za 2 dny) · 18:00 · místo“ (relative day only within 6 days: dnes, zítra, za 2 dny … za 6 dní), the capacity bar, „5 z 10 už jde, do minima chybí 1. Přijď a hraje se.“ and „Doplnit partu“ (outline) to the detail. When nothing in the locality is missing anyone: „Všechny akce v okolí mají svoje minimum. Mrkni, kde jsou ještě volná místa.“ + „Akce s volnými místy“; when there is no upcoming event: „V okolí teď nic není. Buď první – založ akci a dej o ní vědět.“ + „Zaregistrovat se“ / „Založit akci“ (Figma: A-01 · Panel – bez akce). The panel never disappears.
- _Pending PO:_ **Share preview** (A-05s) — the `og:image` (1200 × 630) of an event link: logo, „Chybí 1 – třeba ty?“ / „Koná se · N volných míst“ / no call to action when full, the title, „Ne 25. 10. · 18:00 · Praha 4“ and the capacity bar. Light tokens only. Cancelled and members-only events get a generic image without details. Tracked in #102 (Obrázek akce ke sdílení).
- **Voice** — the app talks like a friend who organizes things: short, warm, never cute at the expense of clarity. Examples in docs/ux-audit.md › B3. The brand line is „Někde zrovna chybí jeden do party. Třeba ty.“ Empty states say what would be here and the next step („Zatím nejdeš na žádnou akci. Mrkni, komu v okolí chybí lidé.“). Tykání and gender-neutral rules (Copy) still apply.
- **Activity tag** (Figma: Tag/Activity) — the activity of an event or group: `rounded-full bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1`. Shows the activity name (second level), not the category.
- **Activity tile** (Figma: Activity tile) — the category icon on an event card, one variant per category from B-002. An event card shows this icon, not a photo. All categories share the `secondary` tile; no colour per category (UX audit #173).
- **Person row** (Figma: Person row) — a request can carry the applicant's optional message (#175, max. 500 characters), shown in quotes under the status (`text-sm text-foreground`).
- **Event card/Map preview** (Figma) — the card after tapping a map pin (#56): the card's data plus the first two lines of the description and „Detail akce →“; it floats over the map, so it is the one card with a shadow (Elevation/Float).
- **Založit akci** — lives in Moje akce only, where people manage their events; /akce is for finding them, and the header stays navigation. One button for the whole page, in both tabs, like „Založit skupinu“ on Skupiny: desktop right of the „Moje akce“ title, mobile floating above the bottom navigation. On /akce a signed-in user also gets one quiet link „+ Založit akci“ (ghost) next to the number of events (Figma A-02, A-02d) — 36 of 100 testers did not find it elsewhere (UX audit #173). /akce finding nothing (`EmptyEvents`) keeps „Založit akci“ as the empty state's next step. Never in the header and never a floating button on /akce. The dialog after e-mail verification offers „Založit akci“ next to the way back, and the landing page's closing line („Nic pro tebe? Založ vlastní akci…“) ends with „Založit akci“ for a signed-in user (a visitor gets „Zaregistrovat se“).
- **Navigation** — desktop: header with logo, Akce, Skupiny (active item `bg-muted font-semibold`). Mobile: bottom navigation with icon + label, active item has a lime pill (`bg-primary rounded-full`) behind the icon; an inactive item has both icon and label in `muted-foreground`. The map is part of Akce, never its own item.

## When you are unsure

Prefer less: fewer borders, fewer boxes, fewer font sizes, more whitespace. If a screen feels plain, the fix is usually better spacing and clearer hierarchy, not another container.

## Extending this file

When a code review keeps repeating the same UI feedback, add it here as a rule. That is the point of the file: expectations live in the repo, not in someone's head.
