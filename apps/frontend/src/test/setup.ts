import "@testing-library/jest-dom/vitest"

import { vi } from "vitest"

// Browser APIs jsdom lacks but Radix popovers and cmdk lists call.
globalThis.ResizeObserver ??= class {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
Object.defineProperty(Element.prototype, "scrollIntoView", { value: vi.fn(), configurable: true })
// The router restores scroll on navigation (renderWithRouter).
Object.defineProperty(window, "scrollTo", { value: vi.fn(), configurable: true })
