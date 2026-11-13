/**
 * Map pin markup (Figma: Map pin, #249). Every unselected pin is one size and
 * tells its state only by colour (DESIGN.md › Map pin and cluster). The paths
 * come from the Figma component; colours are token classes, never hex
 * (DESIGN.md › Colour):
 * - default: dark pin — Volná místa
 * - highlighted: lime pin — an event that still misses people; its outline
 *   and dot are primary-foreground, dark like text on lime, so
 *   its edge keeps 3:1 against the light map where lime alone would not
 * - full: muted pin — Plno; with an occupancy filter the API sends no full events
 */
export type PinVariant = "default" | "highlighted" | "full"

// Figma: Map pin 32 × 40
const PIN = { width: 32, height: 40 }

/**
 * The marker's box: the pin centred in a 40 × 40 target (DESIGN.md › Accessibility),
 * its tip on the bottom edge, so the anchor is the bottom centre.
 */
export const PIN_BOX = { width: 40, height: 40 }

const pinSvg = (viewBox: string, paths: string) =>
  `<svg width="${PIN.width}" height="${PIN.height}" viewBox="${viewBox}" fill="none" aria-hidden="true">${paths}</svg>`

const darkPin = (body: string) =>
  pinSvg(
    "0 0 30 37.5",
    `<path class="${body} stroke-background" stroke-width="2.5" d="M15 36.25C15 36.25 27.5 24.375 27.5 14.375C27.5 7.125 21.875 1.875 15 1.875C8.125 1.875 2.5 7.125 2.5 14.375C2.5 24.375 15 36.25 15 36.25Z"/>` +
      `<path class="fill-background" d="M15 19.375C17.7614 19.375 20 17.1364 20 14.375C20 11.6136 17.7614 9.375 15 9.375C12.2386 9.375 10 11.6136 10 14.375C10 17.1364 12.2386 19.375 15 19.375Z"/>`,
  )

const limePin = pinSvg(
  "0 0 40 50",
  `<path class="fill-primary stroke-primary-foreground" stroke-width="3.33333" d="M20 48.3333C20 48.3333 36.6667 32.5 36.6667 19.1667C36.6667 9.5 29.1667 2.5 20 2.5C10.8333 2.5 3.33333 9.5 3.33333 19.1667C3.33333 32.5 20 48.3333 20 48.3333Z"/>` +
    `<path class="fill-primary-foreground" d="M20 25.8333C23.6819 25.8333 26.6667 22.8486 26.6667 19.1667C26.6667 15.4848 23.6819 12.5 20 12.5C16.3181 12.5 13.3333 15.4848 13.3333 19.1667C13.3333 22.8486 16.3181 25.8333 20 25.8333Z"/>`,
)

const SVG: Record<PinVariant, string> = {
  default: darkPin("fill-foreground"),
  highlighted: limePin,
  full: darkPin("fill-muted-foreground"),
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

// Figma: Map pin, vybraný — 1.3× bigger, a focus-style ring and a shadow; the tip stays on the place.
const SELECTED_SCALE = 1.3
const SELECTED_OUTLINE = [
  "drop-shadow(1.5px 0 0 var(--ring))",
  "drop-shadow(-1.5px 0 0 var(--ring))",
  "drop-shadow(0 1.5px 0 var(--ring))",
  "drop-shadow(0 -1.5px 0 var(--ring))",
  "drop-shadow(0 4px 6px color-mix(in srgb, var(--foreground) 25%, transparent))",
].join(" ")

/**
 * HTML for a Leaflet divIcon. `label` (Figma: Popisek špendlíku) is shown
 * above the pin while its event card is hovered or the pin is selected
 * (`isSelected`, #56: the one bigger pin, its preview open).
 */
export function pinHtml(variant: PinVariant, label?: string, { isSelected = false } = {}): string {
  // above the grown pin, not into it
  const tipOffset = isSelected ? Math.round(PIN.height * (SELECTED_SCALE - 1)) + 4 : 4
  const tip = label
    ? `<span class="absolute bottom-full left-1/2 -translate-x-1/2 rounded-lg bg-foreground px-3 py-1 text-xs font-medium whitespace-nowrap text-background shadow-md" style="margin-bottom:${tipOffset}px">${escapeHtml(label)}</span>`
    : ""
  // the focus-style ring follows the pin's shape: its outline in `ring` on four sides, then a shadow
  const svg = isSelected
    ? `<span class="block origin-bottom" style="transform:scale(${SELECTED_SCALE});filter:${SELECTED_OUTLINE}">${SVG[variant]}</span>`
    : SVG[variant]
  // the pin stands on the bottom centre of its 40 × 40 target
  return `<span class="relative flex items-end justify-center" style="width:${PIN_BOX.width}px;height:${PIN_BOX.height}px">${tip}${svg}</span>`
}

/** Figma: Map cluster — 44 px, the count on `foreground`, a `background` edge. */
export const CLUSTER_SIZE = 44

/**
 * A cluster of nearby pins (#56): the count, and a lime ring when it holds an
 * event that still misses people (DESIGN.md › Map pin and cluster).
 */
export function clusterHtml(count: number, hasMissing: boolean): string {
  // lime on the light map carries the primary-edge outline (DESIGN.md › Colour): the lime ring
  // alone is 1.16:1 against the map
  const ring = hasMissing
    ? " ring-3 ring-primary outline-1 outline-offset-3 outline-primary-edge"
    : ""
  return `<span class="flex size-11 items-center justify-center rounded-full border-3 border-background bg-foreground text-sm font-semibold text-background shadow-md${ring}">${count}</span>`
}
