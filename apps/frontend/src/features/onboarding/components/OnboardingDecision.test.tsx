import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { OnboardingDecision } from "./OnboardingDecision"

describe("OnboardingDecision", () => {
  // review #384: DialogTitle's kit classes (text-lg, font-semibold) shrank it to 18 px SemiBold
  it("shows the heading in the Title style, not the kit's dialog size", () => {
    render(
      <OnboardingDecision
        interests={[{ id: "volleyball", slug: "volejbal", name: "Volejbal", keywords: [] }]}
        locality={{
          id: "p13",
          slug: "praha-13",
          name: "Praha 13",
          parentId: "p",
          lat: 50,
          lng: 14,
        }}
        isSaving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
        onRestoreFocus={vi.fn()}
      />,
    )

    const heading = screen.getByRole("heading", { name: "Máš vybráno!" })
    expect(heading).toHaveClass("type-title")
    expect(heading).not.toHaveClass("text-lg")
    expect(heading).not.toHaveClass("font-semibold")
    expect(heading).not.toHaveClass("leading-none")
  })

  it("offers Najdi parťáka as a second way out, which saves the same choice (#84)", async () => {
    const onSave = vi.fn()
    const onSaveForPartners = vi.fn()
    render(
      <OnboardingDecision
        interests={[{ id: "volleyball", slug: "volejbal", name: "Volejbal", keywords: [] }]}
        locality={{
          id: "p13",
          slug: "praha-13",
          name: "Praha 13",
          parentId: "p",
          lat: 50,
          lng: 14,
        }}
        isSaving={false}
        onSave={onSave}
        onSaveForPartners={onSaveForPartners}
        onClose={vi.fn()}
        onRestoreFocus={vi.fn()}
      />,
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Nebo se podívej, kdo z okolí má stejné koníčky" }),
    )

    expect(onSaveForPartners).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
    // the required way stays the main one
    expect(screen.getByRole("button", { name: /Uložit a ukázat akce/ })).toBeInTheDocument()
  })
})
