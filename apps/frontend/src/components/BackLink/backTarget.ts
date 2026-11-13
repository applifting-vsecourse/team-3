// Where „back“ leads (N9, #187): the router remembers the path of every history entry it
// resolved, by the entry's index, so the back link can name the page it really returns to —
// „Moje akce“ when the user came from there, not a fixed „Akce“. After a reload the
// earlier entries are unknown and the link says „Zpět“.
const pathByIndex = new Map<number, string>()

/** Called by the router on every resolved navigation. */
export function rememberHistoryEntry(index: number | undefined, pathname: string): void {
  if (index !== undefined) pathByIndex.set(index, pathname)
}

/** The path one step back from the entry at `index`, if this session saw it. */
export const previousPath = (index: number | undefined): string | undefined =>
  index === undefined ? undefined : pathByIndex.get(index - 1)

/** For tests. */
export const forgetHistory = (): void => pathByIndex.clear()

const LABELS: [RegExp, string][] = [
  [/^\/$/, "Úvod"],
  [/^\/akce\/?$/, "Akce"],
  [/^\/moje\/akce\/?$/, "Moje akce"],
  [/^\/moje\/skupiny\/?$/, "Moje skupiny"],
  [/^\/skupiny\/?$/, "Skupiny"],
  [/^\/profil\/?$/, "Profil"],
  [/^\/akce\/[^/]+\/sprava\/?$/, "Správa akce"],
  [/^\/skupiny\/[^/]+\/sprava\/?$/, "Správa skupiny"],
  // after the fixed ones: „nova“ is a form, not a detail
  [/^\/akce\/(?!nova\/?$)[^/]+\/?$/, "Detail akce"],
  [/^\/skupiny\/(?!nova\/?$)[^/]+\/?$/, "Skupina"],
]

/** The back link's label for a page of the app, or undefined where „Zpět“ says it better. */
export function backLabel(pathname: string | undefined): string | undefined {
  if (pathname === undefined) return undefined
  return LABELS.find(([pattern]) => pattern.test(pathname))?.[1]
}
