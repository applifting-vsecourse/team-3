# Design contract

Read this before writing or changing any UI — human or agent.

These are rules, not suggestions. When a rule and a "nicer looking" idea disagree, the rule wins. Consistency across every screen beats a clever one.

`src/components/ui/**` is vendored shadcn — treat it as a third-party kit and restyle via tokens rather than rewriting it.

**Tokens live in `apps/frontend/src/styles/global.css`.** That file is the only source of truth for colour, radius, shadows and fonts. This file says how to _use_ them. The values come from the Figma collection „HobbyHub tokens“ in [HobbyHub-design](https://www.figma.com/design/dGYGqD8BjC1rYlbfjCpxWD/HobbyHub-design) (page „Design system“), with the same names. When Figma changes, update `global.css` — never patch a colour in a component.

## Colour

- **Never hardcode a colour.** No `#hex`, no `bg-blue-500`, no `rgb()`. Use the semantic classes only: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-primary`, `bg-secondary`, `border-border`, `bg-destructive`.
- **`primary` is for actions, not decoration.** One primary button per view. Everything else is `outline`, `ghost` or a plain link.
- **`primary` (lime) is a fill, never a text or icon colour.** Lime on white fails contrast. Text on a lime fill is `primary-foreground`. The only non-button uses of lime are the brand elements below: the capacity bar fill, the „Chybí“ badge, the „Chybí“ map pin, the active bottom-nav pill and the logo.
- **`secondary` (light green) is for quiet brand labels** — the activity tag and the „Volná místa“ badge — with `secondary-foreground` text.
- **`destructive` only for destructive actions and errors.** Never for emphasis. In dark mode it is lighter (`#f97066`), because error text needs 4.5:1 on a dark card; the token test in `src/styles/tokens.test.ts` checks the text pairs in both modes.
- **`accent` is a hover/active surface, not a brand colour.** It tints menu items and ghost buttons on hover, so it must stay quiet. The brand colour is `primary`.
- Body text is `foreground`; supporting text is `muted-foreground`. There is no third level.
- **Every screen must work in both modes.** Never use `text-white`/`bg-black` or the kit's default `dark:` overrides; text and icons on a filled surface use that surface's `-foreground` token, and a selected/on state must restate its `dark:` classes if the default state has any. Check dark mode in Figma by switching the frame to mode „Dark“ (page „Tmavý režim“ shows all components). The one exception is the kit's `bg-black/50` overlay behind dialogs and drawers: Figma has no overlay token, and darkening the page works in both modes.

## Layout

- **Cards are for separable items in a list** — an event, a group, a search result. They are not page sections and not layout tools.
- **Never nest a card inside a card.** If content needs grouping inside a card, use spacing and a hairline divider.
- **A page is not a card.** Page content sits on `background` in a centred column (`max-w-2xl` for reading, `max-w-4xl` for wide layouts), not inside a floating panel.
- **Every page keeps the app chrome.** The header is present on every route, including login and sign-up. Pages never render as standalone islands.
- Forbidden by default: the centred-hero-plus-three-feature-cards layout, carousels, and any section whose only purpose is to look full.

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

- **Capacity bar** (Figma: Capacity bar) — the main brand element of an event. The bar is approved participants / maximum, the vertical tick is the minimum needed for the event to happen. Above it: the status on the left (`text-sm`), „6 z 10 · min. 8“ on the right (`text-xs text-muted-foreground`). Three states:
  - **Chybí** (below the minimum): status semibold „Chybí ještě 2“, fill `bg-primary`, tick visible.
  - **Volná místa** (minimum reached, spots left): status regular, fill `bg-primary`, tick visible.
  - **Plno**: status and count `text-muted-foreground`, full fill `bg-muted-foreground`, no tick.
  - Track `bg-muted`, height 8px, `rounded-full`; tick `bg-foreground`, 2px wide. Widths are computed from the numbers, never hardcoded.
- **Status badge** (Figma: Status badge) — `rounded-full`, `text-xs font-semibold`, `px-2 py-0.5`. Chybí = `bg-primary text-primary-foreground` (the only highlighted one); Volná = `bg-secondary text-secondary-foreground`; Plno = `bg-muted text-muted-foreground`; Zrušeno = `bg-foreground text-background`. Labels: „Chybí X“, „Volná místa“, „Plno“, „Zrušeno“.
- **Activity tag** (Figma: Tag/Activity) — the activity of an event or group: `rounded-full bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1`. Shows the activity name (second level), not the category.
- **Activity tile** (Figma: Activity tile) — the category icon on an event card, one variant per category from B-002. An event card shows this icon, not a photo.
- **Založit akci** — the primary action of a signed-in user. Desktop: a button in the header, before the user menu, on every page but the form itself. Mobile: a floating button over the page, above the bottom navigation. Never both on one screen.
- **Navigation** — desktop: header with logo, Akce, Skupiny (active item `bg-muted font-semibold`). Mobile: bottom navigation with icon + label, active item has a lime pill (`bg-primary rounded-full`) behind the icon; an inactive item has both icon and label in `muted-foreground`. The map is part of Akce, never its own item.

## When you are unsure

Prefer less: fewer borders, fewer boxes, fewer font sizes, more whitespace. If a screen feels plain, the fix is usually better spacing and clearer hierarchy, not another container.

## Extending this file

When a code review keeps repeating the same UI feedback, add it here as a rule. That is the point of the file: expectations live in the repo, not in someone's head.
