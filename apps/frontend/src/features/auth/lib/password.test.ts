import { describe, expect, it } from "vitest"

import { PASSWORD_RULE, passwordSchema } from "@/features/auth/lib/password"

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
