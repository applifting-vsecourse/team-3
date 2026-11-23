import { useState } from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Activity, ActivityCategory } from "@/lib/catalog/catalogSchemas"

import { InterestPicker } from "./InterestPicker"

const categoryList: ActivityCategory[] = [
  {
    id: "teams",
    slug: "tymove-sporty",
    name: "Týmové sporty",
    icon: "ball",
    activities: [
      { id: "volleyball", slug: "volejbal", name: "Volejbal", keywords: ["plážový"] },
      { id: "floorball", slug: "florbal", name: "Florbal", keywords: [] },
    ],
  },
  {
    id: "outside",
    slug: "outdoor",
    name: "Outdoor",
    icon: "mountain",
    activities: [
      { id: "hikes", slug: "turistika", name: "Turistika", keywords: ["výlety"] },
      { id: "walks", slug: "prochazka", name: "Procházka", keywords: [] },
    ],
  },
  {
    id: "games",
    slug: "hry",
    name: "Hry",
    icon: "board-game",
    activities: [
      { id: "board-games", slug: "deskove-hry", name: "Deskové hry", keywords: ["deskovky"] },
    ],
  },
  {
    id: "art",
    slug: "tvoreni-a-hudba",
    name: "Tvoření a hudba",
    icon: "music",
    activities: [{ id: "choir", slug: "sborovy-zpev", name: "Sborový zpěv", keywords: ["sbor"] }],
  },
  {
    id: "new",
    slug: "nova-kategorie",
    name: "Nový okruh bez fotky",
    icon: "map",
    activities: [
      {
        id: "walking-tour",
        slug: "netradicni-prochazka",
        name: "Procházka s průvodcem",
        keywords: [],
      },
    ],
  },
]

function setup({
  initialCategory = "",
  initialPicks = [],
  categories = categoryList,
  isDisabled = false,
}: {
  initialCategory?: string
  initialPicks?: string[]
  categories?: ActivityCategory[]
  isDisabled?: boolean
} = {}) {
  const call = vi.fn<(activity: Activity, target: HTMLButtonElement) => void>()
  const browse = vi.fn<(category: string) => void>()
  function Harness() {
    const [category, setCategory] = useState(initialCategory)
    const [picks, setPicks] = useState(initialPicks)
    return (
      <InterestPicker
        categories={categories}
        categoryId={category}
        selected={picks}
        isDisabled={isDisabled}
        onBrowse={(id) => {
          browse(id)
          setCategory(id)
        }}
        onToggle={(activity, target) => {
          call(activity, target)
          setPicks((before) =>
            before.includes(activity.id)
              ? before.filter((id) => id !== activity.id)
              : [...before, activity.id],
          )
        }}
        renderEventPreview={(id) => <p>Akce pro {id}</p>}
      />
    )
  }
  render(<Harness />)
  const user = userEvent.setup()
  const activity = (name: string) => screen.getByRole("button", { name })
  const switcher = () => screen.getByRole("button", { name: "Změnit okruh" })
  const menu = () => screen.getByRole("region", { name: "Okruhy aktivit" })
  const pickCategory = async (name: string) => {
    const change = within(menu()).queryByRole("button", { name: "Změnit okruh" })
    if (change?.getAttribute("aria-expanded") === "false") await user.click(change)
    await user.click(within(menu()).getByRole("button", { name }))
  }
  return { user, browse, call, activity, switcher, menu, pickCategory }
}

describe("onboarding category and activity chooser", () => {
  it("reveals all categories from the initial visual grid without picking any specific activity", async () => {
    const { call, menu, pickCategory, browse, activity } = setup()
    for (const category of categoryList) {
      expect(within(menu()).getByRole("button", { name: category.name })).toBeVisible()
    }
    await pickCategory("Týmové sporty")
    expect(browse.mock.calls).toEqual([["teams"]])
    expect(call).not.toHaveBeenCalled()
    expect(activity("Florbal")).toBeVisible()
    expect(screen.queryByText("Akce pro outside")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Aktivity napříč okruhy" })).toBeNull()
    expect(screen.getAllByRole("heading", { name: "Týmové sporty" })).toHaveLength(1)
  })

  it("keeps previously picked activities selected across repeated category switches", async () => {
    const { user, activity, pickCategory, call } = setup()
    await pickCategory("Týmové sporty")
    await user.click(activity("Volejbal"))
    expect(activity("Volejbal")).toHaveAttribute("aria-pressed", "true")
    await pickCategory("Outdoor")
    await user.click(activity("Turistika"))
    expect(activity("Turistika")).toHaveAttribute("aria-pressed", "true")
    await pickCategory("Hry")
    expect(activity("Deskové hry")).toHaveAttribute("aria-pressed", "false")
    await pickCategory("Týmové sporty")
    const volleyball = activity("Volejbal")
    expect(volleyball).toHaveAttribute("aria-pressed", "true")
    await user.click(volleyball)
    expect(volleyball).toHaveAttribute("aria-pressed", "false")
    expect(call.mock.calls.map(([entry]) => entry.id)).toEqual([
      "volleyball",
      "hikes",
      "volleyball",
    ])
  })

  it("keeps the switcher focused and reports its expanded state with real controls", async () => {
    const { user, switcher, menu, pickCategory } = setup()
    await pickCategory("Outdoor")
    expect(switcher()).toHaveFocus()
    expect(switcher()).toHaveAttribute("aria-expanded", "false")
    const controlled = document.getElementById(switcher().getAttribute("aria-controls") ?? "")
    expect(controlled).toHaveAttribute("hidden")
    expect(within(menu()).queryByRole("button", { name: "Hry" })).toBeNull()

    await user.keyboard("{Enter}")
    expect(switcher()).toHaveAttribute("aria-expanded", "true")
    expect(controlled).not.toHaveAttribute("hidden")
    expect(within(menu()).getByRole("button", { name: "Outdoor" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(within(menu()).getByRole("button", { name: "Tvoření a hudba" })).toBeVisible()

    await user.keyboard(" ")
    expect(switcher()).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByRole("heading", { name: "Outdoor" })).toBeVisible()
  })

  it("can go directly to all activities from an open category", async () => {
    const { pickCategory, browse, activity, switcher } = setup({ initialCategory: "teams" })
    await pickCategory("Všechny aktivity")
    expect(browse).toHaveBeenCalledWith("")
    expect(switcher()).toHaveFocus()
    expect(screen.getByRole("heading", { name: "Aktivity napříč okruhy" })).toBeVisible()
    expect(activity("Volejbal")).toBeVisible()
    expect(activity("Procházka s průvodcem")).toBeVisible()
    expect(screen.queryByText("Akce pro teams")).not.toBeInTheDocument()
  })

  it("can go directly to all activities from the first screen", async () => {
    const { pickCategory, activity, browse } = setup()
    await pickCategory("Všechny aktivity")
    expect(browse.mock.calls).toEqual([[""]])
    expect(activity("Florbal")).toBeVisible()
    expect(activity("Sborový zpěv")).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent("7 aktivit")
  })

  it("looks across every category while searching by keyword and restores the previous one", async () => {
    const { user, activity, pickCategory } = setup()
    await pickCategory("Týmové sporty")
    await user.click(screen.getByRole("button", { name: "Hledat" }))
    const search = screen.getByRole("searchbox", { name: "Hledat aktivitu" })
    expect(search).toHaveFocus()
    await user.type(search, "deskOvKy")
    expect(screen.getByRole("heading", { name: "Výsledky hledání" })).toBeVisible()
    expect(activity("Deskové hry")).toBeVisible()
    expect(screen.queryByRole("button", { name: "Florbal" })).toBeNull()
    expect(screen.queryByText("Akce pro teams")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Zrušit hledání" }))
    expect(search).toHaveValue("")
    expect(search).toHaveFocus()
    expect(activity("Florbal")).toBeVisible()
    expect(screen.getByText("Akce pro teams")).toBeVisible()
  })

  it("switches from an empty search to another category and clears the old query", async () => {
    const { user, pickCategory, activity, switcher } = setup()
    await user.type(screen.getByRole("searchbox"), "nema-vysledek")
    expect(screen.getByText(/Tohle hledání nic nenašlo/)).toBeVisible()
    await pickCategory("Hry")
    expect(screen.getByRole("searchbox")).toHaveValue("")
    expect(screen.queryByText(/Tohle hledání nic nenašlo/)).toBeNull()
    expect(switcher()).toHaveFocus()
    expect(activity("Deskové hry")).toBeVisible()
  })

  it("does not disable navigation when picking activities is temporarily unavailable", async () => {
    const { pickCategory, call, user, activity } = setup({ isDisabled: true })
    await pickCategory("Outdoor")
    const hiking = activity("Turistika")
    expect(hiking).toBeDisabled()
    await user.click(hiking)
    expect(call).not.toHaveBeenCalled()
    await pickCategory("Hry")
    expect(activity("Deskové hry")).toBeDisabled()
  })

  it("leaves a catalog category without photos discoverable and usable", async () => {
    const { pickCategory, activity, user, call } = setup()
    await pickCategory("Nový okruh bez fotky")
    const entry = activity("Procházka s průvodcem")
    expect(entry).toBeVisible()
    await user.click(entry)
    expect(call).toHaveBeenCalledWith(expect.objectContaining({ id: "walking-tour" }), entry)
  })

  it("shows updated catalog results without dropping externally selected IDs", () => {
    const { activity } = setup({
      initialCategory: "removed-category",
      initialPicks: ["volleyball"],
    })
    expect(activity("Volejbal")).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByText("Akce pro removed-category")).toBeNull()
  })
})
