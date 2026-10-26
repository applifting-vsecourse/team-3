import { describe, expect, it } from "vitest"

import { googleCallbackUrls } from "@/features/auth/lib/callback-url"

const origin = window.location.origin

describe("googleCallbackUrls (#154)", () => {
  it("comes back to `from` once signed in, and to /login with it when not", () => {
    expect(googleCallbackUrls(encodeURIComponent("/akce/e1?tab=info"))).toEqual({
      callbackURL: `${origin}/akce/e1?tab=info`,
      errorCallbackURL: `${origin}/login?from=%252Fakce%252Fe1%253Ftab%253Dinfo`,
    })
  })

  it("without `from` goes to the events", () => {
    expect(googleCallbackUrls()).toEqual({
      callbackURL: `${origin}/akce`,
      errorCallbackURL: `${origin}/login`,
    })
  })

  it("never leaves the app: a crafted `from` falls back to the events", () => {
    for (const from of ["https://evil.example", "//evil.example", "/login"]) {
      expect(googleCallbackUrls(encodeURIComponent(from)).callbackURL).toBe(`${origin}/akce`)
    }
  })
})
