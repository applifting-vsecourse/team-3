import type * as PasswordCheckerModule from "@/features/auth/lib/password-checker"

export type PasswordChecker = typeof PasswordCheckerModule

let loading: Promise<PasswordChecker> | null = null

/**
 * #153: the strength estimator, loaded on first use into a chunk of its own,
 * so its dictionaries (~0.55 MB gzipped) never weigh on the pages. Loaded
 * once; after a failure (offline, an old chunk gone after a deploy) the next
 * call tries again.
 */
export function loadPasswordChecker(): Promise<PasswordChecker> {
  loading ??= import("@/features/auth/lib/password-checker").catch((error: unknown) => {
    loading = null
    throw error
  })
  return loading
}

/** Starts loading it ahead of use, e.g. when the password field gets focus. */
export function preloadPasswordChecker(): void {
  // a failure only means the meter shows the rule alone; using it tries again
  loadPasswordChecker().catch(() => undefined)
}
