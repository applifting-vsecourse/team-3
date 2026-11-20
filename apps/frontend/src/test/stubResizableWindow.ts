import { act } from "@testing-library/react"
import { vi } from "vitest"

import { DESKTOP_QUERY } from "@/hooks/useMediaQuery"

/**
 * A window whose width can cross the desktop breakpoint (768 px) mid-test (#316): returns
 * the resize. Undo with `vi.unstubAllGlobals()`.
 */
export function stubResizableWindow(isDesktop: boolean) {
  const listeners = new Set<() => void>()
  let isWide = isDesktop
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query === DESKTOP_QUERY && isWide
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }))
  return (isNowDesktop: boolean) => {
    isWide = isNowDesktop
    act(() => listeners.forEach((listener) => listener()))
  }
}
