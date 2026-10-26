import { useState } from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FilterPanel } from "@/components/FilterPanel/FilterPanel"

const showAs = (isDesktop: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: isDesktop,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))

/** A filter as long as „Typ aktivity“ since the whole catalog (#149). */
function LongFilter() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <FilterPanel
      title="Typ aktivity"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={<button type="button">Typ aktivity</button>}
      resetLabel="Zrušit výběr"
      onReset={vi.fn()}
      applyLabel="Zobrazit 12 akcí"
      onApply={vi.fn()}
    >
      <ul aria-label="Aktivity">
        {Array.from({ length: 60 }, (_, i) => (
          <li key={i}>Aktivita {i + 1}</li>
        ))}
      </ul>
    </FilterPanel>
  )
}

const open = async () => {
  render(<LongFilter />)
  await userEvent.click(screen.getByRole("button", { name: "Typ aktivity" }))
  return screen.findByRole("dialog", { name: "Typ aktivity" })
}

// jsdom has no layout, so these check the structure the browser needs (#157): the content sits
// in its own scrolling box and the two buttons outside it, so a long list can't push them away.
const expectButtonsUnderScrollingContent = (panel: HTMLElement) => {
  const content = within(panel).getByRole("list", { name: "Aktivity" })
  const body = content.closest(".overflow-y-auto")
  expect(body).not.toBeNull()
  // min-h-0 lets the box shrink below its content inside the flex column, so it scrolls
  expect(body).toHaveClass("min-h-0")
  for (const name of ["Zrušit výběr", "Zobrazit 12 akcí"]) {
    const button = within(panel).getByRole("button", { name })
    expect(body).not.toContainElement(button)
  }
}

describe("FilterPanel", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("desktop: the popover is at most the height left under the chip, its content scrolls", async () => {
    showAs(true)
    const panel = await open()

    expect(panel).toHaveClass("flex", "flex-col")
    const maxHeight = /\bmax-h-\((--[\w-]+)\)/.exec(panel.className)?.[1]
    // the variable must be one Radix really sets on this element, not a near miss
    expect(maxHeight).toBe("--radix-popover-content-available-height")
    expect(panel.style.getPropertyValue(maxHeight!)).toBe("var(--radix-popper-available-height)")
    expectButtonsUnderScrollingContent(panel)
  })

  it("mobile: the bottom panel keeps its buttons under the scrolling content too", async () => {
    showAs(false)
    const panel = await open()

    expect(panel).toHaveClass("flex", "flex-col")
    expectButtonsUnderScrollingContent(panel)
  })
})
