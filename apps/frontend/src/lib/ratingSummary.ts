/** An average with its count, as the API sends it (rating-summary.ts). */
export type RatingSummary = { average: number | null; count: number }

/** An average with a decimal comma and at most one decimal: „4,5“. */
export const formatAverage = (average: number): string =>
  average.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })

/**
 * An average as DESIGN.md › Copy shows it: „★ 4,5 (6 hodnocení)“, or „zatím bez hodnocení“ — always
 * with the count, never a bare 0. The one place for it: profiles, public profiles, rating pages.
 */
export function ratingSummaryLabel({ average, count }: RatingSummary): string {
  if (average === null || count === 0) return "zatím bez hodnocení"
  return `★ ${formatAverage(average)} (${count} hodnocení)`
}
