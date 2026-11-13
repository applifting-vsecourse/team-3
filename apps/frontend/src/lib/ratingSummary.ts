/** An average with its count, as the API sends it (rating-summary.ts). */
export type RatingSummary = { average: number | null; count: number }

/**
 * An average as DESIGN.md › Copy shows it: „★ 4,5 (6 hodnocení)“, or „zatím bez hodnocení“ — always
 * with the count, never a bare 0. For the rating pages (#66); the profiles have their own copy.
 */
export function ratingSummaryLabel({ average, count }: RatingSummary): string {
  if (average === null || count === 0) return "zatím bez hodnocení"
  return `★ ${average.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} (${count} hodnocení)`
}
