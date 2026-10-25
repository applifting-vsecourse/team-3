import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { EmailVerifiedView } from "@/features/auth/components/EmailVerifiedView"

describe("EmailVerifiedView", () => {
  it("confirms the verification and continues to the events, saying so", async () => {
    await renderWithRouter(<EmailVerifiedView />)

    expect(screen.getByRole("heading", { level: 1, name: "E-mail je ověřený" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Procházet akce" })).toHaveAttribute("href", "/akce")
  })

  it("leads back to the event the sign-up started from, saying so (B-012)", async () => {
    await renderWithRouter(<EmailVerifiedView continueTo="/akce/abc" />)

    expect(screen.getByRole("link", { name: "Zpět na akci" })).toHaveAttribute("href", "/akce/abc")
  })

  it.each([
    ["/akce?obsazenost=chybi", "Procházet akce"],
    ["/akce/nova", "Pokračovat"],
    ["/akce/abc/sprava", "Pokračovat"],
    ["/skupiny/g1", "Pokračovat"],
  ])("from %s the button says „%s“", async (continueTo, label) => {
    await renderWithRouter(<EmailVerifiedView continueTo={continueTo} />)

    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", continueTo)
  })

  it("explains an expired link in Czech and where to get a new one", async () => {
    await renderWithRouter(<EmailVerifiedView error="TOKEN_EXPIRED" />)

    expect(
      screen.getByRole("heading", { level: 1, name: "E-mail se nepodařilo ověřit" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Odkaz už vypršel. Nový odkaz si po přihlášení pošli z pruhu nahoře."),
    ).toBeInTheDocument()
  })

  it("a link that didn't work still leads back to the event, saying so", async () => {
    await renderWithRouter(
      <EmailVerifiedView
        error="TOKEN_EXPIRED"
        continueTo="/akce/abc"
      />,
    )

    expect(screen.getByRole("link", { name: "Zpět na akci" })).toHaveAttribute("href", "/akce/abc")
  })

  it("doesn't claim success to a signed-in user who is still unverified", async () => {
    await renderWithRouter(<EmailVerifiedView isUnverified />)

    expect(
      screen.getByRole("heading", { level: 1, name: "E-mail zatím není ověřený" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("E-mail je ověřený")).not.toBeInTheDocument()
  })
})
