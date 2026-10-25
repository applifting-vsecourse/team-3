import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NotFound } from "@/components/Error/NotFound"
import { renderWithRouter } from "@/test/renderWithRouter"

describe("NotFound", () => {
  it("says in Czech that the page doesn't exist and offers a way on", async () => {
    await renderWithRouter(<NotFound />)

    expect(screen.getByRole("heading", { name: "Stránka neexistuje" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Procházet akce" })).toHaveAttribute("href", "/akce")
    expect(screen.getByRole("link", { name: "Na úvod" })).toHaveAttribute("href", "/")
  })
})
