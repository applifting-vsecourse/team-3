import { useRef, useState } from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FilterPanel } from "@/components/FilterPanel/FilterPanel"
import { DESKTOP_QUERY, FINE_POINTER_QUERY } from "@/hooks/useMediaQuery"

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

/** A panel with a search field, like Lokalita and Typ aktivity. */
function SearchFilter() {
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  return (
    <FilterPanel
      title="Lokalita"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={<button type="button">Lokalita</button>}
      resetLabel="Zrušit výběr"
      onReset={vi.fn()}
      applyLabel="Zobrazit 3 akce"
      onApply={vi.fn()}
      initialFocusRef={searchRef}
    >
      {/* the field is focused even when something else comes first */}
      <button type="button">Nápověda</button>
      <label htmlFor="hledat">Hledat lokalitu</label>
      <input
        id="hledat"
        ref={searchRef}
      />
    </FilterPanel>
  )
}

const showOn = ({ isDesktop, hasFinePointer }: { isDesktop: boolean; hasFinePointer: boolean }) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches:
      query === DESKTOP_QUERY ? isDesktop : query === FINE_POINTER_QUERY ? hasFinePointer : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))

const openSearch = async () => {
  render(<SearchFilter />)
  await userEvent.click(screen.getByRole("button", { name: "Lokalita" }))
  return screen.findByRole("dialog", { name: "Lokalita" })
}

describe("FilterPanel › focus on opening", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("desktop: the search field has the focus, so typing goes there; Esc returns to the chip", async () => {
    showOn({ isDesktop: true, hasFinePointer: true })
    const panel = await openSearch()

    expect(within(panel).getByLabelText("Hledat lokalitu")).toHaveFocus()
    await userEvent.keyboard("Brno")
    expect(within(panel).getByLabelText("Hledat lokalitu")).toHaveValue("Brno")

    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("dialog", { name: "Lokalita" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Lokalita" })).toHaveFocus()
  })

  it("desktop: Tab goes from the field to the panel's buttons", async () => {
    showOn({ isDesktop: true, hasFinePointer: true })
    const panel = await openSearch()

    await userEvent.tab()
    expect(within(panel).getByRole("button", { name: "Zrušit výběr" })).toHaveFocus()
    await userEvent.tab()
    expect(within(panel).getByRole("button", { name: "Zobrazit 3 akce" })).toHaveFocus()
  })

  it("a narrow window with a mouse: the bottom panel focuses the field too", async () => {
    showOn({ isDesktop: false, hasFinePointer: true })
    const panel = await openSearch()

    expect(within(panel).getByLabelText("Hledat lokalitu")).toHaveFocus()
  })

  it("a phone: no keyboard pops up over the list, the focus starts in the panel at its title", async () => {
    showOn({ isDesktop: false, hasFinePointer: false })
    const panel = await openSearch()

    expect(within(panel).getByLabelText("Hledat lokalitu")).not.toHaveFocus()
    expect(within(panel).getByRole("heading", { name: "Lokalita" })).toHaveFocus()
    expect(panel).toContainElement(document.activeElement as HTMLElement)
  })
})
