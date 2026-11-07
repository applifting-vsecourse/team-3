import type { RatingSummary } from "@/features/profile/api/profileSchemas"

/** An average as DESIGN.md › Copy shows it: „★ 4,5 (6 hodnocení)“, or „zatím bez hodnocení“. */
export function formatRatingSummary({ average, count }: RatingSummary): string {
  if (average === null) return "zatím bez hodnocení"
  return `★ ${average.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} (${count} hodnocení)`
}
