import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NotFound } from "@/components/Error/NotFound"
import { RootErrorBoundary } from "@/components/Error/RootErrorBoundary"
import { renderWithRouter } from "@/test/renderWithRouter"

describe("NotFound", () => {
  it("says in Czech that the page wasn't found and offers a way on", async () => {
    await renderWithRouter(<NotFound />)

    expect(screen.getByRole("heading", { name: "Stránka nenalezena" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Procházet akce" })).toHaveAttribute("href", "/akce")
    expect(screen.getByRole("link", { name: "Na úvod" })).toHaveAttribute("href", "/")
  })
})

describe("RootErrorBoundary", () => {
  it("keeps the technical message away from the user and offers a reload and the home page", async () => {
    await renderWithRouter(
      <RootErrorBoundary error={new Error("Cannot read properties of undefined (reading 'x')")} />,
    )

    expect(screen.getByRole("heading", { name: "Něco se pokazilo" })).toBeInTheDocument()
    expect(screen.queryByText(/Cannot read properties/)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Načíst znovu" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Na úvod" })).toHaveAttribute("href", "/")
  })
})
