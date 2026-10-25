import { describe, expect, it } from "vitest"

import { navSection } from "./navSection"

describe("navSection", () => {
  it.each([
    ["/akce", "events"],
    ["/akce/e17", "events"],
    ["/akce/e17/", "events"],
    ["/akce/nova", "myEvents"],
    ["/akce/e17/upravit", "myEvents"],
    ["/akce/e17/sprava", "myEvents"],
    ["/moje-akce", "myEvents"],
    ["/skupiny", "groups"],
    ["/skupiny/g1/sprava", "groups"],
    ["/profil", "profile"],
    ["/login", "login"],
  ])("%s → %s", (pathname, section) => {
    expect(navSection(pathname)).toBe(section)
  })

  it.each(["/", "/signup", "/akcee"])("%s has no item", (pathname) => {
    expect(navSection(pathname)).toBeNull()
  })
})
