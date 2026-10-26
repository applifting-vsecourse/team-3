import { describe, expect, it } from "vitest"

import { PASSWORD_RULE, passwordSchema, passwordStrength } from "@/features/auth/lib/password"

describe("passwordSchema (B-010)", () => {
  it("accepts 10 characters with a letter and a digit, Czech letters too", () => {
    expect(passwordSchema.safeParse("hobbyhub26").success).toBe(true)
    expect(passwordSchema.safeParse("žluťoučký1").success).toBe(true)
  })

  it("refuses a short one, one without a digit and one without a letter, saying the rule", () => {
    for (const weak of ["hobbyhub2", "hobbyhubhobbyhub", "1234567890"]) {
      const result = passwordSchema.safeParse(weak)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe(PASSWORD_RULE)
    }
  })
})

describe("passwordStrength (#153)", () => {
  it("is weak until the password passes the rule", () => {
    for (const password of ["", "hobbyhub2", "hobbyhubhobbyhub", "1234567890"]) {
      expect(passwordStrength(password)).toBe("weak")
    }
  })

  it("is good once it passes", () => {
    expect(passwordStrength("hobbyhub26")).toBe("good")
    // long enough, but only two kinds of characters
    expect(passwordStrength("hobbyhub2026hob")).toBe("good")
  })

  it("is strong when long and mixed, or a long phrase", () => {
    expect(passwordStrength("Hobbyhub-2026!")).toBe("strong")
    expect(passwordStrength("kolo na horách 2026")).toBe("strong")
    expect(passwordStrength("hobbyhub2026hobbyhub")).toBe("strong")
  })
})
