import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { OnboardingBioSuggestion } from "./OnboardingBioSuggestion"

function Kit({ initial = "", isDisabled = false }: { initial?: string; isDisabled?: boolean }) {
  const [bio, apply] = useState(initial)
  const [name, setName] = useState("Jana Nová")
  return (
    <>
      <label>
        O mně
        <textarea
          value={bio}
          onChange={(event) => apply(event.currentTarget.value)}
        />
      </label>
      <label>
        Jméno
        <input
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
        />
      </label>
      <OnboardingBioSuggestion
        bio={bio}
        name={name}
        activityNames={["Běh", "Deskové hry", "Turistika"]}
        localityName="Brno"
        isDisabled={isDisabled}
        apply={apply}
      />
    </>
  )
}

function prepare(kit = <Kit />) {
  const user = userEvent.setup()
  render(kit)
  return {
    user,
    suggest: () => user.click(screen.getByRole("button", { name: "Navrhnout text" })),
    draft: screen.getByRole<HTMLTextAreaElement>("textbox", { name: "O mně" }),
  }
}

describe("prepared introduction suggestions", () => {
  it("starts empty, uses one action to fill the editor, and cycles all 60 drafts", async () => {
    const { suggest, draft } = prepare()
    expect(draft).toHaveValue("")
    expect(screen.queryByText(/\b\d+\s*\/\s*60\b/)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /další|předchozí/ })).not.toBeInTheDocument()
    const variants = new Set<string>()
    let first = ""
    for (let index = 0; index < 60; index++) {
      await suggest()
      if (index === 0) first = draft.value
      expect(draft.value.length).toBeGreaterThan(15)
      expect(draft.value.length).toBeLessThanOrEqual(500)
      expect(variants.has(draft.value)).toBe(false)
      variants.add(draft.value)
    }
    expect(variants.size).toBe(60)
    await suggest()
    expect(draft).toHaveValue(first)
  })

  it("takes over an untouched suggestion but asks before replacing owner-edited text", async () => {
    const { user, suggest, draft } = prepare()
    await suggest()
    await user.type(draft, " V neděli nemůžu.")
    const owned = draft.value
    await suggest()
    expect(draft).toHaveValue(owned)
    await user.click(screen.getByRole("button", { name: "Ponechat rozepsané" }))
    expect(draft).toHaveValue(owned)
    await suggest()
    await user.click(screen.getByRole("button", { name: "Nahradit text" }))
    expect(draft.value).not.toBe(owned)
    expect(draft.value.length).toBeGreaterThan(15)
  })

  it("discards a stale confirmation when the owner keeps typing", async () => {
    const { user, suggest, draft } = prepare(<Kit initial="Choďme ven." />)
    await suggest()
    expect(screen.getByRole("button", { name: "Nahradit text" })).toBeVisible()
    await user.type(draft, " Líbí se mi Špilberk.")
    expect(screen.queryByRole("button", { name: "Nahradit text" })).not.toBeInTheDocument()
    expect(draft).toHaveValue("Choďme ven. Líbí se mi Špilberk.")
  })

  it("uses the name edited in the same form", async () => {
    const { user, suggest, draft } = prepare()
    const name = screen.getByRole("textbox", { name: "Jméno" })
    await user.clear(name)
    await user.type(name, "Klára Nová")
    await suggest()
    expect(draft.value).toContain("Klára Nová")
    expect(draft.value).not.toContain("Jana Nová")
  })

  it("keeps draft and control idle while the editor saves", async () => {
    const { suggest, draft } = prepare(
      <Kit
        initial="Mám ráda výlety."
        isDisabled
      />,
    )
    expect(screen.getByRole("button", { name: "Navrhnout text" })).toBeDisabled()
    await suggest()
    expect(draft).toHaveValue("Mám ráda výlety.")
  })
})
