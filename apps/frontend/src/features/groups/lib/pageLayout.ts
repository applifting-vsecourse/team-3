/**
 * The column of every groups page. Desktop (Figma A-07d, A-08d, D-06d, D-07d):
 * 1200 px of content with 120 px margins at 1440 — max-w-7xl (1280) minus
 * px-10 on each side, the header's own inset. Mobile: 16 px margins.
 */
export const GROUPS_PAGE =
  "mx-auto flex w-full max-w-7xl flex-col px-4 py-6 md:px-10 md:pt-8 md:pb-12"

/** Desktop forms stay a narrow column aligned left (Figma D-06d: 640 px). */
export const GROUPS_FORM = "flex w-full max-w-160 flex-col gap-5"
