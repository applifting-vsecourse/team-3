import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { Partner } from "@/features/partners/api/partnersSchemas"
import { PartnerCard } from "@/features/partners/components/PartnerCard"

const partner = (changes: Partial<Partner> = {}): Partner => ({
  id: "tomas",
  name: "Tomáš Novák",
  distanceBandKm: 5,
  sharedInterests: [{ id: "volejbal", name: "Volejbal", slug: "volejbal" }],
  otherInterests: [],
  hasRequestedMe: false,
  mutualFriendsCount: null,
  ...changes,
})

const card = async (changes: Partial<Partner> = {}) => {
  await renderWithRouter(
    <PartnerCard
      partner={partner(changes)}
      nameId="name"
    />,
  )
  return screen.getByRole("article", { name: "Tomáš Novák" })
}

describe("PartnerCard: společní přátelé (#473)", () => {
  it("shows how many, above Oba vás baví, with the icon hidden from screen readers", async () => {
    const article = await card({ mutualFriendsCount: 3 })

    const line = within(article).getByText("3 společní přátelé")
    expect(line.tagName).toBe("P")
    expect(line.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    // in the body, before the chips' heading
    const heading = within(article).getByText("Oba vás baví")
    expect(line.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("5 and more in the genitive plural", async () => {
    const article = await card({ mutualFriendsCount: 5 })

    expect(within(article).getByText("5 společných přátel")).toBeInTheDocument()
  })

  it("nothing below two: no line, no „0 společných přátel“", async () => {
    const article = await card({ mutualFriendsCount: null })

    expect(within(article).queryByText(/společn\S* přátel/)).not.toBeInTheDocument()
  })
})
