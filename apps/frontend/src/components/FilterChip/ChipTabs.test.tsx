import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ChipTabs, ChipTabsItem } from "@/components/FilterChip/ChipTabs"
import { FilterChip } from "@/components/FilterChip/FilterChip"
import { Tabs } from "@/components/ui/tabs"

const classesOf = (element: HTMLElement) => element.className.split(/\s+/).filter(Boolean)

const renderChips = (onValueChange = vi.fn()) =>
  render(
    <Tabs
      value="prihlasen"
      onValueChange={onValueChange}
    >
      <ChipTabs aria-label="Moje akce">
        <ChipTabsItem
          value="prihlasen"
          count={4}
        >
          Přihlášen
        </ChipTabsItem>
        <ChipTabsItem
          value="poradam"
          count={5}
        >
          Pořádám
        </ChipTabsItem>
      </ChipTabs>
    </Tabs>,
  )

describe("ChipTabs (#304)", () => {
  it("are tabs named with their count, the chosen one selected", () => {
    renderChips()

    expect(screen.getByRole("tablist", { name: "Moje akce" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Přihlášen · 4" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByRole("tab", { name: "Pořádám · 5" })).toHaveAttribute(
      "aria-selected",
      "false",
    )
  })

  it("picking a chip asks for its tab", async () => {
    const onValueChange = vi.fn()
    renderChips(onValueChange)

    await userEvent.click(screen.getByRole("tab", { name: "Pořádám · 5" }))

    expect(onValueChange).toHaveBeenCalledWith("poradam")
  })

  // jsdom can't run the Tailwind cascade, so this checks the class names: the active chip must
  // carry every class a selected FilterChip adds, behind data-[state=active].
  it("the active chip restates every class of a selected FilterChip, without the kit's shadow", () => {
    render(
      <>
        <FilterChip>Termín</FilterChip>
        <FilterChip isSelected>Dnes</FilterChip>
      </>,
    )
    const unselected = new Set(classesOf(screen.getByRole("button", { name: "Termín" })))
    const selectedOnly = classesOf(screen.getByRole("button", { name: "Dnes" })).filter(
      (c) => !unselected.has(c),
    )
    renderChips()
    const active = screen.getByRole("tab", { name: "Přihlášen · 4" })

    expect(selectedOnly).toContain("bg-foreground")
    expect(classesOf(active)).toEqual(
      expect.arrayContaining(selectedOnly.map((c) => `data-[state=active]:${c}`)),
    )
    expect(classesOf(active)).not.toContain(
      "group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm",
    )
    expect(classesOf(active)).not.toContain("data-[state=active]:bg-background")
  })
})
