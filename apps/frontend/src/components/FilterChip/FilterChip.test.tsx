import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FilterChip, FilterToggleChip } from "@/components/FilterChip/FilterChip"

const classesOf = (element: HTMLElement) => element.className.split(/\s+/).filter(Boolean)

describe("FilterToggleChip", () => {
  // The on state is chipSelected behind data-[state=on]. jsdom can't run the Tailwind cascade, so
  // this checks the class names: what FilterChip adds when selected must all be there when on,
  // dark: ones included — without them chipDefault's dark:bg-background hid the text.
  it("when on, restates every class a selected FilterChip has, dark: included", () => {
    render(
      <>
        <FilterChip>Termín</FilterChip>
        <FilterChip isSelected>Dnes</FilterChip>
        <FilterToggleChip pressed>Příštích 7 dní</FilterToggleChip>
      </>,
    )
    const unselected = new Set(classesOf(screen.getByRole("button", { name: "Termín" })))
    const selectedOnly = classesOf(screen.getByRole("button", { name: "Dnes" })).filter(
      (c) => !unselected.has(c),
    )
    const toggle = screen.getByRole("button", { name: "Příštích 7 dní" })

    expect(toggle).toHaveAttribute("data-state", "on")
    expect(selectedOnly).toContain("dark:bg-foreground")
    const expected = selectedOnly.map((c) =>
      c.startsWith("dark:") ? `dark:data-[state=on]:${c.slice(5)}` : `data-[state=on]:${c}`,
    )
    expect(classesOf(toggle)).toEqual(expect.arrayContaining(expected))
  })

  it("drops the kit Toggle's own hover and on colours, which would hide the text", () => {
    render(<FilterToggleChip pressed>Příštích 7 dní</FilterToggleChip>)
    const classes = classesOf(screen.getByRole("button"))

    expect(classes).not.toContain("hover:text-muted-foreground")
    expect(classes).not.toContain("data-[state=on]:bg-accent")
    expect(classes).not.toContain("data-[state=on]:text-accent-foreground")
  })
})
