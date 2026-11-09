import { describe, expect, it } from "vitest"

import { profileKeys } from "./profileQueryOptions"
import { profileInputSchema } from "./profileSchemas"

describe("private profile client boundaries (#178)", () => {
  it("does not share private cache entries between accounts", () => {
    expect(profileKeys.self("one")).not.toEqual(profileKeys.self("two"))
    expect(profileKeys.overview("one")).not.toEqual(profileKeys.overview("two"))
  })
  it("applies the existing sign-up name rule and limits the interests list", () => {
    expect(
      profileInputSchema.safeParse({ name: "Jana 123", homeLocalityId: null, interestIds: [] })
        .success,
    ).toBe(false)
    expect(
      profileInputSchema.safeParse({
        name: "Jana Nová",
        homeLocalityId: null,
        interestIds: Array.from({ length: 51 }, (_, i) => String(i)),
      }).success,
    ).toBe(false)
  })
})
