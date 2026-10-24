import { describe, expect, it } from "vitest"

import { safeRedirect } from "@/features/auth/lib/redirect"

describe("safeRedirect (B-012)", () => {
  it("goes back to the page in `from`, with its search", () => {
    expect(safeRedirect(encodeURIComponent("/akce/abc"), "/akce")).toBe("/akce/abc")
    expect(safeRedirect(encodeURIComponent("/akce?lokalita=praha-8"), "/akce")).toBe(
      "/akce?lokalita=praha-8",
    )
  })

  it("ignores anything outside the app", () => {
    for (const evil of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "javascript:alert(1)",
    ]) {
      expect(safeRedirect(encodeURIComponent(evil), "/akce")).toBe("/akce")
    }
  })

  it("never leads back to sign-in or sign-up, which would loop for a signed-in user", () => {
    expect(safeRedirect(encodeURIComponent("/login"), "/akce")).toBe("/akce")
    expect(safeRedirect(encodeURIComponent("/signup?from=x"), "/akce")).toBe("/akce")
    expect(safeRedirect(encodeURIComponent("/loginy"), "/akce")).toBe("/loginy")
  })

  it("no `from`, or one that can't be decoded, is the fallback", () => {
    expect(safeRedirect(undefined, "/akce")).toBe("/akce")
    expect(safeRedirect("%E0%A4%A", "/akce")).toBe("/akce")
  })
})
