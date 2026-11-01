import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  type ParsedLocation,
} from "@tanstack/react-router"
import { describe, expect, it } from "vitest"

import { redirectFrom, safeRedirect } from "@/features/auth/lib/redirect"

// `from` as the sign-in page reads it: the router has already decoded it once.
describe("safeRedirect (B-012)", () => {
  it("goes back to the page in `from`, with its search", () => {
    expect(safeRedirect("/akce/abc", "/akce")).toBe("/akce/abc")
    expect(safeRedirect("/akce?lokalita=praha-8", "/akce")).toBe("/akce?lokalita=praha-8")
  })

  it("keeps the page's own encoding: a filter's %26 stays a value, not a new parameter", () => {
    expect(safeRedirect("/akce?q=kafe%20%26%20dort", "/akce")).toBe("/akce?q=kafe%20%26%20dort")
  })

  it("ignores anything outside the app", () => {
    for (const evil of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "javascript:alert(1)",
    ]) {
      expect(safeRedirect(evil, "/akce")).toBe("/akce")
    }
  })

  it("never leads back to sign-in or sign-up, which would loop for a signed-in user", () => {
    expect(safeRedirect("/login", "/akce")).toBe("/akce")
    expect(safeRedirect("/signup?from=x", "/akce")).toBe("/akce")
    expect(safeRedirect("/loginy", "/akce")).toBe("/loginy")
  })

  it("no `from`, or one that isn't a path, is the fallback", () => {
    expect(safeRedirect(undefined, "/akce")).toBe("/akce")
    expect(safeRedirect("%E0%A4%A", "/akce")).toBe("/akce")
  })

  it("still reads a `from` encoded twice before #186 (verification e-mails sent then)", () => {
    expect(safeRedirect("%2Fmoje-akce", "/akce")).toBe("/moje-akce")
    expect(safeRedirect(encodeURIComponent("/akce?lokalita=praha-8"), "/akce")).toBe(
      "/akce?lokalita=praha-8",
    )
    // and the old form gets the same checks
    expect(safeRedirect(encodeURIComponent("//evil.com"), "/akce")).toBe("/akce")
    expect(safeRedirect(encodeURIComponent("/login"), "/akce")).toBe("/akce")
  })
})

describe("`from` roundtrip through the router (#186)", () => {
  const routerAt = async (href: string) => {
    const router = createRouter({
      routeTree: createRootRoute(),
      history: createMemoryHistory({ initialEntries: [href] }),
    })
    await router.load()
    return router
  }

  /** Builds `from` on `page`, goes to /login with it, reads it back like the sign-in page. */
  const roundtrip = async (page: string) => {
    const router = await routerAt(page)
    const location: ParsedLocation = router.state.location
    const loginHref = router.buildLocation({
      to: "/login",
      search: { from: redirectFrom(location) },
    }).href

    const atLogin = await routerAt(loginHref)
    const { from } = atLogin.state.location.search as { from?: string }
    return { loginHref, back: safeRedirect(from, "/akce") }
  }

  it("encodes `from` once and leads back to the page", async () => {
    const { loginHref, back } = await roundtrip("/moje-akce")

    expect(loginHref).toBe("/login?from=%2Fmoje-akce")
    expect(back).toBe("/moje-akce")
  })

  it("keeps the filters in the URL, including encoded characters in a value", async () => {
    const page = "/akce?lokalita=praha-8&q=kafe%20%26%20dort"
    const { loginHref, back } = await roundtrip(page)

    // once: the path's "/" is %2F, not %252F (the page's own %26 is part of the value)
    expect(loginHref).toMatch(/^\/login\?from=%2Fakce%3F/)
    expect(back).toBe((await routerAt(page)).state.location.href)
    const search = new URL(back, "http://app").searchParams
    expect(search.get("lokalita")).toBe("praha-8")
    expect(search.get("q")).toBe("kafe & dort")
  })
})
