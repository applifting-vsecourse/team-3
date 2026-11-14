import { describe, expect, it } from "vitest"

import { navSection } from "./navSection"

describe("navSection", () => {
  it.each([
    ["/akce", "events"],
    ["/akce/e17", "events"],
    ["/akce/e17/", "events"],
    ["/akce/nova", "my"],
    ["/akce/e17/upravit", "my"],
    ["/akce/e17/sprava", "my"],
    ["/moje/akce", "my"],
    ["/moje/skupiny", "my"],
    ["/skupiny", "groups"],
    ["/skupiny/g1", "groups"],
    // #304: a group's own pages start from Moje, as an event's
    ["/skupiny/nova", "my"],
    ["/skupiny/g1/sprava", "my"],
    ["/skupiny/g1/upravit", "my"],
    ["/skupiny/g1/akce/nova", "my"],
    ["/profil", "profile"],
    ["/login", "login"],
  ])("%s → %s", (pathname, section) => {
    expect(navSection(pathname)).toBe(section)
  })

  it.each(["/", "/signup", "/akcee"])("%s has no item", (pathname) => {
    expect(navSection(pathname)).toBeNull()
  })
})
