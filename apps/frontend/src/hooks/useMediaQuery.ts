import { useSyncExternalStore } from "react"

/** Tailwind's `md` breakpoint: desktop layout from here up. */
export const DESKTOP_QUERY = "(min-width: 768px)"

/** Whether a CSS media query matches, kept in sync on resize. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      // jsdom (tests) has no matchMedia
      if (typeof window.matchMedia !== "function") return () => undefined
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches,
  )
}
