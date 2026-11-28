/**
 * How often the home locality may change (#84). Najdi parťáka shows the distance between home
 * localities in bands; moving one's home again and again and watching a person's band change
 * would narrow down where they live (distance oracles, USENIX Security '24). A few changes a
 * Prague day are plenty for someone who really moved or picked the wrong district.
 */
export const HOME_CHANGES_PER_DAY = 3;

export type HomeChangeCounter = { day: string | null; count: number };

/** A change today: allowed while the day has changes left, counted from a fresh day. */
export function decideHomeChange(
  counter: HomeChangeCounter,
  today: string,
): { ok: true; next: { day: string; count: number } } | { ok: false } {
  const count = counter.day === today ? counter.count : 0;
  return count >= HOME_CHANGES_PER_DAY
    ? { ok: false }
    : { ok: true, next: { day: today, count: count + 1 } };
}
