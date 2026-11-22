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

  // #370: the ways on sit in the band, the upcoming events under it over the page's width
  it("puts the ways on in the band and what it gets under it", async () => {
    await renderWithRouter(<NotFound more={<p>Nadcházející akce</p>} />)

    const band = screen.getByRole("heading", { level: 1 }).closest(".border-hero")
    expect(band).toContainElement(screen.getByRole("link", { name: "Procházet akce" }))
    expect(band).toContainElement(screen.getByRole("link", { name: "Na úvod" }))
    expect(band).not.toHaveTextContent("Nadcházející akce")
    expect(screen.getByText("Nadcházející akce")).toBeInTheDocument()
  })
})
