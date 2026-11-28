import { describe, expect, it } from "vitest"

import { TOAST_BOTTOM, toastBottom } from "./useToastClearance"

describe("toastBottom (PO 26. 11., review #443)", () => {
  it("nothing marked: just above the bottom navigation", () => {
    expect(toastBottom([], 844)).toBe(TOAST_BOTTOM)
  })

  it("over the highest marked element, with a gap: the detail's bar after „Přijdu“", () => {
    // the bar holds „Máš místo“ and „Odhlásit se“ from 625 px down, the navigation from 780
    expect(toastBottom([625, 780], 844)).toBe(844 - 625 + 12)
  })

  it("never lower than above the navigation", () => {
    expect(toastBottom([800], 844)).toBe(TOAST_BOTTOM)
  })
})
