const KEY = "hobbyhub.lokalita"
const SLUG = /^[a-z0-9-]+$/

const listeners = new Set<() => void>()

/**
 * The locality the visitor picked in a filter, remembered in this browser
 * only (#55), so /akce, /skupiny and the landing page start there next time.
 * „Zrušit vše“ forgets it. Storage can be blocked (a private window): then
 * nothing is remembered and the lists still work.
 */
export function getRememberedLocality(): string | undefined {
  try {
    const slug = localStorage.getItem(KEY)
    return slug && SLUG.test(slug) ? slug : undefined
  } catch {
    return undefined
  }
}

export function rememberLocality(slug: string | undefined): void {
  try {
    if (slug === undefined) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, slug)
  } catch {
    // blocked storage: the pick holds for this page only, through the URL
  }
  for (const listener of listeners) listener()
}

export const forgetLocality = (): void => rememberLocality(undefined)

/** For useSyncExternalStore; another tab's change counts too. */
export function subscribeRememberedLocality(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}
