import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { Header } from "./Header"

describe("Header", () => {
  it("offers „Moje akce“ to a signed-in user", async () => {
    await renderWithRouter(
      <Header
        userMenu={null}
        isSignedIn
      />,
    )

    expect(screen.getByRole("link", { name: "Moje akce" })).toHaveAttribute("href", "/moje-akce")
  })

  it("not to a visitor", async () => {
    await renderWithRouter(<Header userMenu={null} />)

    expect(screen.queryByRole("link", { name: "Moje akce" })).not.toBeInTheDocument()
  })

  // D-03d: managing an event is reached from Moje akce, the detail from anywhere (A-05)
  it.each([
    ["/akce/e17/sprava", "Moje akce"],
    ["/akce/e17", "Akce"],
  ])("on %s marks „%s“ as the current page", async (url, current) => {
    await renderWithRouter(
      <Header
        userMenu={null}
        isSignedIn
      />,
      { url },
    )

    const links = ["Akce", "Moje akce"].map((name) => screen.getByRole("link", { name }))
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
