import { describe, expect, it } from "vitest"

import { googleCallbackUrls } from "@/features/auth/lib/callback-url"

const origin = window.location.origin

describe("googleCallbackUrls (#154)", () => {
  it("comes back to `from` once signed in, and to /login with it when not", () => {
    // `from` as the sign-in page read it from the URL: already decoded (#186)
    expect(googleCallbackUrls("/akce/e1?tab=info")).toEqual({
      callbackURL: `${origin}/akce/e1?tab=info`,
      errorCallbackURL: `${origin}/login?from=%2Fakce%2Fe1%3Ftab%3Dinfo`,
    })
  })

  it("without `from` goes to the events", () => {
    expect(googleCallbackUrls()).toEqual({
      callbackURL: `${origin}/akce`,
      errorCallbackURL: `${origin}/login`,
    })
  })

  it("from /signup goes back to /signup when not signed in (#198)", () => {
    expect(googleCallbackUrls("/akce/e1", "/signup")).toEqual({
      callbackURL: `${origin}/akce/e1`,
      errorCallbackURL: `${origin}/signup?from=%2Fakce%2Fe1`,
    })
    expect(googleCallbackUrls(undefined, "/signup").errorCallbackURL).toBe(`${origin}/signup`)
  })

  it("never leaves the app: a crafted `from` falls back to the events", () => {
    for (const from of ["https://evil.example", "//evil.example", "/login"]) {
      expect(googleCallbackUrls(from).callbackURL).toBe(`${origin}/akce`)
    }
  })
})
