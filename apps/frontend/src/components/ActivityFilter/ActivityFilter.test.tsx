import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ActivityFilter } from "@/components/ActivityFilter/ActivityFilter"
import type { ActivityCategory } from "@/lib/catalog/catalogSchemas"

const activity = (slug: string, name: string, keywords: string[] = []) => ({
  id: `a-${slug}`,
  slug,
  name,
  keywords,
})

const categories: ActivityCategory[] = [
  {
    id: "c-pohyb",
    slug: "pohyb-a-tanec",
    name: "Pohyb a tanec",
    icon: "route",
    activities: [
      activity("joga", "Jóga", ["yoga"]),
      activity("bojova-umeni", "Bojová umění", ["judo", "karate"]),
      activity("jiny-pohyb", "Jiná pohybová aktivita", ["parkour"]),
    ],
  },
  {
    id: "c-hry",
    slug: "hry",
    name: "Hry",
    icon: "dice",
    activities: [activity("sachy", "Šachy", ["chess"]), activity("jina-hra", "Jiná hra", ["kubb"])],
  },
]

const renderFilter = () => {
  const onChange = vi.fn()
  render(
    <ActivityFilter
      selection={{ categories: [], activities: [] }}
      categories={categories}
      onChange={onChange}
      applyLabel="Zobrazit akce"
    />,
  )
  return { onChange }
}

const searchFor = async (query: string) => {
  await userEvent.click(screen.getByRole("button", { name: "Typ aktivity" }))
  const panel = await screen.findByRole("dialog", { name: "Typ aktivity" })
  await userEvent.type(within(panel).getByLabelText("Hledat aktivitu"), query)
  return panel
}

describe("ActivityFilter › Hledat aktivitu", () => {
  // desktop: the panel is a popover
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("says which synonym found an activity, with its category beside it", async () => {
    renderFilter()
    const panel = await searchFor("judo")

    const results = within(panel).getByRole("list", { name: "Nalezené aktivity" })
    expect(within(results).getAllByRole("listitem")).toHaveLength(1)
    const row = within(results)
      .getByRole("checkbox", { name: /^Bojová umění/ })
      .closest("label")
    expect(row).toHaveTextContent("Bojová umění · judo")
    expect(row).toHaveTextContent(/Pohyb a tanec$/)
  })

  it("an activity the catalog lacks: offers the „Jiné…“ of every category instead of a dead end", async () => {
    const { onChange } = renderFilter()
    const panel = await searchFor("curling")

    expect(within(panel).getByRole("status")).toHaveTextContent(
      "Takovou aktivitu v katalogu nemáme. Vyber, kam nejvíc patří:",
    )
    const others = within(panel).getByRole("list", { name: "Jiné aktivity" })
    expect(
      within(others)
        .getAllByRole("checkbox")
        .map((checkbox) => checkbox.closest("label")?.textContent),
    ).toEqual(["Jiná pohybová aktivitaPohyb a tanec", "Jiná hraHry"])

    await userEvent.click(within(others).getByRole("checkbox", { name: /^Jiná hra/ }))
    await userEvent.click(within(panel).getByRole("button", { name: "Zobrazit akce" }))
    expect(onChange).toHaveBeenCalledWith({ categories: [], activities: ["jina-hra"] })
  })
})
