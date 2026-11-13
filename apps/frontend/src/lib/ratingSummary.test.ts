import { describe, expect, it } from "vitest"

import { ratingSummaryLabel } from "./ratingSummary"

describe("ratingSummaryLabel (DESIGN.md › Copy)", () => {
  it("the average with a decimal comma and its count", () => {
    expect(ratingSummaryLabel({ average: 4.5, count: 6 })).toBe("★ 4,5 (6 hodnocení)")
    expect(ratingSummaryLabel({ average: 5, count: 1 })).toBe("★ 5 (1 hodnocení)")
  })

  it("without ratings it says so, never ★ 0", () => {
    expect(ratingSummaryLabel({ average: null, count: 0 })).toBe("zatím bez hodnocení")
  })
})
