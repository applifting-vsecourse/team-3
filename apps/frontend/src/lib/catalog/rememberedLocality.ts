const KEY = "hobbyhub.lokalita"
const SLUG = /^[a-z0-9-]+$/

const listeners = new Set<() => void>()
// Where a pick lives when the browser blocks storage (a private window): until
// the page reloads. The landing page has no URL to hold it (review #274).
let inMemory: string | undefined
let isStorageBlocked = false

/**
 * The locality the visitor picked in a filter, remembered in this browser
 * only (#55), so /akce, /skupiny and the landing page start there next time.
 * „Zrušit vše“ forgets it. Storage can be blocked (a private window): then
 * the pick holds in memory until the page reloads.
 */
export function getRememberedLocality(): string | undefined {
  if (isStorageBlocked) return inMemory
  try {
    const slug = localStorage.getItem(KEY)
    return slug && SLUG.test(slug) ? slug : undefined
  } catch {
    isStorageBlocked = true
    return inMemory
  }
}

export function rememberLocality(slug: string | undefined): void {
  inMemory = slug
  try {
    if (slug === undefined) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, slug)
  } catch {
    // blocked storage: the pick holds in memory (getRememberedLocality)
    isStorageBlocked = true
  }
  for (const listener of listeners) listener()
}

export const forgetLocality = (): void => rememberLocality(undefined)

/** For tests: a fresh start, as after a reload. */
export function resetRememberedLocalityMemory(): void {
  inMemory = undefined
  isStorageBlocked = false
}

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
