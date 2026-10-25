/**
 * The column of every page but the list with the map (/akce) and the sign-in
 * pages. Desktop (Figma A-07d, D-03d, D-06d, C-01d…): 1200 px of content with
 * 120 px margins at 1440 — max-w-7xl (1280) minus px-10 on each side, the
 * header's own inset. Mobile: 16 px margins.
 */
export const PAGE = "mx-auto flex w-full max-w-7xl flex-col px-4 py-6 md:px-10 md:pt-8 md:pb-12"

/**
 * A form page: the title and the form over the whole grid. On desktop the form
 * itself splits into two columns (Figma D-01d, D-06d), so no half of the screen
 * stays empty (DESIGN.md › Layout).
 */
export const FORM = "flex w-full flex-col gap-5"
