import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NotFound } from "@/components/Error/NotFound"
import { renderWithRouter } from "@/test/renderWithRouter"

describe("NotFound", () => {
  it("says in Czech that the page wasn't found and offers a way on", async () => {
    await renderWithRouter(<NotFound />)

    expect(screen.getByRole("heading", { name: "Stránka nenalezena" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Procházet akce" })).toHaveAttribute("href", "/akce")
    expect(screen.getByRole("link", { name: "Na úvod" })).toHaveAttribute("href", "/")
  })

  // #370: starts with the band like every page (DESIGN.md › Layout)
  it("puts the title and its line in the band", async () => {
    await renderWithRouter(<NotFound />)

    const band = screen.getByRole("heading", { level: 1 }).closest(".border-hero")
    expect(band).toHaveTextContent("Odkaz je neplatný, nebo stránka už neexistuje.")
  })

  it("shows what it gets beside the ways on, e.g. the upcoming events", async () => {
    await renderWithRouter(<NotFound aside={<p>Nadcházející akce</p>} />)

    expect(screen.getByRole("complementary")).toHaveTextContent("Nadcházející akce")
  })
})
