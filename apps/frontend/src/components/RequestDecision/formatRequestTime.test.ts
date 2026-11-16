import { describe, expect, it } from "vitest"

import { formatRequestTime } from "@/components/RequestDecision/formatRequestTime"

describe("formatRequestTime", () => {
  it("says when a request was sent, in Prague time (#53)", () => {
    expect(formatRequestTime(new Date("2026-10-23T15:30:00.000Z"))).toBe("Žádost z 23. 10. v 17:30")
  })
})
