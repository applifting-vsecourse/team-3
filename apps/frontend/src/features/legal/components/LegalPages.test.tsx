import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { PrivacyNotice } from "@/features/legal/components/PrivacyNotice"
import { TermsOfUse } from "@/features/legal/components/TermsOfUse"

describe("the pages behind the sign-up's consents (#153)", () => {
  it.each([
    [
      "Podmínky užívání",
      <TermsOfUse key="terms" />,
      "Zpracování osobních údajů",
      "/ochrana-osobnich-udaju",
    ],
    ["Zpracování osobních údajů", <PrivacyNotice key="privacy" />, "Podmínky užívání", "/podminky"],
  ])(
    "%s: says it's a student project at VŠE and links the other page",
    async (title, page, other, href) => {
      await renderWithRouter(page)

      expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument()
      expect(screen.getByText(/studentský projekt/)).toHaveTextContent(
        "Vysoké škole ekonomické v Praze (VŠE)",
      )
      // no company is made up behind it: no registration number, no seat
      expect(document.body).not.toHaveTextContent(/IČO|IČ:|s\.r\.o\.|a\.s\./)
      expect(screen.getByRole("link", { name: other })).toHaveAttribute("href", href)
    },
  )
})
