import { describe, expect, it } from "vitest"

import { partnersSearchSchema, radiusFromSearch, widerRadius } from "./partnersSearch"

describe("/partaci?okoli= (#84)", () => {
  it("starts at +10 km and takes 10, 25 or 50", () => {
    expect(radiusFromSearch(partnersSearchSchema.parse({}))).toBe(10)
    expect(radiusFromSearch(partnersSearchSchema.parse({ okoli: "25" }))).toBe(25)
    expect(radiusFromSearch(partnersSearchSchema.parse({ okoli: 50 }))).toBe(50)
    expect(radiusFromSearch(partnersSearchSchema.parse({ okoli: "7" }))).toBe(10)
  })

  it("widens 10 → 25 → 50, then no more", () => {
    expect(widerRadius(10)).toBe(25)
    expect(widerRadius(25)).toBe(50)
    expect(widerRadius(50)).toBeUndefined()
  })
})
