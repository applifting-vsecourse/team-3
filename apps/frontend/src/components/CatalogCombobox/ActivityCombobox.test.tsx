import { useState } from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ActivityCombobox } from "@/components/CatalogCombobox/ActivityCombobox"
import type { ActivityCategory } from "@/lib/catalog/catalogSchemas"

const activity = (slug: string, name: string, keywords: string[] = []) => ({
  id: `a-${slug}`,
  slug,
  name,
  keywords,
})

const categories: ActivityCategory[] = [
  {
    id: "c-tymove",
    slug: "tymove-sporty",
    name: "Týmové sporty",
    icon: "ball",
    activities: [
      activity("fotbal", "Fotbal a malá kopaná", ["fotbal"]),
      activity("ledni-hokej", "Lední hokej", ["hokej", "hokejbal", "led", "zimák"]),
      activity("jiny-tymovy-sport", "Jiný týmový sport", ["hokejbal", "házená"]),
    ],
  },
  {
    id: "c-pohyb",
    slug: "pohyb-a-tanec",
    name: "Pohyb a tanec",
    icon: "route",
    activities: [
      activity("atletika", "Atletika", ["závody", "sprint", "štafeta"]),
      activity("jina-pohybova-aktivita", "Jiná pohybová aktivita"),
    ],
  },
  {
    id: "c-hry",
    slug: "hry",
    name: "Hry",
    icon: "dice",
    activities: [
      activity("deskove-hry", "Deskové hry", ["deskovky"]),
      activity("sipky-a-bowling", "Šipky a bowling", ["šipky", "darts", "bowling"]),
      activity("jina-hra", "Jiná hra"),
    ],
  },
]

/** Labelled and controlled, as FormControl renders it in a form. */
function Field({
  initialValue = "",
  onChange,
  isDisabled = false,
}: {
  initialValue?: string
  onChange?: (id: string) => void
  isDisabled?: boolean
}) {
  const [value, setValue] = useState(initialValue)
  return (
    <>
      <label htmlFor="aktivita">Aktivita *</label>
      <ActivityCombobox
        id="aktivita"
        categories={categories}
        value={value}
        onChange={(id) => {
          setValue(id)
          onChange?.(id)
        }}
        disabled={isDisabled}
      />
    </>
  )
}

const field = () => screen.getByRole("combobox", { name: "Aktivita *" })
const searchField = () => screen.getByRole("combobox", { name: "Hledat aktivitu" })
const optionNames = () => screen.queryAllByRole("option").map((option) => option.textContent)

describe("ActivityCombobox", () => {
  it("lists the activities under their categories", async () => {
    render(<Field />)

    expect(field()).toHaveTextContent("Vyber aktivitu")
    await userEvent.click(field())

    expect(searchField()).toHaveFocus()
    expect(searchField()).toHaveAttribute("placeholder", "Hledej aktivitu…")
    const games = screen.getByRole("group", { name: "Hry" })
    expect(
      within(games)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Deskové hry", "Šipky a bowling", "Jiná hra"])
  })

  it.each([
    ["závody", ["Atletika"]],
    ["zavody", ["Atletika"]],
    ["darts", ["Šipky a bowling"]],
    ["SIPKY", ["Šipky a bowling"]],
    // „hokejbal“ is also among the other team sports
    ["hokej", ["Lední hokej", "Jiný týmový sport"]],
  ])("„%s“ finds %j by its name or synonyms", async (query, names) => {
    render(<Field />)

    await userEvent.click(field())
    await userEvent.type(searchField(), query)

    expect(optionNames()).toEqual(names)
  })

  it("Enter picks the highlighted match; the field shows it with its category", async () => {
    const onChange = vi.fn()
    render(<Field onChange={onChange} />)

    await userEvent.click(field())
    await userEvent.type(searchField(), "zavody")
    await userEvent.keyboard("{Enter}")

    expect(onChange).toHaveBeenCalledExactlyOnceWith("a-atletika")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(field()).toHaveTextContent("Pohyb a tanec › Atletika")
  })

  it("when nothing matches, offers the „Jiné…“ of each category", async () => {
    const onChange = vi.fn()
    render(<Field onChange={onChange} />)

    await userEvent.click(field())
    await userEvent.type(searchField(), "curling")

    expect(screen.getByRole("status")).toHaveTextContent(
      "Takovou aktivitu v katalogu nemáme. Vyber, kam nejvíc patří:",
    )
    expect(optionNames()).toEqual(["Jiný týmový sport", "Jiná pohybová aktivita", "Jiná hra"])
    await userEvent.click(screen.getByRole("option", { name: "Jiný týmový sport" }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith("a-jiny-tymovy-sport")
  })

  it("a disabled field shows the activity and doesn't open", async () => {
    render(
      <Field
        initialValue="a-deskove-hry"
        isDisabled
      />,
    )

    expect(field()).toBeDisabled()
    expect(field()).toHaveTextContent("Hry › Deskové hry")
    await userEvent.click(field())
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })
})
