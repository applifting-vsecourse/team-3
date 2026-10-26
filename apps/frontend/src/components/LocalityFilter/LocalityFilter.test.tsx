import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LocalityFilter } from "@/components/LocalityFilter/LocalityFilter"
import type { Locality } from "@/lib/catalog/catalogSchemas"

const locality = (slug: string, name: string, parentId: string | null = null): Locality => ({
  id: `l-${slug}`,
  slug,
  name,
  parentId,
  lat: 50,
  lng: 15,
})

const localities = [
  locality("praha", "Praha"),
  locality("praha-8", "Praha 8", "l-praha"),
  locality("brno", "Brno"),
  locality("bruntal", "Bruntál"),
]

const renderFilter = (value: string | undefined) => {
  const onChange = vi.fn()
  render(
    <LocalityFilter
      value={value}
      localities={localities}
      onChange={onChange}
      applyLabel="Zobrazit akce"
    />,
  )
  return { onChange }
}

const openPanel = async (chipName: string) => {
  await userEvent.click(screen.getByRole("button", { name: chipName }))
  return screen.findByRole("dialog", { name: "Lokalita" })
}

describe("LocalityFilter", () => {
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

  it("offers Celé Česko first, above Praha", async () => {
    renderFilter(undefined)
    const panel = await openPanel("Lokalita: Praha")

    const [first, second] = within(panel).getAllByRole("option")
    expect(first).toHaveTextContent(/^Celé Česko$/)
    expect(second).toHaveTextContent(/^Praha/)
  })

  it("a town: „Zrušit výběr“ shows all of Czechia, not Praha", async () => {
    const { onChange } = renderFilter("bruntal")
    const panel = await openPanel("Lokalita: Bruntál")

    expect(within(panel).queryByRole("button", { name: "Celá Praha" })).not.toBeInTheDocument()
    await userEvent.click(within(panel).getByRole("button", { name: "Zrušit výběr" }))
    expect(onChange).toHaveBeenCalledWith("cele-cesko")
  })

  it("Praha itself: „Zrušit výběr“ shows all of Czechia too", async () => {
    const { onChange } = renderFilter(undefined)
    const panel = await openPanel("Lokalita: Praha")

    await userEvent.click(within(panel).getByRole("button", { name: "Zrušit výběr" }))
    expect(onChange).toHaveBeenCalledWith("cele-cesko")
  })

  it("a district: „Celá Praha“ goes back to the whole city, stored as no parameter", async () => {
    const { onChange } = renderFilter("praha-8")
    const panel = await openPanel("Lokalita: Praha 8")

    await userEvent.click(within(panel).getByRole("button", { name: "Celá Praha" }))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it("the reset follows the row being picked, before it is applied", async () => {
    renderFilter("praha-8")
    const panel = await openPanel("Lokalita: Praha 8")

    await userEvent.click(within(panel).getByRole("option", { name: "Brno" }))
    expect(within(panel).getByRole("button", { name: "Zrušit výběr" })).toBeEnabled()
    expect(within(panel).queryByRole("button", { name: "Celá Praha" })).not.toBeInTheDocument()
  })

  it("Celé Česko: shown on the chip, nothing left to reset", async () => {
    renderFilter("cele-cesko")
    const panel = await openPanel("Lokalita: Celé Česko")

    expect(within(panel).getByRole("button", { name: "Zrušit výběr" })).toBeDisabled()
  })

  it("opens with the focus in the search field, so typing a town finds it", async () => {
    renderFilter(undefined)
    const panel = await openPanel("Lokalita: Praha")

    expect(within(panel).getByRole("combobox", { name: "Hledat lokalitu" })).toHaveFocus()
    await userEvent.keyboard("brunt")
    expect(within(panel).getAllByRole("option")).toHaveLength(1)
  })

  it("reopens on the picked town: its row is active, so Enter keeps it (not Praha)", async () => {
    const { onChange } = renderFilter("bruntal")
    const panel = await openPanel("Lokalita: Bruntál")

    const bruntal = within(panel).getByRole("option", { name: /Bruntál/ })
    expect(bruntal).toHaveAttribute("aria-selected", "true")
    expect(within(bruntal).getByText("vybráno")).toBeInTheDocument()
    expect(within(panel).getByRole("option", { name: "Praha" })).toHaveAttribute(
      "aria-selected",
      "false",
    )

    // the field has the focus already
    await userEvent.keyboard("{Enter}")
    await userEvent.click(within(panel).getByRole("button", { name: "Zobrazit akce" }))
    expect(onChange).toHaveBeenCalledWith("bruntal")
  })
})
