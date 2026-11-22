import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { Header } from "./Header"
import { HeaderLogo } from "./HeaderLogo"

describe("Header", () => {
  it("offers „Moje“ (events and groups, #304) to a signed-in user", async () => {
    await renderWithRouter(
      <Header
        userMenu={null}
        isSignedIn
      />,
    )

    expect(screen.getByRole("link", { name: "Moje" })).toHaveAttribute("href", "/moje")
  })

  it("not to a visitor", async () => {
    await renderWithRouter(<Header userMenu={null} />)

    expect(screen.queryByRole("link", { name: "Moje" })).not.toBeInTheDocument()
  })

  // D-03d: managing an event is reached from Moje, the detail from anywhere (A-05); since #304
  // the same for a group (A-08, D-07)
  it.each([
    ["/akce/e17/sprava", "Moje"],
    ["/akce/e17", "Akce"],
    ["/skupiny/g1/sprava", "Moje"],
    ["/skupiny/g1", "Skupiny"],
  ])("on %s marks „%s“ as the current page", async (url, current) => {
    await renderWithRouter(
      <Header
        userMenu={null}
        isSignedIn
      />,
      { url },
    )

    const links = ["Akce", "Skupiny", "Moje"].map((name) => screen.getByRole("link", { name }))
    expect(links.filter((link) => link.getAttribute("aria-current") === "page")).toEqual([
      screen.getByRole("link", { name: current }),
    ])
  })

  // it sits with the page's content (DESIGN.md › Založit akci)
  it("never offers „Založit akci“", async () => {
    await renderWithRouter(
      <Header
        userMenu={null}
        isSignedIn
      />,
    )

    expect(screen.queryByRole("link", { name: "Založit akci" })).not.toBeInTheDocument()
  })
})

// #370: the logo is 28 px tall; its link is a 44 px tap target, the header as before
describe("HeaderLogo", () => {
  it("pads the logo's link to a 40 px+ tap target without moving it", async () => {
    await renderWithRouter(<HeaderLogo />)

    expect(screen.getByRole("link")).toHaveClass("py-2", "-my-2", "inline-flex")
  })
})
