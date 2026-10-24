import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { EmailVerifiedView } from "@/features/auth/components/EmailVerifiedView"

describe("EmailVerifiedView", () => {
  it("confirms the verification and continues to the events", async () => {
    await renderWithRouter(<EmailVerifiedView />)

    expect(screen.getByRole("heading", { level: 1, name: "E-mail je ověřený" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pokračovat" })).toHaveAttribute("href", "/akce")
  })

  it("explains an expired link in Czech and where to get a new one", async () => {
    await renderWithRouter(<EmailVerifiedView error="TOKEN_EXPIRED" />)

    expect(
      screen.getByRole("heading", { level: 1, name: "E-mail se nepodařilo ověřit" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Odkaz už vypršel/)).toBeInTheDocument()
    expect(screen.getByText(/z pruhu nahoře/)).toBeInTheDocument()
  })
})
