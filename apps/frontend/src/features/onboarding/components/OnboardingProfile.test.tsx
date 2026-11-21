import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Activity } from "@/lib/catalog/catalogSchemas"

import { OnboardingProfile } from "./OnboardingProfile"

const interests: Activity[] = [
  { id: "walking", slug: "turistika", name: "Turistika", keywords: [] },
  { id: "running", slug: "beh", name: "Běh", keywords: [] },
  { id: "games", slug: "deskove-hry", name: "Deskové hry", keywords: [] },
]

function prepare({
  draft = "",
  isSaving = false,
  error,
  nameError,
}: {
  draft?: string
  isSaving?: boolean
  error?: string
  nameError?: string
} = {}) {
  const onSave = vi.fn()
  const onSkip = vi.fn()
  const onBack = vi.fn()

  function Example() {
    const [bio, setBio] = useState(draft)
    const [name, setName] = useState("Jana Nováková")
    return (
      <OnboardingProfile
        initialName="Jana Nováková"
        name={name}
        bio={bio}
        interests={interests}
        isSaving={isSaving}
        error={error}
        nameError={nameError}
        onEditName={setName}
        onEditBio={setBio}
        onBack={onBack}
        onSkip={() => {
          onSkip({ name, bio })
        }}
        onSave={() => {
          onSave({ name, bio })
        }}
      />
    )
  }

  const result = render(<Example />)
  return { ...result, onSave, onSkip, onBack, user: userEvent.setup() }
}

const suggestion = () => document.getElementById("onboarding-bio-suggestion")?.textContent

describe("optional profile at the end of onboarding", () => {
  it("starts with the existing profile name and leaves the biography empty", () => {
    prepare()
    expect(screen.getByLabelText("Jméno v profilu")).toHaveValue("Jana Nováková")
    expect(screen.getByLabelText("O mně")).toHaveValue("")
    expect(suggestion()).toContain("Jana Nováková")
    expect(suggestion()).toContain("deskové hry")
    expect(screen.getByText("Text ve svém profilu uvidíš jen ty.")).toBeVisible()
  })

  it("browses in both directions and wraps without overwriting the current draft", async () => {
    const { user } = prepare({ draft: "Rozpracované představení" })
    const firstSuggestion = suggestion()
    await user.click(screen.getByRole("button", { name: "Předchozí návrh" }))
    expect(screen.getByText("60 / 60")).toBeVisible()
    expect(suggestion()).not.toBe(firstSuggestion)
    await user.click(screen.getByRole("button", { name: "Další návrh" }))
    expect(screen.getByText("1 / 60")).toBeVisible()
    expect(suggestion()).toBe(firstSuggestion)
    expect(screen.getByLabelText("O mně")).toHaveValue("Rozpracované představení")
  })

  it("inserts the visible suggestion only after an explicit click and keeps the field editable", async () => {
    const { user, onSave } = prepare()
    const expected = suggestion()
    await user.click(screen.getByRole("button", { name: "Použít tento text" }))
    const bio = screen.getByLabelText("O mně")
    expect(bio).toHaveValue(expected)
    await user.type(bio, " Těším se.")
    await user.click(screen.getByRole("button", { name: "Uložit a ukázat akce" }))
    expect(onSave).toHaveBeenCalledWith({
      name: "Jana Nováková",
      bio: `${expected} Těším se.`,
    })
  })

  it("confirms before replacing text and keeps it on cancel", async () => {
    const { user } = prepare({ draft: "Pár vlastních slov" })
    const bio = screen.getByLabelText("O mně")
    await user.click(screen.getByRole("button", { name: "Použít tento text" }))
    expect(screen.getByText("Chceš nahradit rozepsané „O mně“?")).toBeVisible()
    expect(bio).toHaveValue("Pár vlastních slov")
    await user.click(screen.getByRole("button", { name: "Ponechat rozepsané" }))
    expect(bio).toHaveValue("Pár vlastních slov")
    await user.click(screen.getByRole("button", { name: "Použít tento text" }))
    await user.click(screen.getByRole("button", { name: "Nahradit text" }))
    expect(bio).toHaveValue(suggestion())
  })

  it("cancels a pending replacement when a different suggestion is shown", async () => {
    const { user } = prepare({ draft: "Moje vlastní věta" })
    await user.click(screen.getByRole("button", { name: "Použít tento text" }))
    expect(screen.getByRole("button", { name: "Nahradit text" })).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Další návrh" }))
    expect(screen.queryByRole("button", { name: "Nahradit text" })).toBeNull()
    expect(screen.getByLabelText("O mně")).toHaveValue("Moje vlastní věta")
  })

  it("refreshes the suggestion for a changed name without touching the editor", async () => {
    const { user } = prepare({ draft: "Ručně napsaný úvod" })
    const name = screen.getByLabelText("Jméno v profilu")
    await user.clear(name)
    await user.type(name, "Petra Svobodová")
    expect(suggestion()).toContain("Petra Svobodová")
    expect(screen.getByLabelText("O mně")).toHaveValue("Ručně napsaný úvod")
  })

  it("uses separate handlers for back, skip and save", async () => {
    const { user, onBack, onSkip, onSave } = prepare({ draft: "Volitelný text" })
    await user.click(screen.getByRole("button", { name: "Zpět" }))
    await user.click(screen.getByRole("button", { name: "Teď ne" }))
    expect(onBack).toHaveBeenCalledOnce()
    expect(onSkip).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it("blocks edits, browsing and actions during save", async () => {
    const { user, onSkip, onSave, onBack } = prepare({ isSaving: true })
    expect(screen.getByLabelText("Jméno v profilu")).toBeDisabled()
    expect(screen.getByLabelText("O mně")).toBeDisabled()
    for (const label of [
      "Předchozí návrh",
      "Další návrh",
      "Použít tento text",
      "Zpět",
      "Teď ne",
      "Ukládám…",
    ]) {
      const button = screen.getByRole("button", { name: label })
      expect(button).toBeDisabled()
      await user.click(button)
    }
    expect(onBack).not.toHaveBeenCalled()
    expect(onSkip).not.toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it("links name validation to the field and shows the save error", () => {
    prepare({ nameError: "Jméno musí obsahovat písmena.", error: "Uložení se nepovedlo." })
    expect(screen.getByLabelText("Jméno v profilu")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Jméno v profilu")).toHaveAccessibleDescription(
      "Jméno musí obsahovat písmena.",
    )
    expect(screen.getByText("Uložení se nepovedlo.")).toHaveAttribute("role", "alert")
  })
})
