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
        onProfile={vi.fn()}
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

  // #64: besides saving, the confirmation offers the optional „Představ se partě“ step
  it("offers the optional profile step next to saving", async () => {
    const onProfile = vi.fn()
    const onSave = vi.fn()
    render(
      <OnboardingDecision
        interests={[{ id: "volleyball", slug: "volejbal", name: "Volejbal", keywords: [] }]}
        locality={{ id: "p", slug: "praha", name: "Praha", parentId: null, lat: 50, lng: 14 }}
        isSaving={false}
        onSave={onSave}
        onProfile={onProfile}
        onClose={vi.fn()}
        onRestoreFocus={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Povědět něco o sobě" }))
    expect(onProfile).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Uložit a ukázat akce" })).toBeInTheDocument()
  })
})
