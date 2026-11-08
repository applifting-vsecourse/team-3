/**
 * Map pin markup (Figma: Map pin). The paths come from the Figma component;
 * colours are token classes, never hex (DESIGN.md › Colour):
 * - default: dark pin
 * - highlighted: larger lime pin — an event that still misses people; its
 *   outline and dot are primary-foreground, dark in both themes like text on lime
 * - full: muted pin
 */
export type PinVariant = "default" | "highlighted" | "full"

const SMALL = { width: 30, height: 37.5 }
const LARGE = { width: 40, height: 50 }

export const pinSize = (variant: PinVariant) => (variant === "highlighted" ? LARGE : SMALL)

const smallPin = (body: string) =>
  `<svg width="30" height="37.5" viewBox="0 0 30 37.5" fill="none" aria-hidden="true">` +
  `<path class="${body} stroke-background" stroke-width="2.5" d="M15 36.25C15 36.25 27.5 24.375 27.5 14.375C27.5 7.125 21.875 1.875 15 1.875C8.125 1.875 2.5 7.125 2.5 14.375C2.5 24.375 15 36.25 15 36.25Z"/>` +
  `<path class="fill-background" d="M15 19.375C17.7614 19.375 20 17.1364 20 14.375C20 11.6136 17.7614 9.375 15 9.375C12.2386 9.375 10 11.6136 10 14.375C10 17.1364 12.2386 19.375 15 19.375Z"/>` +
  `</svg>`

const largePin =
  `<svg width="40" height="50" viewBox="0 0 40 50" fill="none" aria-hidden="true">` +
  `<path class="fill-primary stroke-primary-foreground" stroke-width="3.33333" d="M20 48.3333C20 48.3333 36.6667 32.5 36.6667 19.1667C36.6667 9.5 29.1667 2.5 20 2.5C10.8333 2.5 3.33333 9.5 3.33333 19.1667C3.33333 32.5 20 48.3333 20 48.3333Z"/>` +
  `<path class="fill-primary-foreground" d="M20 25.8333C23.6819 25.8333 26.6667 22.8486 26.6667 19.1667C26.6667 15.4848 23.6819 12.5 20 12.5C16.3181 12.5 13.3333 15.4848 13.3333 19.1667C13.3333 22.8486 16.3181 25.8333 20 25.8333Z"/>` +
  `</svg>`

const SVG: Record<PinVariant, string> = {
  default: smallPin("fill-foreground"),
  highlighted: largePin,
  full: smallPin("fill-muted-foreground"),
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

// Figma: Map pin, vybraný — 1.3× bigger, with a shadow; the tip stays on the place.
const SELECTED_SCALE = 1.3

/**
 * HTML for a Leaflet divIcon. `label` (Figma: Popisek špendlíku) is shown
 * above the pin while its event card is hovered or the pin is selected
 * (`isSelected`, #56: the one bigger pin, its preview open).
 */
export function pinHtml(variant: PinVariant, label?: string, { isSelected = false } = {}): string {
  const { width, height } = pinSize(variant)
  // above the grown pin, not into it
  const tipOffset = isSelected ? Math.round(height * (SELECTED_SCALE - 1)) + 4 : 4
  const tip = label
    ? `<span class="absolute bottom-full left-1/2 -translate-x-1/2 rounded-lg bg-foreground px-3 py-1 text-xs font-medium whitespace-nowrap text-background shadow-md" style="margin-bottom:${tipOffset}px">${escapeHtml(label)}</span>`
    : ""
  const svg = isSelected
    ? `<span class="block origin-bottom drop-shadow-md" style="transform:scale(${SELECTED_SCALE})">${SVG[variant]}</span>`
    : SVG[variant]
  return `<span class="relative block" style="width:${width}px">${tip}${svg}</span>`
}

/** Figma: Map cluster — 44 px, the count on `foreground`, a `background` edge. */
export const CLUSTER_SIZE = 44

/**
 * A cluster of nearby pins (#56): the count, and a lime ring when it holds an
 * event that still misses people (DESIGN.md › Map pin and cluster).
 */
export function clusterHtml(count: number, hasMissing: boolean): string {
  const ring = hasMissing ? " ring-3 ring-primary" : ""
  return `<span class="flex size-11 items-center justify-center rounded-full border-3 border-background bg-foreground text-sm font-semibold text-background shadow-md${ring}">${count}</span>`
}
