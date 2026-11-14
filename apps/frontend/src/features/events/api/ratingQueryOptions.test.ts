import { describe, expect, it } from "vitest"

import { ratingKeys } from "./ratingQueryOptions"

const startsWith = (key: readonly unknown[], prefix: readonly unknown[]) =>
  prefix.every((part, index) => key[index] === part)

describe("ratingKeys (review #322)", () => {
  it("each kind has its own segment: invalidating one never reaches another by prefix", () => {
    const keys = [
      ratingKeys.mine("e1", "u"),
      ratingKeys.participants("e1", "u"),
      ratingKeys.received("e1", "u"),
    ]
    for (const key of keys) {
      for (const other of keys) {
        if (other !== key) expect(startsWith(other, key)).toBe(false)
      }
      // all of them are under ratings, for a sign-out that clears them
      expect(startsWith(key, ratingKeys.all())).toBe(true)
    }
  })
})
