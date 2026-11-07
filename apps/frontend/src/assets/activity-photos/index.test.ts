import { describe, expect, it } from "vitest"

import { activityPhoto } from "./index"

describe("activityPhoto", () => {
  it("finds an activity's photo by its slug, in both widths", () => {
    const photo = activityPhoto("florbal")

    expect(photo?.src).toMatch(/florbal-480\.webp/)
    expect(photo?.srcSet).toMatch(/florbal-480\.webp 480w, .*florbal-960\.webp 960w/)
  })

  it("has none for an activity the library doesn't cover yet", () => {
    expect(activityPhoto("rybareni")).toBeUndefined()
  })
})
