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

  it("continues back to the page the sign-up started from, e.g. the event (B-012)", async () => {
    await renderWithRouter(<EmailVerifiedView continueTo="/akce/abc" />)

    expect(screen.getByRole("link", { name: "Pokračovat" })).toHaveAttribute("href", "/akce/abc")
  })

  it("explains an expired link in Czech and where to get a new one", async () => {
    await renderWithRouter(<EmailVerifiedView error="TOKEN_EXPIRED" />)

    expect(
      screen.getByRole("heading", { level: 1, name: "E-mail se nepodařilo ověřit" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Odkaz už vypršel. Nový odkaz si pošlete z pruhu nahoře, když jste přihlášení.",
      ),
    ).toBeInTheDocument()
  })

  it("doesn't claim success to a signed-in user who is still unverified", async () => {
    await renderWithRouter(<EmailVerifiedView isUnverified />)

    expect(
      screen.getByRole("heading", { level: 1, name: "E-mail zatím není ověřený" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("E-mail je ověřený")).not.toBeInTheDocument()
  })
})
