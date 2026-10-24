import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { Header } from "./Header"

describe("Header", () => {
  it("offers „Založit akci“ and „Moje akce“ to a signed-in user", async () => {
    await renderWithRouter(
      <Header
        userMenu={null}
        isSignedIn
      />,
    )

    expect(screen.getByRole("link", { name: "Založit akci" })).toHaveAttribute("href", "/akce/nova")
    expect(screen.getByRole("link", { name: "Moje akce" })).toHaveAttribute("href", "/moje-akce")
  })

  it("offers neither to a visitor", async () => {
    await renderWithRouter(<Header userMenu={null} />)

    expect(screen.queryByRole("link", { name: "Založit akci" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Moje akce" })).not.toBeInTheDocument()
  })

  it("leaves „Založit akci“ out on the form itself", async () => {
    await renderWithRouter(
      <Header
        userMenu={null}
        isSignedIn
      />,
      { url: "/akce/nova" },
    )

    expect(screen.queryByRole("link", { name: "Založit akci" })).not.toBeInTheDocument()
  })
})
