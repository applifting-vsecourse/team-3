import { useState } from "react"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DESKTOP_QUERY } from "@/hooks/useMediaQuery"

import { ManagementTabs } from "./ManagementTabs"

/** A window whose width can cross the desktop breakpoint (768 px) mid-test (#316). */
function stubResizableWindow(isDesktop: boolean) {
  const listeners = new Set<() => void>()
  let isWide = isDesktop
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query === DESKTOP_QUERY && isWide
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }))
  return (isNowDesktop: boolean) => {
    isWide = isNowDesktop
    act(() => listeners.forEach((listener) => listener()))
  }
}

/** Stands in for an open dialog: state that a remount would lose. */
function Counter() {
  const [count, setCount] = useState(0)
  return (
    <button
      type="button"
      onClick={() => setCount((n) => n + 1)}
    >
      Kliknuto {count}×
    </button>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ManagementTabs (#371, #316)", () => {
  it("keeps every panel mounted, the inactive one hidden on a phone by CSS alone", () => {
    render(
      <ManagementTabs
        tabs={[
          { value: "requests", label: "Žádosti (2)", content: <p>Seznam žádostí</p> },
          { value: "participants", label: "Účastníci (4)", content: <p>Seznam účastníků</p> },
        ]}
      />,
    )

    expect(screen.getByText("Seznam žádostí")).toBeInTheDocument()
    const inactive = screen.getByText("Seznam účastníků").closest("[role=tabpanel]")
    expect(inactive).not.toHaveAttribute("hidden")
    expect(inactive).toHaveClass("data-[state=inactive]:max-md:hidden")
  })

  it("loses no state when the window crosses 768 px, both ways", async () => {
    const resize = stubResizableWindow(false)
    render(
      <ManagementTabs
        tabs={[
          { value: "requests", label: "Žádosti (1)", content: <Counter /> },
          { value: "participants", label: "Účastníci (0)", content: <p>Nikdo</p> },
        ]}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Kliknuto 0×" }))
    resize(true)
    expect(screen.getByRole("button", { name: "Kliknuto 1×" })).toBeInTheDocument()
    resize(false)
    expect(screen.getByRole("button", { name: "Kliknuto 1×" })).toBeInTheDocument()
  })

  it("on desktop no panel is a Tab stop of its own: there are no tabs to show", () => {
    stubResizableWindow(true)
    render(
      <ManagementTabs
        tabs={[
          { value: "requests", label: "Žádosti (0)", content: <p>Žádné žádosti</p> },
          { value: "participants", label: "Účastníci (0)", content: <p>Nikdo</p> },
        ]}
      />,
    )

    for (const panel of screen.getAllByRole("tabpanel", { hidden: true })) {
      expect(panel).toHaveAttribute("tabindex", "-1")
    }
  })
})
